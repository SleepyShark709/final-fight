/**
 * 祝福配置数据表
 * 定义 12 个祝福，分属 3 位神明 (fire/thunder/ice)
 * 每个祝福属于一个槽位 (attack/skill/dash/passive)
 */
import { StatusEffectType } from '@/combat/StatusEffects';

/** 神明类型 */
export type GodType = 'fire' | 'thunder' | 'ice';

/** 祝福稀有度 */
export type BlessingRarity = 'common' | 'rare' | 'epic';

/** 祝福绑定槽位 */
export type BlessingSlot = 'attack' | 'skill' | 'dash' | 'passive';

/** 祝福效果类型 */
export type BlessingEffectType =
    | 'damage_multiply'      // 伤害倍率
    | 'add_status_effect'    // 附加状态效果
    | 'lifesteal'            // 生命偷取
    | 'crit_bonus'           // 暴击加成
    | 'area_damage'          // 范围伤害
    | 'dash_damage'          // 冲刺伤害
    | 'speed_bonus'          // 速度加成
    | 'damage_reduction';    // 减伤

/** 祝福效果定义 */
export interface BlessingEffect {
    type: BlessingEffectType;
    /** 效果数值 (倍率、百分比、或固定值，根据 type 决定语义) */
    value: number;
    /** 附加的状态效果类型（仅 add_status_effect 使用） */
    statusEffect?: StatusEffectType;
    /** 状态效果持续时间 ms（仅 add_status_effect 使用） */
    statusDuration?: number;
    /** 状态效果触发间隔 ms（仅 add_status_effect 使用） */
    statusTickInterval?: number;
    /** 状态效果每tick值（仅 add_status_effect 使用, 不填则用 value） */
    statusValue?: number;
}

/** 祝福数据定义 */
export interface BlessingData {
    id: string;
    name: string;
    description: string;
    god: GodType;
    rarity: BlessingRarity;
    slot: BlessingSlot;
    effects: BlessingEffect[];
    /** 图标颜色（用于 UI 展示） */
    iconColor: number;
}

/**
 * 祝福数据表
 * 12 个祝福: 每位神明 4 个 (attack/skill/dash/passive 各1)
 */
export const BLESSING_TABLE: BlessingData[] = [
    // ===== 火神 (Fire) =====
    {
        id: 'fire_attack',
        name: '烈焰之击',
        description: '攻击附加灼烧效果，每秒造成5点伤害，持续3秒',
        god: 'fire',
        rarity: 'common',
        slot: 'attack',
        effects: [{
            type: 'add_status_effect',
            value: 5,
            statusEffect: 'burn',
            statusDuration: 3000,
            statusTickInterval: 1000,
            statusValue: 5,
        }],
        iconColor: 0xff6633,
    },
    {
        id: 'fire_skill',
        name: '焚天怒焰',
        description: '武器技能伤害提升40%',
        god: 'fire',
        rarity: 'rare',
        slot: 'skill',
        effects: [{ type: 'damage_multiply', value: 1.4 }],
        iconColor: 0xff4400,
    },
    {
        id: 'fire_dash',
        name: '炎爆冲刺',
        description: '冲刺时对路径上的敌人造成15点火焰伤害',
        god: 'fire',
        rarity: 'rare',
        slot: 'dash',
        effects: [{ type: 'dash_damage', value: 15 }],
        iconColor: 0xff5500,
    },
    {
        id: 'fire_passive',
        name: '灼热之躯',
        description: '攻击力永久提升15%',
        god: 'fire',
        rarity: 'epic',
        slot: 'passive',
        effects: [{ type: 'damage_multiply', value: 1.15 }],
        iconColor: 0xff2200,
    },

    // ===== 雷神 (Thunder) =====
    {
        id: 'thunder_attack',
        name: '雷霆一击',
        description: '攻击有30%几率触发连锁闪电，对附近敌人造成8点伤害',
        god: 'thunder',
        rarity: 'common',
        slot: 'attack',
        effects: [{
            type: 'add_status_effect',
            value: 8,
            statusEffect: 'chain',
            statusDuration: 500,
            statusTickInterval: 500,
            statusValue: 8,
        }],
        iconColor: 0xffdd33,
    },
    {
        id: 'thunder_skill',
        name: '闪电风暴',
        description: '暴击率提升15%',
        god: 'thunder',
        rarity: 'rare',
        slot: 'skill',
        effects: [{ type: 'crit_bonus', value: 0.15 }],
        iconColor: 0xffcc00,
    },
    {
        id: 'thunder_dash',
        name: '雷光疾步',
        description: '冲刺后3秒内移动速度提升30%',
        god: 'thunder',
        rarity: 'common',
        slot: 'dash',
        effects: [{ type: 'speed_bonus', value: 0.3 }],
        iconColor: 0xeecc33,
    },
    {
        id: 'thunder_passive',
        name: '感电体质',
        description: '暴击伤害倍率+0.5x',
        god: 'thunder',
        rarity: 'epic',
        slot: 'passive',
        effects: [{ type: 'crit_bonus', value: 0.5 }],
        iconColor: 0xffee00,
    },

    // ===== 冰神 (Ice) =====
    {
        id: 'ice_attack',
        name: '霜冻之触',
        description: '攻击附加减速效果，降低敌人40%移动速度，持续2秒',
        god: 'ice',
        rarity: 'common',
        slot: 'attack',
        effects: [{
            type: 'add_status_effect',
            value: 0.4,
            statusEffect: 'slow',
            statusDuration: 2000,
            statusTickInterval: 100,
            statusValue: 0.4,
        }],
        iconColor: 0x33ccff,
    },
    {
        id: 'ice_skill',
        name: '冰晶护盾',
        description: '受到的伤害降低20%',
        god: 'ice',
        rarity: 'rare',
        slot: 'skill',
        effects: [{ type: 'damage_reduction', value: 0.2 }],
        iconColor: 0x2299dd,
    },
    {
        id: 'ice_dash',
        name: '寒冰之路',
        description: '冲刺时对路径上的敌人施加减速，降低50%移动速度，持续3秒',
        god: 'ice',
        rarity: 'rare',
        slot: 'dash',
        effects: [{
            type: 'add_status_effect',
            value: 0.5,
            statusEffect: 'slow',
            statusDuration: 3000,
            statusTickInterval: 100,
            statusValue: 0.5,
        }],
        iconColor: 0x1188cc,
    },
    {
        id: 'ice_passive',
        name: '生命汲取',
        description: '每次攻击回复造成伤害的10%生命值',
        god: 'ice',
        rarity: 'epic',
        slot: 'passive',
        effects: [{ type: 'lifesteal', value: 0.1 }],
        iconColor: 0x00aaff,
    },
];
