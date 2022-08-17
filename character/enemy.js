class Enemy extends Character {
    constructor(game) {
        super(game);
        this.frames = [] // 要渲染的 frames 里面是图片
        this.idleFrame = []
        this.initFrames(game)
        this.texture = this.idleFrame[0] // 设置第一帧图片
        this.frameCount = 10
        this.w = this.texture.width // 图片宽
        this.h = this.texture.height // 图片高
    }
    initFrames(game) {
        for (let i = 0; i < 8; i++) {
            let name = `eidle${i}`
            let t = game.textureByName(name)
            for (let j = 0; j < 3; j++) {
                this.idleFrame.push(t)
            }
        }
    }
    update() {
        // 判断用户没有移动时，置为闲置状态
        this.frameCount--
        this.frames = this.idleFrame
        if (this.frameCount < 0) {
            // if (this.isAttack === true) {
            //     this.frames = this.idleFrame
            //     this.isAttack = false
            // }
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
        this.texture && context.drawImage(this.texture, 0, 0)
        context.restore()
    }
}