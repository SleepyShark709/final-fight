/**
 * BowWeapon -- ranged projectile weapon (追影弓)
 *
 * Fires a single arrow on normal attack and an arrow rain spread on skill.
 * Projectile collision detection is handled externally by GameScene.
 */
import Phaser from 'phaser';
import { WeaponBase } from '../WeaponBase';
import { WEAPON_TABLE } from '../../config/WeaponConfig';
import { PLAYER_ATTACK_TYPES, ASSETS } from '../../utils/Constants';

export class BowWeapon extends WeaponBase {
    /** Active projectiles -- GameScene reads this for collision checks */
    public projectiles: Phaser.Physics.Arcade.Image[] = [];

    /** Projectile speed in px/s (same as attackRange in stats: 280) */
    private readonly PROJECTILE_SPEED = 280;

    /** Tint colour for player arrows (orange, to distinguish from enemy) */
    private readonly ARROW_TINT = 0xff8800;

    /** Auto-destroy timer for projectiles (ms) */
    private readonly PROJECTILE_LIFETIME = 3000;

    /** 最大飞行距离（像素） */
    private readonly MAX_FLIGHT_DISTANCE = 500;

    constructor(scene: Phaser.Scene, owner: Phaser.Physics.Arcade.Sprite) {
        super(scene, owner, WEAPON_TABLE.bow);
    }

    // ----------------------------------------------------------------
    // Normal attack (J key) -- single ranged shot
    // ----------------------------------------------------------------
    attack(): void {
        if (!this.canAttack) return;

        this.isAttacking = true;
        this.canAttack = false;
        this.hitEnemiesThisAttack.clear();
        this.canDealDamage = false;

        // Bow has only 1 combo step -- always reset to 0
        this.comboCount = 0;
        this.lastAttackTime = this.scene.time.now;
        this.damageMultiplier = this.stats.comboMultipliers[0] ?? 1.0;

        // Reuse 'player-attack' animation for v1.0
        const attackType = PLAYER_ATTACK_TYPES[0];
        const attackAnimKey = attackType.key;

        this.owner.play(attackAnimKey, true);

        // --- Animation-progress gate: spawn projectile at 40% --------
        let hasFired = false;

        const onAnimationUpdate = (
            animation: Phaser.Animations.Animation,
            frame: Phaser.Animations.AnimationFrame,
        ) => {
            if (animation.key === attackAnimKey) {
                const progress = frame.index / attackType.frames;
                if (progress >= 0.4 && !hasFired) {
                    hasFired = true;
                    this.canDealDamage = true;
                    this.fireProjectile();
                }
            }
        };

        this.owner.on('animationupdate', onAnimationUpdate);

        // --- Animation complete: reset attack state -------------------
        this.owner.once(
            'animationcomplete',
            (animation: Phaser.Animations.Animation) => {
                if (animation.key === attackAnimKey) {
                    this.owner.off('animationupdate', onAnimationUpdate);
                    this.scene.time.delayedCall(50, () => {
                        this.resetAttack();
                    });
                }
            },
        );

        // --- Attack cooldown ------------------------------------------
        this.scene.time.delayedCall(this.stats.attackCooldown, () => {
            this.canAttack = true;
        });
    }

    // ----------------------------------------------------------------
    // Weapon skill (U key) -- 箭雨 / Arrow Rain
    // Fire 5 arrows in a fan spread pattern
    // ----------------------------------------------------------------
    skill(): void {
        if (!this.canUseSkill) return;

        this.canUseSkill = false;
        this.isAttacking = true;
        this.hitEnemiesThisAttack.clear();
        this.canDealDamage = true;

        // Damage multiplier: skillDamage / baseDamage
        this.damageMultiplier = this.stats.skillDamage / this.stats.baseDamage;

        // Reuse the basic attack animation for now
        const skillAnimKey = PLAYER_ATTACK_TYPES[0].key; // 'player-attack'
        this.owner.play(skillAnimKey, true);

        // Spread angles in degrees: -30, -15, 0, +15, +30
        const spreadAngles = [-30, -15, 0, 15, 30];

        for (const angleDeg of spreadAngles) {
            this.fireProjectile(angleDeg);
        }

        // --- Animation complete: reset attack state -------------------
        this.owner.once(
            'animationcomplete',
            (animation: Phaser.Animations.Animation) => {
                if (animation.key === skillAnimKey) {
                    this.resetAttack();
                }
            },
        );

        // --- Skill cooldown -------------------------------------------
        this.scene.time.delayedCall(this.stats.skillCooldown, () => {
            this.canUseSkill = true;
        });
    }

