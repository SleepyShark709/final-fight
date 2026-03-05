/**
 * 状态效果系统
 * 支持灼烧(burn)、减速(slow)、连锁闪电(chain)三种效果
 * tick-based 设计，每个效果有独立的持续时间和触发间隔
 */

/** 状态效果类型 */
export type StatusEffectType = 'burn' | 'slow' | 'chain';

/** 状态效果数据 */
export interface StatusEffect {
    type: StatusEffectType;
    /** 剩余持续时间 (ms) */
    duration: number;
    /** 触发间隔 (ms) */
    tickInterval: number;
    /** 每次触发的效果值 (burn=伤害, slow=减速百分比0-1, chain=伤害) */
    value: number;
    /** 上次触发时间戳 */
    lastTick: number;
    /** 效果来源ID（用于防止重复叠加同一祝福的效果） */
    sourceId: string;
}

/** 状态效果视觉颜色映射 */
export const STATUS_EFFECT_COLORS: Record<StatusEffectType, number> = {
    burn: 0xff4400,
    slow: 0x33ccff,
    chain: 0xffdd33,
};

/**
 * 状态效果处理器
 * 用于在 Enemy.update() 中每帧处理活跃的状态效果
 */
export class StatusEffectProcessor {
    /**
     * 处理一帧的状态效果
     * @param effects 当前活跃的状态效果数组
     * @param time 当前时间戳 (ms)
     * @param delta 帧间隔 (ms)
     * @param onDamage 伤害回调 (damage: number) => void
     * @param onSlow 减速回调 (slowPercent: number) => void  — slowPercent 0-1
     * @param onChain 连锁回调 (damage: number, sourceX: number, sourceY: number) => void
     * @param sourceX 效果源的X坐标（用于连锁闪电扩散）
     * @param sourceY 效果源的Y坐标
     * @returns 过滤后仍然活跃的状态效果数组
     */
    static process(
        effects: StatusEffect[],
        time: number,
        delta: number,
        onDamage: (damage: number) => void,
        onSlow: (slowPercent: number) => void,
        onChain?: (damage: number, sourceX: number, sourceY: number) => void,
        sourceX: number = 0,
        sourceY: number = 0,
    ): StatusEffect[] {
        let maxSlowPercent = 0;

        const activeEffects = effects.filter((effect) => {
            // 扣除持续时间
            effect.duration -= delta;
            if (effect.duration <= 0) return false;

            // 检查是否到达触发间隔
            if (time - effect.lastTick >= effect.tickInterval) {
                effect.lastTick = time;

                switch (effect.type) {
                    case 'burn':
                        onDamage(effect.value);
                        break;
                    case 'slow':
                        // 减速效果取最大值，不叠加
                        if (effect.value > maxSlowPercent) {
                            maxSlowPercent = effect.value;
                        }
                        break;
                    case 'chain':
                        if (onChain) {
                            onChain(effect.value, sourceX, sourceY);
                        }
                        break;
                }
            } else if (effect.type === 'slow') {
                // 即使没到 tick 间隔，减速效果也要持续生效
                if (effect.value > maxSlowPercent) {
                    maxSlowPercent = effect.value;
                }
            }

            return true;
        });

        // 应用减速
        if (maxSlowPercent > 0) {
            onSlow(maxSlowPercent);
        }

        return activeEffects;
    }

    /** 创建一个新的状态效果实例 */
    static create(
        type: StatusEffectType,
        duration: number,
        tickInterval: number,
        value: number,
        sourceId: string,
        currentTime: number = 0,
    ): StatusEffect {
        return {
            type,
            duration,
            tickInterval,
            value,
            lastTick: currentTime,
            sourceId,
        };
    }

    /** 添加效果到数组，同源同类型则刷新而非叠加 */
    static addEffect(effects: StatusEffect[], newEffect: StatusEffect): StatusEffect[] {
        // 查找同源同类型的效果
        const existingIndex = effects.findIndex(
            (e) => e.sourceId === newEffect.sourceId && e.type === newEffect.type,
        );

        if (existingIndex >= 0) {
            // 刷新持续时间（取较大值）
            effects[existingIndex].duration = Math.max(
                effects[existingIndex].duration,
                newEffect.duration,
            );
            return effects;
        }

        // 新增
        effects.push(newEffect);
        return effects;
    }
}
