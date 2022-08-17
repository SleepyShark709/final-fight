// 主角角色
class Player {
    constructor(game) {
        this.game = game
        this.frames = []
        this.runFrames = []
        this.initIdleFrame(game)
        this.initRunFrame(game)
        this.texture = this.frames[0]
        this.frameCount = 10
        this.w = this.texture.width
        this.h = this.texture.height
        this.flipX = false
    }
    initIdleFrame(game) {
        for (let i = 0; i < 4; i++) {
            let name = `idle${i}`
            let t = game.textureByName(name)
            for (let j = 0; j < 5; j++) {
                this.frames.push(t)
            }
        }
    }
    initRunFrame(game) {
        for (let i = 0; i < 6; i++) {
            let name = `run${i}`
            let t = game.textureByName(name)
            for (let j = 0; j < 5; j++) {
                this.runFrames.push(t)
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
        // 判断用户没有移动时，置为闲置状态
        this.frameCount--
        if (this.frameCount < 0) {
            this.frameCount = this.frames.length - 1
        }
        this.texture = this.frames[this.frameCount]
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
        context.drawImage(this.texture, 0, 0, 100, 74)
        context.restore()
    }
    move(x) {
        // 在移动的时候更换动作
        this.x += x
        this.flipX = x < 0;
        this.frames = this.runFrames
    }
}