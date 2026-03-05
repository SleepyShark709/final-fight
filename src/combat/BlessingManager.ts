/**
 * 祝福管理器（装饰器模式）
 * 包装伤害计算，根据激活的祝福修改输出或附加状态效果
 */
import { BlessingData, BLESSING_TABLE, BlessingRarity } from '@/config/BlessingConfig';
import { StatusEffect, StatusEffectProcessor } from '@/combat/StatusEffects';
import { BLESSING } from '@/utils/Constants';

export class BlessingManager {
    /** 当前激活的祝福 */
    private activeBlessings: Map<string, BlessingData> = new Map();

    /** 添加祝福 */
    addBlessing(blessing: BlessingData): void {
        this.activeBlessings.set(blessing.id, blessing);
        console.log(`[BlessingManager] 添加祝福: ${blessing.name}`);
    }

    /** 移除祝福 */
    removeBlessing(blessingId: string): void {
        this.activeBlessings.delete(blessingId);
    }

    /** 清空所有祝福 */
    clearAll(): void {
        this.activeBlessings.clear();
    }

    /** 获取所有激活的祝福 */
    getActiveBlessings(): BlessingData[] {
        return Array.from(this.activeBlessings.values());
    }

    /** 获取祝福数量 */
    getBlessingCount(): number {
        return this.activeBlessings.size;
    }

    /** 是否拥有某个祝福 */
    hasBlessing(blessingId: string): boolean {
        return this.activeBlessings.has(blessingId);
    }

    /**
     * 应用攻击修饰器
     * 在伤害计算后调用，返回修改后的伤害和需要附加的状态效果
     */
    applyAttackModifiers(
        baseDamage: number,
        currentTime: number,
    ): { damage: number; effects: StatusEffect[] } {
        let damage = baseDamage;
        const effects: StatusEffect[] = [];

        for (const blessing of this.activeBlessings.values()) {
            for (const effect of blessing.effects) {
                switch (effect.type) {
                    case 'damage_multiply':
                        if (blessing.slot === 'attack' || blessing.slot === 'passive') {
                            damage = Math.round(damage * effect.value);
                        }
                        break;
                    case 'add_status_effect':
                        if (blessing.slot === 'attack' && effect.statusEffect) {
                            effects.push(
                                StatusEffectProcessor.create(
                                    effect.statusEffect,
                                    effect.statusDuration ?? 2000,
                                    effect.statusTickInterval ?? 1000,
                                    effect.statusValue ?? effect.value,
                                    blessing.id,
                                    currentTime,
                                ),
                            );
                        }
                        break;
                    case 'lifesteal':
                        // 生命偷取在调用方处理（需要访问 Player）
                        break;
                    default:
                        break;
                }
            }
        }

        return { damage, effects };
    }

    /**
     * 获取暴击加成
     * 返回额外暴击率和额外暴击倍率
     */
    getCritBonus(): { critChanceBonus: number; critMultiplierBonus: number } {
        let critChanceBonus = 0;
        let critMultiplierBonus = 0;

        for (const blessing of this.activeBlessings.values()) {
            for (const effect of blessing.effects) {
                if (effect.type === 'crit_bonus') {
                    if (blessing.id === 'thunder_skill') {
                        critChanceBonus += effect.value;
                    } else if (blessing.id === 'thunder_passive') {
                        critMultiplierBonus += effect.value;
                    }
                }
            }
        }

        return { critChanceBonus, critMultiplierBonus };
    }

    /**
     * 获取减伤百分比
     */
    getDamageReduction(): number {
        let reduction = 0;
        for (const blessing of this.activeBlessings.values()) {
            for (const effect of blessing.effects) {
                if (effect.type === 'damage_reduction') {
                    reduction += effect.value;
                }
            }
        }
        return Math.min(reduction, 0.8); // 最多减伤80%
    }

    /**
     * 获取生命偷取百分比
     */
    getLifestealPercent(): number {
        let lifesteal = 0;
        for (const blessing of this.activeBlessings.values()) {
            for (const effect of blessing.effects) {
                if (effect.type === 'lifesteal') {
                    lifesteal += effect.value;
                }
            }
        }
        return Math.min(lifesteal, 0.5); // 最多偷取50%
    }

    /**
     * 获取冲刺伤害
     */
    getDashDamage(): number {
        let dashDamage = 0;
        for (const blessing of this.activeBlessings.values()) {
            for (const effect of blessing.effects) {
                if (effect.type === 'dash_damage') {
                    dashDamage += effect.value;
                }
            }
        }
        return dashDamage;
    }

    /**
     * 获取速度加成百分比
     */
    getSpeedBonus(): number {
        let speedBonus = 0;
        for (const blessing of this.activeBlessings.values()) {
            for (const effect of blessing.effects) {
                if (effect.type === 'speed_bonus') {
                    speedBonus += effect.value;
                }
            }
        }
        return speedBonus;
    }

    // ===== 祝福选择池 =====

    /**
     * 从祝福池中随机选取N个可用祝福
     * 排除已持有的祝福，按稀有度权重随机
     */
    rollBlessings(count: number = BLESSING.CHOICES_PER_ROOM, luckBonus: number = 0): BlessingData[] {
        // 过滤掉已有的祝福
        const available = BLESSING_TABLE.filter(
            (b) => !this.activeBlessings.has(b.id),
        );

        if (available.length === 0) return [];
        if (available.length <= count) return [...available];

        // 按稀有度权重选择
        const rarityWeightMap: Record<BlessingRarity, number> = {
            common: Math.max(10, BLESSING.RARITY_WEIGHTS[0] - luckBonus * 2),
            rare: BLESSING.RARITY_WEIGHTS[1] + luckBonus,
            epic: BLESSING.RARITY_WEIGHTS[2] + luckBonus,
        };

        const selected: BlessingData[] = [];
        const pool = [...available];

        while (selected.length < count && pool.length > 0) {
            // 计算总权重
            const totalWeight = pool.reduce(
                (sum, b) => sum + rarityWeightMap[b.rarity],
                0,
            );

            // 加权随机
            let roll = Math.random() * totalWeight;
            let pickedIndex = 0;

            for (let i = 0; i < pool.length; i++) {
                roll -= rarityWeightMap[pool[i].rarity];
                if (roll <= 0) {
                    pickedIndex = i;
                    break;
                }
            }

            selected.push(pool[pickedIndex]);
            pool.splice(pickedIndex, 1);
        }

        return selected;
    }
}
