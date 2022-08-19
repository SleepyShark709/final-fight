class Enemy extends Character {
    constructor(game) {
        super(game);
        this.frames = [] // 要渲染的 frames 里面是图片
        this.idleFrame = []
        this.dieFrame = [] // 死亡的 frame
        this.runFrames = [] // 奔跑时的 frame
        this.attack1Frames = [] // 攻击类型1的 frame
        this.initFrames(game)
        this.initDieFrames(game)
        this.initRunFrame(game)
        this.initAttackFrame(game) // 给 attack1Frames 赋值
        this.texture = this.idleFrame[0] // 设置第一帧图片
        this.frameCount = 0
        this.w = this.texture.width // 图片宽
        this.h = this.texture.height // 图片高
        this.defaultHp = ENEMY_HP // 默认设置 100 血
        this.HP = ENEMY_HP // 当前血量
        this.x = 584
        this.y = 364
        this.HPBar = new HpBar(game, this.x, this.y + 20)
        this.AttackBar = new AttackValue(game, this.x, this.y)
        this.damageValue = 0 // 受到的攻击伤害
        this.defaultLocation = 'right' // 默认朝向
        this.cooldown = ENEMY_COOL_DOWN
        this.isDead = false // 死亡状态
        this.isPlayer = false // 是否是玩家
    }
    initAttackFrame(game) {
        for (let i = 0; i < ENEMY_ATTACK_NUMBER; i++) {
            let name = `eattack${i}`
            let t = game.textureByName(name)
            for (let j = 0; j < RENDER_IMAGE_NUMBER; j++) {
                this.attack1Frames.push(t)
            }
        }
    }
    initRunFrame(game) {
        for (let i = 0; i < ENEMY_RUN_NUMBER; i++) {
            let name = `ewalk${i}`
            let t = game.textureByName(name)
            for (let j = 0; j < RENDER_IMAGE_NUMBER; j++) {
                this.runFrames.push(t)
            }
        }
    }
    initFrames(game) {
        for (let i = 0; i < ENEMY_IDLE_NUMBER; i++) {
            let name = `eidle${i}`
            let t = game.textureByName(name)
            for (let j = 0; j < RENDER_IMAGE_NUMBER; j++) {
                this.idleFrame.push(t)
            }
        }
    }
    initDieFrames(game) {
        for (let i = 0; i < ENEMY_DIE_NUMBER; i++) {
            let name = `edie${i}`
            let t = game.textureByName(name)
            for (let j = 0; j < RENDER_IMAGE_NUMBER; j++) {
                this.dieFrame.push(t)
            }
        }
    }
    update() {
        // TODO 设置一个敌人挥刀的间隔时间
        if (this.cooldown > 0) {
            // 设置冷却时间
            this.cooldown--
        }
        this.HPBar.update(this.HP / this.defaultHp)
        this.HPBar.x = this.movingDirection === this.defaultLocation ? this.x + this.w / 4 :this.x + this.w / 2 - 5 // 未翻身的情况下
        this.AttackBar.update(Number(this.damageValue))
        this.AttackBar.x = this.x + this.w / 2 + 6
        // 判断用户没有移动时，置为闲置状态
        if (this.isDead === false) {
            this.frameCount--
        }
        if (this.isDie === false && this.isMoving === false && this.isAttack === false) {
            this.frames = this.idleFrame
        }

        if (this.frameCount < 0 && this.isDie) {
            // 这里可以删除这个元素了
            this.frameCount = 0
            this.isDead = true
            this.HPBar.remove()
        } else if (this.frameCount < 0) {
            this.frameCount = this.frames.length - 1
        }
        if (!this.frames[this.frameCount]) {
            this.frameCount = this.frames.length - 1
        }
        this.texture = this.frames[this.frameCount]
    }
    draw () {
        super.draw()
        this.HPBar.draw()
        this.AttackBar.draw()
    }
    // 被攻击到的事件
    killEvent(damageValue) {
        // damageValue 是伤害值
        if (this.isDead === false) {
            this.HP -= damageValue // 掉血
            this.damageValue = damageValue
            this.AttackBar.setShow(true)
            if (this.HP < 0) {
                // 血条为 0 的时候，死亡
                this.isDie = true
                this.frames = this.dieFrame
                this.frameCount = this.frames.length - 1
            }
        }

    }
    attackEvent(){
        if (this.cooldown === 0 && this.isDie === false) {
            console.log('enemy attack')
            this.cooldown = ENEMY_COOL_DOWN // 设置冷却为10帧
            this.frames = this.attack1Frames // 设置攻击的 frame
            this.isAttack = true
        }
    }
}