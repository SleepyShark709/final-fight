/**
 * 武器基类 — 策略模式
 * 每种武器实现不同的攻击行为，注入到 Player 中
 */
import Phaser from 'phaser';
import { WeaponStats } from '../config/WeaponConfig';

export abstract class WeaponBase {
    protected scene: Phaser.Scene;
    protected owner: Phaser.Physics.Arcade.Sprite;
    protected stats: WeaponStats;

    // 攻击状态
    public isAttacking: boolean = false;
    public canDealDamage: boolean = false;
    public comboCount: number = 0;
    public damageMultiplier: number = 1.0;
    public hitEnemiesThisAttack: Set<Phaser.Physics.Arcade.Sprite> = new Set();

    // 冷却
    protected canAttack: boolean = true;
    protected canUseSkill: boolean = true;
    protected lastAttackTime: number = 0;
    protected readonly COMBO_WINDOW: number = 1000;

    constructor(scene: Phaser.Scene, owner: Phaser.Physics.Arcade.Sprite, stats: WeaponStats) {
        this.scene = scene;
        this.owner = owner;
        this.stats = stats;
    }

    /** 普通攻击(J键) — 子类实现 */
    abstract attack(): void;

    /** 特殊技能(U键) — 子类实现 */
    abstract skill(): void;

    /** 获取当前攻击伤害(含连击加成) */
    getCurrentDamage(): number {
        return Math.round(this.stats.baseDamage * this.damageMultiplier);
    }

    /** 获取攻击范围 */
    getAttackRange(): number {
        return this.stats.attackRange;
    }

    /** 获取击退力度 */
    getKnockbackForce(): number {
        return this.stats.knockbackForce;
    }

    /** 重置攻击状态 */
    resetAttack(): void {
        this.isAttacking = false;
        this.canDealDamage = false;
        this.hitEnemiesThisAttack.clear();
    }

    /** 中断攻击（冲刺时调用） */
    interruptAttack(): void {
        this.resetAttack();
    }

    /** 技能是否就绪 */
    isSkillReady(): boolean {
        return this.canUseSkill;
    }

    getStats(): Readonly<WeaponStats> {
        return this.stats;
    }
}
