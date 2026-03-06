/**
 * 敌人数据表
 * 所有敌人类型的配置统一管理
 * 从 Constants.ts ENEMY_CONFIG 迁移并扩展
 */

export interface EnemyTableEntry {
    id: string;
    name: string;
    /** 敌人类别: normal=普通 elite=精英 boss=Boss */
    tier: 'normal' | 'elite' | 'boss';
    // 基础属性
    maxHealth: number;
    speed: number;
    attackDamage: number;
    attackRange: number;
    attackCooldown: number;
    detectRange: number;
    patrolRange: number;
    scale: number;
    mass: number;
    knockbackForce: number;
    // 碰撞体积
    collisionWidth: number;
    collisionHeight: number;
    offsetX: number;
    offsetY: number;
    // 掉落
    goldDrop: [number, number];     // [最小, 最大]
    shardDrop: [number, number];    // [最小, 最大]
    // 特殊属性（可选）
    extra?: Record<string, number | string | boolean>;
}

export const ENEMY_TABLE: Record<string, EnemyTableEntry> = {
    // ===== 普通敌人 =====
    skeleton: {
        id: 'skeleton',
        name: '骷髅兵',
        tier: 'normal',
        maxHealth: 50,
        speed: 80,
        attackDamage: 10,
        attackRange: 50,
        attackCooldown: 2000,
        detectRange: 200,
        patrolRange: 100,
        scale: 1.0,
        mass: 1.2,
        knockbackForce: 100,
        collisionWidth: 50,
        collisionHeight: 60,
        offsetX: 35,
        offsetY: 15,
        goldDrop: [3, 8],
        shardDrop: [0, 1],
    },
    archer: {
        id: 'archer',
        name: '弓箭手',
        tier: 'normal',
        maxHealth: 30,
        speed: 60,
        attackDamage: 8,
        attackRange: 280,
        attackCooldown: 2500,
        detectRange: 350,
        patrolRange: 80,
        scale: 1.0,
        mass: 0.8,
        knockbackForce: 80,
        collisionWidth: 50,
        collisionHeight: 60,
        offsetX: 35,
        offsetY: 15,
        goldDrop: [4, 10],
        shardDrop: [0, 1],
        extra: {
            preferredDistance: 200,
            minDistance: 140,
            projectileSpeed: 280,
            projectileColor: 0x44aaff,
        },
    },
    shield: {
        id: 'shield',
        name: '盾兵',
        tier: 'normal',
        maxHealth: 80,
        speed: 60,
        attackDamage: 15,
        attackRange: 55,
        attackCooldown: 2200,
        detectRange: 200,
        patrolRange: 80,
        scale: 1.05,
        mass: 2.2,
        knockbackForce: 60,
        collisionWidth: 50,
        collisionHeight: 60,
        offsetX: 35,
        offsetY: 15,
        goldDrop: [5, 12],
        shardDrop: [1, 2],
        extra: {
            shieldDownDuration: 1800,
        },
    },
    flying: {
        id: 'flying',
        name: '飞虫',
        tier: 'normal',
        maxHealth: 25,
        speed: 100,
        attackDamage: 12,
        attackRange: 55,
        attackCooldown: 1500,
        detectRange: 260,
        patrolRange: 120,
        scale: 0.85,
        mass: 0.6,
        knockbackForce: 120,
        collisionWidth: 45,
        collisionHeight: 50,
        offsetX: 37,
        offsetY: 15,
        goldDrop: [2, 6],
        shardDrop: [0, 1],
        extra: {
            floatHeight: 110,
            swoopSpeed: 250,
        },
    },

    // ===== 新增石窟敌人 =====
    bomb_bug: {
        id: 'bomb_bug',
        name: '爆炸虫',
        tier: 'normal',
        maxHealth: 20,
        speed: 130,
        attackDamage: 30,
        attackRange: 40,
        attackCooldown: 0,      // 只自爆一次，无冷却
        detectRange: 180,
        patrolRange: 60,
        scale: 0.75,
        mass: 0.5,
        knockbackForce: 0,      // 自爆不击退自身
        collisionWidth: 40,
        collisionHeight: 40,
        offsetX: 30,
        offsetY: 20,
        goldDrop: [2, 5],
        shardDrop: [0, 1],
        extra: {
            fuseTime: 1200,         // 引信时间（ms），接近后闪烁多久爆炸
            explosionRadius: 80,    // 爆炸范围（像素）
        },
    },

    // ===== 熔岩区敌人 =====
    fire_bat: {
        id: 'fire_bat',
        name: '火蝠',
        tier: 'normal',
        maxHealth: 30,
        speed: 110,
        attackDamage: 10,
        attackRange: 60,
        attackCooldown: 1800,
        detectRange: 280,
        patrolRange: 130,
        scale: 0.8,
        mass: 0.5,
        knockbackForce: 130,
        collisionWidth: 45,
        collisionHeight: 50,
        offsetX: 37,
        offsetY: 15,
        goldDrop: [3, 7],
        shardDrop: [0, 1],
        extra: {
            floatHeight: 120,
            swoopSpeed: 270,
            fireballDamage: 8,
            fireballSpeed: 200,
            fireballCooldown: 3000,
        },
    },
    fire_mage: {
        id: 'fire_mage',
        name: '火法师',
        tier: 'normal',
        maxHealth: 35,
        speed: 50,
        attackDamage: 12,
        attackRange: 300,
        attackCooldown: 2800,
        detectRange: 350,
        patrolRange: 60,
        scale: 1.0,
        mass: 0.9,
        knockbackForce: 90,
        collisionWidth: 50,
        collisionHeight: 60,
        offsetX: 35,
        offsetY: 15,
        goldDrop: [5, 12],
        shardDrop: [1, 2],
        extra: {
            preferredDistance: 220,
            minDistance: 150,
            projectileSpeed: 200,
            projectileColor: 0xff4400,
            fireCircleRadius: 40,
            fireCircleDamage: 6,
            fireCircleDuration: 3000,
        },
    },
    lava_slime: {
        id: 'lava_slime',
        name: '熔岩史莱姆',
        tier: 'normal',
        maxHealth: 40,
        speed: 70,
        attackDamage: 8,
        attackRange: 40,
        attackCooldown: 1500,
        detectRange: 180,
        patrolRange: 80,
        scale: 0.8,
        mass: 1.0,
        knockbackForce: 100,
        collisionWidth: 45,
        collisionHeight: 45,
        offsetX: 27,
        offsetY: 20,
        goldDrop: [2, 5],
        shardDrop: [0, 1],
        extra: {
            splitOnDeath: true,
            splitCount: 2,
            splitHealthRatio: 0.4,
            splitScaleRatio: 0.6,
        },
    },

    // ===== 精英敌人 =====
    magma_knight: {
        id: 'magma_knight',
        name: '岩浆骑士',
        tier: 'elite',
        maxHealth: 180,
        speed: 70,
        attackDamage: 22,
        attackRange: 60,
        attackCooldown: 1800,
        detectRange: 260,
        patrolRange: 90,
        scale: 1.1,
        mass: 2.5,
        knockbackForce: 50,
        collisionWidth: 50,
        collisionHeight: 60,
        offsetX: 35,
        offsetY: 15,
        goldDrop: [18, 30],
        shardDrop: [4, 7],
        extra: {
            shieldDownDuration: 1500,
            chargeSpeed: 250,
            chargeDamage: 30,
            comboSteps: 3,
        },
    },
    lava_golem: {
        id: 'lava_golem',
        name: '熔岩魔像',
        tier: 'elite',
        maxHealth: 200,
        speed: 40,
        attackDamage: 30,
        attackRange: 80,
        attackCooldown: 2000,
        detectRange: 250,
        patrolRange: 80,
        scale: 0.7,        // 200*0.7=140px，比标准100px略大
        mass: 3.0,
        knockbackForce: 60,
        collisionWidth: 60,
        collisionHeight: 70,
        offsetX: 70,
        offsetY: 42,
        goldDrop: [20, 35],
        shardDrop: [5, 8],
    },
    elite_skeleton: {
        id: 'elite_skeleton',
        name: '精英骷髅剑士',
        tier: 'elite',
        maxHealth: 150,
        speed: 120,
        attackDamage: 18,
        attackRange: 55,
        attackCooldown: 1200,
        detectRange: 280,
        patrolRange: 100,
        scale: 1.15,
        mass: 1.8,
        knockbackForce: 80,
        collisionWidth: 50,
        collisionHeight: 60,
        offsetX: 35,
        offsetY: 15,
        goldDrop: [15, 25],
        shardDrop: [3, 5],
        extra: {
            comboSteps: 3,          // 3段连击
            dodgeChance: 0.25,      // 25%闪避率
            dodgeDistance: 80,       // 闪避距离
            dodgeCooldown: 3000,    // 闪避冷却
        },
    },

    // ===== Boss =====
    stone_golem: {
        id: 'stone_golem',
        name: '岩石巨像',
        tier: 'boss',
        maxHealth: 500,
        speed: 50,
        attackDamage: 25,
        attackRange: 70,
        attackCooldown: 2500,
        detectRange: 400,
        patrolRange: 60,
        scale: 1.8,
        mass: 5.0,
        knockbackForce: 30,
        collisionWidth: 60,
        collisionHeight: 70,
        offsetX: 20,
        offsetY: 5,
        goldDrop: [50, 80],
        shardDrop: [10, 15],
        extra: {
            /** Phase 1 → Phase 2 血量阈值 */
            phase2Threshold: 0.6,
            /** Phase 2 → Phase 3 血量阈值 */
            phase3Threshold: 0.3,
            /** 地震攻击伤害 */
            quakeDamage: 15,
            /** 地震攻击范围 */
            quakeRange: 200,
            /** 投掷岩石伤害 */
            rockDamage: 20,
            /** 投掷岩石速度 */
            rockSpeed: 300,
            /** 冲撞伤害 */
            chargeDamage: 35,
            /** 冲撞速度 */
            chargeSpeed: 300,
        },
    },
    fire_dragon: {
        id: 'fire_dragon',
        name: '烈焰龙',
        tier: 'boss',
        maxHealth: 800,
        speed: 60,
        attackDamage: 20,
        attackRange: 80,
        attackCooldown: 2200,
        detectRange: 500,
        patrolRange: 100,
        scale: 2.0,
        mass: 6.0,
        knockbackForce: 20,
        collisionWidth: 70,
        collisionHeight: 80,
        offsetX: 15,
        offsetY: 0,
        goldDrop: [60, 100],
        shardDrop: [12, 20],
        extra: {
            phase2Threshold: 0.6,
            phase3Threshold: 0.3,
            breathDamage: 15,
            breathRange: 180,
            diveDamage: 25,
            diveSpeed: 350,
            fireRainDamage: 10,
            fireRainInterval: 600,
            floatHeight: 140,
            summonCooldown: 8000,
        },
    },
};

/**
 * 按类型筛选敌人
 */
export function getEnemiesByTier(tier: 'normal' | 'elite' | 'boss'): EnemyTableEntry[] {
    return Object.values(ENEMY_TABLE).filter(e => e.tier === tier);
}

/**
 * 获取指定敌人配置
 */
export function getEnemyEntry(id: string): EnemyTableEntry | undefined {
    return ENEMY_TABLE[id];
}