    // ----------------------------------------------------------------
    // Projectile management
    // ----------------------------------------------------------------

    /**
     * Spawn a single projectile in the owner's facing direction.
     * @param angleDeg optional angle offset from horizontal (degrees)
     */
    private fireProjectile(angleDeg: number = 0): void {
        const direction = this.owner.flipX ? -1 : 1;

        const proj = this.scene.physics.add.image(
            this.owner.x + direction * 20,
            this.owner.y - 10,
            ASSETS.PROJECTILE,
        ) as Phaser.Physics.Arcade.Image;

        proj.setDepth(25);
        proj.setFlipX(direction < 0);
        proj.setTint(this.ARROW_TINT);

        // Convert angle to radians and compute velocity components
        const angleRad = Phaser.Math.DegToRad(angleDeg);
        const vx = Math.cos(angleRad) * this.PROJECTILE_SPEED * direction;
        const vy = Math.sin(angleRad) * this.PROJECTILE_SPEED;

        const body = proj.body as Phaser.Physics.Arcade.Body;
        body.setVelocity(vx, vy);
        body.setAllowGravity(false);

        // 记录出生点，用于计算飞行距离
        proj.setData('spawnX', proj.x);
        proj.setData('spawnY', proj.y);

        this.projectiles.push(proj);

        // 碰到平台时销毁
        const gameScene = this.scene as any;
        if (gameScene.platforms) {
            this.scene.physics.add.collider(proj, gameScene.platforms, () => {
                this.destroyProjectile(proj);
            });
        }

        // Auto-destroy after lifetime
        this.scene.time.delayedCall(this.PROJECTILE_LIFETIME, () => {
            this.destroyProjectile(proj);
        });
    }

    /**
     * Destroy a projectile and remove it from the tracked list.
     */
    public destroyProjectile(proj: Phaser.Physics.Arcade.Image): void {
        const idx = this.projectiles.indexOf(proj);
        if (idx !== -1) this.projectiles.splice(idx, 1);
        if (proj.active) proj.destroy();
    }

    /**
     * Per-frame cleanup -- call from GameScene.update() or Player.update().
     * Removes projectiles that have left the camera bounds.
     */
    public update(): void {
        const camera = this.scene.cameras.main;
        if (!camera) return;

        const bounds = {
            left: camera.scrollX - 100,
            right: camera.scrollX + camera.width + 100,
            top: camera.scrollY - 100,
            bottom: camera.scrollY + camera.height + 100,
        };

        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const proj = this.projectiles[i];
            if (!proj.active) {
                this.destroyProjectile(proj);
                continue;
            }

            // 超出最大飞行距离时销毁
            const spawnX = proj.getData('spawnX') as number;
            const spawnY = proj.getData('spawnY') as number;
            const dist = Phaser.Math.Distance.Between(spawnX, spawnY, proj.x, proj.y);
            if (dist > this.MAX_FLIGHT_DISTANCE) {
                this.destroyProjectile(proj);
                continue;
            }

            // 超出镜头范围时销毁
            if (
                proj.x < bounds.left ||
                proj.x > bounds.right ||
                proj.y < bounds.top ||
                proj.y > bounds.bottom
            ) {
                this.destroyProjectile(proj);
            }
        }
    }
}
