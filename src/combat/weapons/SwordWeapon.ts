/**
 * SwordWeapon -- concrete weapon implementation (裂空剑)
 *
 * Extracts and encapsulates the combo-attack logic that was previously
 * inlined in Player.handleAttack().
 */
import Phaser from 'phaser';
import { WeaponBase } from '../WeaponBase';
import { WEAPON_TABLE } from '../../config/WeaponConfig';
import { PLAYER_ATTACK_TYPES } from '../../utils/Constants';

export class SwordWeapon extends WeaponBase {
    constructor(scene: Phaser.Scene, owner: Phaser.Physics.Arcade.Sprite) {
        super(scene, owner, WEAPON_TABLE.sword);
    }

    // ----------------------------------------------------------------
    // Normal attack (J key) -- 3-step combo
    // ----------------------------------------------------------------
    attack(): void {
        if (!this.canAttack) return;

        this.isAttacking = true;
        this.canAttack = false;
        this.hitEnemiesThisAttack.clear();
        this.canDealDamage = false;

        // --- Combo logic ---------------------------------------------------
        const currentTime = this.scene.time.now;

        if (currentTime - this.lastAttackTime < this.COMBO_WINDOW) {
            this.comboCount++;
            if (this.comboCount >= this.stats.comboSteps) {
                this.comboCount = 0; // wrap around
            }
        } else {
            this.comboCount = 0; // timeout -- restart from first hit
        }

        this.lastAttackTime = currentTime;

        // Pick animation key from the global PLAYER_ATTACK_TYPES table
        const attackType = PLAYER_ATTACK_TYPES[this.comboCount];
        const attackAnimKey = attackType.key;

        // Set damage multiplier from weapon config [1.0, 1.2, 1.5]
        this.damageMultiplier =
            this.stats.comboMultipliers[this.comboCount] ?? 1.0;

        // Play the chosen attack animation
        this.owner.play(attackAnimKey, true);

        // --- Animation-progress gate: allow damage at 40% -----------------
        const onAnimationUpdate = (
            animation: Phaser.Animations.Animation,
            frame: Phaser.Animations.AnimationFrame,
        ) => {
            if (animation.key === attackAnimKey) {
                const progress = frame.index / attackType.frames;
                if (progress >= 0.4 && !this.canDealDamage) {
                    this.canDealDamage = true;
                }
            }
        };

        this.currentAnimUpdateHandler = onAnimationUpdate;
        this.owner.on('animationupdate', onAnimationUpdate);

        // --- Animation complete: reset attack state ------------------------
        this.owner.once(
            'animationcomplete',
            (animation: Phaser.Animations.Animation) => {
                if (animation.key === attackAnimKey) {
                    this.owner.off('animationupdate', onAnimationUpdate);
                    this.currentAnimUpdateHandler = undefined;

                    // Short delay before resetting so the last frame lingers
                    this.scene.time.delayedCall(50, () => {
                        this.resetAttack();
                    });
                }
            },
        );

        // --- Attack cooldown -----------------------------------------------
        this.scene.time.delayedCall(this.stats.attackCooldown, () => {
            this.canAttack = true;
        });
    }

    // ----------------------------------------------------------------
    // Weapon skill (U key) -- 旋风斩 / Whirlwind Slash
    // ----------------------------------------------------------------
    skill(): void {
        if (!this.canUseSkill) return;

        this.canUseSkill = false;
        this.isAttacking = true;
        this.hitEnemiesThisAttack.clear();

        // Instant AOE -- deal damage immediately
        this.canDealDamage = true;

        // Damage multiplier = skillDamage / baseDamage so CombatSystem can
        // simply multiply baseDamage * damageMultiplier to get the right value.
        this.damageMultiplier = this.stats.skillDamage / this.stats.baseDamage;

        // Reuse the heavy-slash animation for now (player-attack-3)
        const skillAnimKey = PLAYER_ATTACK_TYPES[2].key; // 'player-attack-3'
        this.owner.play(skillAnimKey, true);

        // --- Animation complete: reset attack state ------------------------
        this.owner.once(
            'animationcomplete',
            (animation: Phaser.Animations.Animation) => {
                if (animation.key === skillAnimKey) {
                    this.resetAttack();
                }
            },
        );

        // --- Skill cooldown ------------------------------------------------
        this.scene.time.delayedCall(this.stats.skillCooldown, () => {
            this.canUseSkill = true;
        });
    }
}
