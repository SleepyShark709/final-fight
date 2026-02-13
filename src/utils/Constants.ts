/**
 * 游戏常量配置
 * 包含游戏全局设置、物理参数、控制键位等
 */

// ===== 游戏画面设置 =====
export const GAME_WIDTH = 960; // 游戏内部宽度（像素风适配）
export const GAME_HEIGHT = 540; // 游戏内部高度
export const SCALE_FACTOR = 2; // 缩放因子（显示为 1920x1080）

// ===== 图片素材尺寸 =====
export const SPRITE_WIDTH = 100; // 所有素材统一宽度
export const SPRITE_HEIGHT = 75; // 所有素材统一高度

// ===== 物理引擎设置 =====
export const GRAVITY = 800; // 重力加速度
export const TILE_SIZE = 32; // 地砖尺寸

// ===== 玩家属性 =====
export const PLAYER_CONFIG = {
    maxHealth: 100, // 最大生命值
    speed: 200, // 水平移动速度
    jumpForce: 550, // 跳跃力（增强）
    attackDamage: 20, // 攻击伤害
    attackRange: 50, // 攻击范围
    attackCooldown: 400, // 攻击冷却时间（毫秒）
    criticalChance: 0.15, // 暴击率（15%）
    criticalMultiplier: 2.0, // 暴击伤害倍率（2倍）
    invincibleDuration: 1000, // 受伤后无敌时间
    scale: 1.0, // 角色缩放
    knockbackForce: 150, // 击退力度（减半）
    // 冲刺配置
    dashSpeed: 500, // 冲刺速度
    dashDistance: 150, // 冲刺距离
    dashDuration: 200, // 冲刺持续时间（毫秒）
    dashCooldown: 1000, // 冲刺冷却时间（毫秒）
    // 基于100*75素材的碰撞体积和偏移量配置
    collisionWidth: 40, // 碰撞体积宽度
    collisionHeight: 60, // 碰撞体积高度（从脚到头）
    offsetX: 35, // X轴偏移（居中角色）
    offsetY: 15, // Y轴偏移（将脚部对齐到sprite底部）
};

// ===== 敌人属性 =====
export const ENEMY_CONFIG = {
    skeleton: {
        maxHealth: 50,
        speed: 80,
        attackDamage: 10,
        attackRange: 50, // 攻击范围，与碰撞框宽度一致
        attackCooldown: 2000, // 增加攻击冷却时间，降低难度
        detectRange: 200, // 检测玩家范围
        patrolRange: 100, // 巡逻范围
        scale: 1.0, // 角色缩放
        mass: 1.2, // 质量系数（影响击退距离，越大越难击退）
        knockbackForce: 100, // 基础击退力度（会被质量除以）
        // 基于100*75素材的碰撞体积和偏移量配置
        collisionWidth: 50, // 碰撞体积宽度
        collisionHeight: 60, // 碰撞体积高度
        offsetX: 35, // X轴偏移
        offsetY: 15, // Y轴偏移
    },
};

// ===== 控制键位 =====
export const CONTROLS = {
    LEFT: 'A',
    RIGHT: 'D',
    JUMP: 'K',
    ATTACK: 'J',
    SKILL: 'L',
    STATS: 'C', // 数值面板切换
    INVENTORY: 'I',
    PAUSE: 'ESC',
    DEBUG: 'P', // 调试模式切换
};

// ===== 动画帧率 =====
export const ANIMATION_FPS = {
    idle: 8,
    run: 10,
    jump: 8,
    attack: 12,
    hurt: 8,
    death: 8,
};

// ===== 动画帧数配置 =====
export const ANIMATION_FRAMES = {
    player: {
        idle: 6,
        run: 6,
        jump: 4,
        attack: 6, // 基础攻击帧数
    },
    enemy: {
        idle: 4,
        walk: 4,
        attack: 8,
    },
};

// ===== 玩家攻击类型配置 =====
export const PLAYER_ATTACK_TYPES = [
    { key: 'player-attack', prefix: '', frames: 6 }, // 基础攻击：0-5.png
    { key: 'player-attack-2', prefix: '2-', frames: 6 }, // 攻击类型2：2-0 到 2-5.png
    { key: 'player-attack-3', prefix: '3-', frames: 4 }, // 攻击类型3：3-0 到 3-3.png
];

// ===== 场景 Key =====
export const SCENES = {
    BOOT: 'BootScene',
    MENU: 'MenuScene',
    GAME: 'GameScene',
    UI: 'UIScene',
    GAME_OVER: 'GameOverScene',
    WIN: 'WinScene',
};

// ===== 资源 Key =====
export const ASSETS = {
    // 玩家精灵
    PLAYER_IDLE: 'player-idle',
    PLAYER_RUN: 'player-run',
    PLAYER_JUMP: 'player-jump',
    PLAYER_ATTACK: 'player-attack',

    // 敌人精灵
    ENEMY_SKELETON_IDLE: 'skeleton-idle',
    ENEMY_SKELETON_WALK: 'skeleton-walk',
    ENEMY_SKELETON_ATTACK: 'skeleton-attack',

    // 地形
    TILESET_GRASS: 'tileset-grass',
    ENV_TILE: 'env-tile', // 环境贴图
    SKY_BACKGROUND: 'sky-background', // 天空背景
    MOUNTAINS_BACKGROUND: 'mountains-background', // 远山背景
    TREES_BACKGROUND: 'trees-background', // 树林背景
};

// ===== 图层深度 =====
export const DEPTH = {
    BACKGROUND: 0,
    TILEMAP: 10,
    ENEMIES: 20,
    PLAYER: 30,
    EFFECTS: 40,
    UI: 100,
};
