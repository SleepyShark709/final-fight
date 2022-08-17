// 角色
class Character {
    constructor(game) {
        this.game = game
        // this.frames = [] // 要渲染的 frames 里面是图片
        // this.idleFrame = [] // 闲置时的 frame
        // this.texture = this.idleFrame[0] // 设置第一帧图片
        // this.frameCount = 10 // 设置 frame 的数量
        // this.w = this.texture.width // 图片宽
        // this.h = this.texture.height // 图片高
        // this.flipX = false // 是否进行 X 轴翻转
        // this.isMoving = false // 是否在进行移动
        // this.movingDirection = 'right' // 移动的方向
        // this.cooldown = 10 // 攻击的冷却时间，不能让用户按住攻击键不松手一直进行攻击
        // this.isAttack = false // 是否在攻击
        // this.attackType = 1 // 攻击类型，每次按下攻击会切换攻击类型，一共有3组，为攻击1、攻击2、攻击3
        // this.gy = 10 // 重力加速度
        // this.vy = 0 // y轴的速度
        // this.isJump = false // 是否在跳跃
    }

    static new (game) {
        return new this(game)
    }

    update() {

    }
    draw () {
        let context = this.game.context
        context.save()
        let w2 = this.w / 2
        let h2 = this.h / 2
        context.translate(this.x + w2, this.y + h2)
        if (this.flipX) {
            context.scale(-1, 1)
        }
        context.translate(-w2,  -h2)
        this.texture && context.drawImage(this.texture, 0, 0, 100, 74)
        context.restore()
    }

    move(x) {
        // 在移动的时候更换动作
        this.isMoving = true
        if (x < 0 && this.movingDirection === 'right') {
            // 当前向左移动，且上次移动方向是右
            // 那么要将人物向右移动他的宽度
            this.x += this.w
        } else if (x > 0 && this.movingDirection === 'left') {
            // 当前向右移动，且上次移动方向是左
            this.x -= this.w
        }
        this.movingDirection = x < 0 ? 'left' : 'right' // 重新设置新的移动方向
        this.x += x // 设置当前人物的 x 轴坐标
        this.flipX = x < 0; // 设置反转
        if (this.isJump === false) {
            this.frames = this.runFrames // 设置奔跑的 frame
        }

    }
}