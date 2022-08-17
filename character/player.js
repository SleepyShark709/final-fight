// 主角角色
class Player {
    constructor(game) {
        this.game = game
        this.frames = [] // 要渲染的 frames 里面是图片
        this.idleFrame = [] // 闲置时的 frame
        this.runFrames = [] // 奔跑时的 frame
        this.attack1Frames = [] // 攻击类型1的 frame
        this.attack2Frames = [] // 攻击类型2的 frame
        this.attack3Frames = [] // 攻击类型3的 frame
        this.initIdleFrame(game) // 给 idleFrame 赋值
        this.initRunFrame(game) // 给 runFrames 赋值
        this.initAttackFrame(game, 1) // 给 attack1Frames 赋值
        this.initAttackFrame(game, 2) // 给 attack2Frames 赋值
        this.initAttackFrame(game, 3) // 给 attack3Frames 赋值
        this.texture = this.idleFrame[0] // 设置第一帧图片
        this.frameCount = 10 // 设置 frame 的数量
        this.w = this.texture.width // 图片宽
        this.h = this.texture.height // 图片高
        this.flipX = false // 是否进行 X 轴翻转
        this.isMoving = false // 是否在进行移动
        this.movingDirection = 'right' // 移动的方向
        this.cooldown = 10 // 攻击的冷却时间，不能让用户按住攻击键不松手一直进行攻击
        this.isAttack = false // 是否在攻击
        this.attackType = 1 // 攻击类型，每次按下攻击会切换攻击类型，一共有3组，为攻击1、攻击2、攻击3
    }
    initIdleFrame(game) {
        // 创建闲置时的 frame 数组，里面存放的是图片信息
        for (let i = 0; i < 6; i++) {
            let name = `idle${i}`
            let t = game.textureByName(name)
            for (let j = 0; j < 3; j++) {
                this.idleFrame.push(t)
            }
        }
    }
    initRunFrame(game) {
        // 创建奔跑时的 frame 数组，里面存放的是图片信息
        for (let i = 0; i < 6; i++) {
            let name = `run${i}`
            let t = game.textureByName(name)
            for (let j = 0; j < 3; j++) {
                this.runFrames.push(t)
            }
        }
    }
    initAttackFrame(game, type) {
        let ATTACK_MAP = {
            1: this.attack1Frames,
            2: this.attack2Frames,
            3: this.attack3Frames
        }
        for (let i = 0; i < 6; i++) {
            let name = `attack${type}_${i}`
            let t = game.textureByName(name)
            for (let j = 0; j < 3; j++) {
                ATTACK_MAP[type].push(t)
            }
        }
    }
    static new (game) {
        return new this(game)
    }
    jump() {
        this.vy = -10
        this.rotation = -45
    }
    update () {
        if (this.cooldown > 0) {
            // 设置冷却时间
            this.cooldown--
        }
        // 如果当前没有移动，则更改 frame 为闲置状态
        if (this.isMoving === false && this.isAttack === false) {
            this.frames = this.idleFrame
        }
        // 判断用户没有移动时，置为闲置状态
        this.frameCount--
        if (this.frameCount < 0) {
            if (this.isAttack === true) {
                this.frames = this.idleFrame
                this.isAttack = false
            }
            this.frameCount = this.frames.length - 1
        }
        // 这里出现「this.frames[this.frameCount] === undefined」报错的问题是，在这一瞬间，调用了 move 函数修改了 this.frame，导致获取到的数组长度不一致了
        // 这里想到简单的 hack 办法是，将所有动作的帧数都保持一致
        if (this.frameCount > this.frames.length) {
            // 解决由于 frame 的长度和 frameCount 对应不上的问题，强制设置当前的 count 为最后一帧，解决画面闪动消失的问题
            this.frameCount = this.frames.length - 1
        }
        this.texture = this.frames[this.frameCount]
        // 设置当前为非移动状态
        // TODO 后续进行跳跃功能开发时要修改这里，因为跳跃也要设置状态
        this.isMoving = false
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
        if (this.texture === undefined) console.log('123')
        this.texture && context.drawImage(this.texture, 0, 0, 100, 74)
        context.restore()
    }
    attack() {
        let ATTACK_FRAMES_MAP = {
            1: this.attack1Frames,
            2: this.attack2Frames,
            3: this.attack3Frames,
        }
        if (this.cooldown === 0) {
            this.cooldown = 10 // 设置冷却为10帧
            if (this.attackType > 3) {
                this.attackType = 1
            }
            this.frames = ATTACK_FRAMES_MAP[this.attackType] // 设置奔跑的 frame
            this.frameCount = 20
            this.isAttack = true
            this.attackType += 1
            console.log('attack')
        }
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
        this.frames = this.runFrames // 设置奔跑的 frame
    }
}