// 小鸟
class GameAnimation {
    constructor(game) {
        this.game = game
        this.frames = []
        for (let i = 1; i < 3; i++) {
            let name = `b${i}`
            let t = game.textureByName(name)
            this.frames.push(t)
        }
        this.texture = this.frames[0]
        this.frameIndex = 0
        this.frameCount = 1
        this.w = this.texture.width
        this.h = this.texture.height
        // 重力和加速度
        this.gy = 10
        this.vy = 0
        //
        this.flipX = false
        this.rotation = 0
    }
    static new (game) {
        return new this(game)
    }
    jump() {
        this.vy = -10
        this.rotation = -45
    }
    update () {
        // 更新受力
        this.y += this.vy
        this.vy += this.gy * 0.2
        let h = 410
        if (this.y > h) {
            this.y = h
        }
        if (this.x < 0) {
            this.x = 0
        }
        if (this.x > 288 - this.w) {
            this.x = 288 - this.w
        }
        // 更新角度
        if (this.rotation< 45) {
            this.rotation += 5
        }
        this.frameCount--
        if (this.frameCount === 0) {
            this.frameCount = 3
            this.frameIndex = (this.frameIndex + 1) % this.frames.length
            this.texture = this.frames[this.frameIndex]
        }
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
        context.rotate(this.rotation * Math.PI / 180)
        context.translate(-w2,  -h2)
        context.drawImage(this.texture, 0, 0)
        context.restore()
    }
    move(x) {
        this.x += x
    }

    pengzhuang(player) {
        if ((reactIntersects(this, player) || reactIntersects(player, this))) {
            console.log('在 animation 的类中 碰撞被执行了')
            // 玩家与敌人碰撞后进入结束画面
            var s = new SceneEnd(this.game)
            this.game.replaceScene(s)
        }
    }
}