/**
 * 武器配置数据表
 * 所有武器的数值定义
 */

export interface WeaponStats {
    id: string;
    name: string;
    type: 'melee' | 'ranged';
    baseDamage: number;
    attackRange: number;
    attackCooldown: number;     // ms
    comboSteps: number;         // 连击段数
    comboMultipliers: number[]; // 每段伤害倍率
    knockbackForce: number;
    skillCooldown: number;      // 特殊技能CD (ms)
    skillDamage: number;
    skillRange: number;
    // 动画相关
    attackAnimFrames: number[];  // 每段攻击帧数
    attackAnimFPS: number;
}

export const WEAPON_TABLE: Record<string, WeaponStats> = {
    sword: {
        id: 'sword',
        name: '裂空剑',
        type: 'melee',
        baseDamage: 20,
        attackRange: 50,
        attackCooldown: 400,
        comboSteps: 3,
        comboMultipliers: [1.0, 1.2, 1.5],
        knockbackForce: 100,
        skillCooldown: 5000,
        skillDamage: 35,
        skillRange: 80,
        attackAnimFrames: [6, 6, 4],
        attackAnimFPS: 8,
    },
    fists: {
        id: 'fists',
        name: '雷霆拳',
        type: 'melee',
        baseDamage: 8,
        attackRange: 35,
        attackCooldown: 200,
        comboSteps: 5,
        comboMultipliers: [0.8, 0.8, 1.0, 1.0, 1.8],
        knockbackForce: 40,
        skillCooldown: 4000,
        skillDamage: 25,
        skillRange: 50,
        attackAnimFrames: [4, 4, 4, 4, 6],
        attackAnimFPS: 14,
    },
    bow: {
        id: 'bow',
        name: '追影弓',
        type: 'ranged',
        baseDamage: 30,
        attackRange: 280,
        attackCooldown: 800,
        comboSteps: 1,
        comboMultipliers: [1.0],
        knockbackForce: 20,
        skillCooldown: 6000,
        skillDamage: 15,
        skillRange: 200,
        attackAnimFrames: [8],
        attackAnimFPS: 10,
    },
};
