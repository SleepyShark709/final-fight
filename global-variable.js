const FPS = 40 // 帧率
const COOL_DOWN = 10 // 攻击的冷却时间，不能让用户按住攻击键不松手一直进行攻击
const ENEMY_COOL_DOWN = 100 // 敌人的攻击冷却时间
const GRAVITATIONAL_ACCELERATION = 5 // 重力加速度
const GRAVITATIONAL_ACCELERATION_PERCENT = 0.2 // 重力加速的比重
const RENDER_IMAGE_NUMBER = 3 // 渲染的图片数量

// 主角
const PLAYER_ATTACK_TYPE = 3 // 主角的攻击种类
const PLAYER_IDLE_IMAGE_NUMBER = 6 // 主角闲置状态的图片数量
const PLAYER_RUN_IMAGE_NUMBER = 6 // 主角奔跑状态的图片数量
const PLAYER_ATTACK_TYPE_1_OR_2_NUMBER = 6 // 主角攻击1和攻击2的图片数量
const PLAYER_ATTACK_TYPE_3_NUMBER = 4 // 主角攻击4的图片数量
const PLAYER_JUMP_IMAGE_NUMBER = 4 // 主角跳跃的图片数量
const JUMP_HEIGHT = 15 // 跳跃高度
const PLAYER_ATTACK_DAMAGE_VALUE = Math.random()*20 + 30 // 主角攻击的伤害值，随机30-50

// 敌人
const ENEMY_HP = 100 // 默认设置 100 血
const ENEMY_ATTACK_NUMBER = 8 // 敌人攻击的图片数量
const ENEMY_RUN_NUMBER = 5 // 敌人移动的图片数量
const ENEMY_IDLE_NUMBER = 4 // 敌人闲置的图片数量
const ENEMY_DIE_NUMBER = 4 // 敌人死亡的图片数量