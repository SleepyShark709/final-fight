// 角色
class Character {
    constructor(game) {
        this.game = game
    }

    static new (game) {
        return new this(game)
    }

    delete(element) {
        this.game.deleteImage(element)
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