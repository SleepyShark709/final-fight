/**
 * 永久升级配置表
 * 定义所有可购买的永久升级项
 */

/** 升级效果类型 */
export type UpgradeEffectType =
    | 'max_health'       // 最大生命值
    | 'attack_damage'    // 基础攻击力
    | 'speed'            // 移动速度
    | 'revive'           // 复活次数
    | 'blessing_luck'    // 祝福品质提升
    | 'crit_chance'      // 暴击率
    | 'gold_bonus'       // 金币获取加成
    | 'dash_cooldown';   // 冲刺冷却减少

/** 单个升级项定义 */
export interface UpgradeData {
    /** 唯一标识 (与 SaveManager.upgrades key 对应) */
    id: string;
    /** 显示名称 */
    name: string;
    /** 描述模板 (用 {value} 占位) */
    description: string;
    /** 效果类型 */
    effectType: UpgradeEffectType;
    /** 每级增量 */
    valuePerLevel: number;
    /** 最大等级 */
    maxLevel: number;
    /** 每级费用数组 (长度 = maxLevel) */
    costs: number[];
    /** 图标颜色 (用于UI) */
    color: number;
}

/** 生成等差费用数组: [baseCost, baseCost*2, baseCost*3, ...] */
function linearCosts(baseCost: number, maxLevel: number): number[] {
    return Array.from({ length: maxLevel }, (_, i) => baseCost * (i + 1));
}

/** 所有升级项列表 */
export const UPGRADE_TABLE: UpgradeData[] = [
    {
        id: 'health_boost',
        name: '生命强化',
        description: '最大生命值 +{value}',
        effectType: 'max_health',
        valuePerLevel: 10,
        maxLevel: 10,
        costs: linearCosts(10, 10),
        color: 0xff4444,
    },
    {
        id: 'attack_boost',
        name: '力量恢复',
        description: '基础攻击力 +{value}',
        effectType: 'attack_damage',
        valuePerLevel: 2,
        maxLevel: 8,
        costs: linearCosts(10, 8),
        color: 0xff8844,
    },
    {
        id: 'speed_boost',
        name: '疾风记忆',
        description: '移动速度 +{value}',
        effectType: 'speed',
        valuePerLevel: 10,
        maxLevel: 5,
        costs: linearCosts(10, 5),
        color: 0x44ccff,
    },
    {
        id: 'revive',
        name: '死亡抗拒',
        description: '每次运行可复活 {value} 次',
        effectType: 'revive',
        valuePerLevel: 1,
        maxLevel: 3,
        costs: [100, 150, 250],
        color: 0xffdd44,
    },
    {
        id: 'blessing_luck',
        name: '祝福亲和',
        description: '稀有祝福概率 +{value}%',
        effectType: 'blessing_luck',
        valuePerLevel: 5,
        maxLevel: 5,
        costs: linearCosts(10, 5),
        color: 0xaa44ff,
    },
    {
        id: 'crit_boost',
        name: '暴击直觉',
        description: '暴击率 +{value}%',
        effectType: 'crit_chance',
        valuePerLevel: 3,
        maxLevel: 5,
        costs: linearCosts(10, 5),
        color: 0xff44aa,
    },
    {
        id: 'gold_boost',
        name: '贪婪本能',
        description: '金币获取 +{value}%',
        effectType: 'gold_bonus',
        valuePerLevel: 15,
        maxLevel: 5,
        costs: linearCosts(8, 5),
        color: 0xffcc00,
    },
    {
        id: 'dash_boost',
        name: '冲刺强化',
        description: '冲刺冷却 -{value}ms',
        effectType: 'dash_cooldown',
        valuePerLevel: 100,
        maxLevel: 3,
        costs: linearCosts(10, 3),
        color: 0x44ffaa,
    },
];

/** 通过 ID 查找升级数据 */
export function getUpgradeById(id: string): UpgradeData | undefined {
    return UPGRADE_TABLE.find((u) => u.id === id);
}
