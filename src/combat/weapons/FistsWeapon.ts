/**
 * FistsWeapon -- concrete weapon implementation (雷霆拳)
 *
 * 5-step rapid combo with lower per-hit damage but higher attack speed.
 * Reuses the 3 existing player-attack animations, cycling back for
 * combo steps 3 and 4 (indices beyond the 3 anim keys).
 *
 * Skill: Lightning Combo (闪电连击) — rapidly plays 3 attack animations
 * back-to-back, each dealing skillDamage. Cannot be interrupted.
 */
import Phaser from 'phaser';
import { WeaponBase } from '../WeaponBase';
import { WEAPON_TABLE } from '../../config/WeaponConfig';
import { PLAYER_ATTACK_TYPES } from '../../utils/Constants';

export class FistsWeapon extends WeaponBase {
    /** Whether a skill sequence is currently playing (cannot be interrupted) */
    private isSkillActive: boolean = false;

    constructor(scene: Phaser.Scene, owner: Phaser.Physics.Arcade.Sprite) {
        super(scene, owner, WEAPON_TABLE.fists);
    }

    // ----------------------------------------------------------------
    // Normal attack (J key) -- 5-step combo
    // ----------------------------------------------------------------
    attack(): void {
        if (!this.canAttack || this.isSkillActive) return;

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

        // Cycle through the 3 existing animation keys for all 5 combo steps:
        // step 0 -> anim 0, step 1 -> anim 1, step 2 -> anim 2,
        // step 3 -> anim 0, step 4 -> anim 1
        const animIndex = this.comboCount % PLAYER_ATTACK_TYPES.length;
        const attackType = PLAYER_ATTACK_TYPES[animIndex];
        const attackAnimKey = attackType.key;

        // Set damage multiplier from weapon config [0.8, 0.8, 1.0, 1.0, 1.8]
        this.damageMultiplier =
            this.stats.comboMultipliers[this.comboCount] ?? 1.0;

        // Play the chosen attack animation at faster frameRate
        this.owner.play({ key: attackAnimKey, frameRate: this.stats.attackAnimFPS }, true);

        // --- Animation-progress gate: allow damage at 30% (earlier than sword) --
        const onAnimationUpdate = (
            animation: Phaser.Animations.Animation,
            frame: Phaser.Animations.AnimationFrame,
        ) => {
            if (animation.key === attackAnimKey) {
                const progress = frame.index / attackType.frames;
                if (progress >= 0.3 && !this.canDealDamage) {
                    this.canDealDamage = true;
                }
            }
        };

        this.owner.on('animationupdate', onAnimationUpdate);

        // --- Animation complete: reset attack state ------------------------
        this.owner.once(
            'animationcomplete',
            (animation: Phaser.Animations.Animation) => {
                if (animation.key === attackAnimKey) {
                    this.owner.off('animationupdate', onAnimationUpdate);

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
    // Weapon skill (U key) -- 闪电连击 / Lightning Combo
    // Rapidly plays 3 attack animations back-to-back automatically.
    // Each hit deals skillDamage. Cannot be interrupted during the sequence.
    // ----------------------------------------------------------------
    skill(): void {
        if (!this.canUseSkill || this.isSkillActive) return;

        this.canUseSkill = false;
        this.isSkillActive = true;
        this.isAttacking = true;

        // Damage multiplier = skillDamage / baseDamage so CombatSystem can
        // simply multiply baseDamage * damageMultiplier to get the right value.
        this.damageMultiplier = this.stats.skillDamage / this.stats.baseDamage;

        this.playSkillHit(0);
    }

    /**
     * Recursively plays the next hit in the Lightning Combo sequence.
     * @param hitIndex 0, 1, or 2
     */
    private playSkillHit(hitIndex: number): void {
        const TOTAL_HITS = 3;

        if (hitIndex >= TOTAL_HITS) {
            // Sequence complete -- reset
            this.isSkillActive = false;
            this.resetAttack();

            // --- Skill cooldown ------------------------------------------------
            this.scene.time.delayedCall(this.stats.skillCooldown, () => {
                this.canUseSkill = true;
            });
            return;
        }

        // Fresh hit state for each swing
        this.hitEnemiesThisAttack.clear();
        this.canDealDamage = true;
        this.isAttacking = true;

        // Maintain skill damage multiplier for every hit
        this.damageMultiplier = this.stats.skillDamage / this.stats.baseDamage;

        // Cycle through the 3 animation keys
        const animIndex = hitIndex % PLAYER_ATTACK_TYPES.length;
        const attackType = PLAYER_ATTACK_TYPES[animIndex];
        const skillAnimKey = attackType.key;

        // Play at the faster fist frameRate
        this.owner.play({ key: skillAnimKey, frameRate: this.stats.attackAnimFPS }, true);

        // --- Animation complete: chain next hit ----------------------------
        this.owner.once(
            'animationcomplete',
            (animation: Phaser.Animations.Animation) => {
                if (animation.key === skillAnimKey) {
                    this.playSkillHit(hitIndex + 1);
                }
            },
        );
    }

    /** Override interruptAttack -- skill sequence cannot be interrupted */
    override interruptAttack(): void {
        if (this.isSkillActive) return; // Cannot interrupt Lightning Combo
        super.interruptAttack();
    }
}
