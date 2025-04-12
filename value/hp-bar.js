class HpBar {
    constructor(game, x, y) {
        this.game = game
        this.x = x // 血条的 x
        this.y = y // 血条的 y
        this.w = 50 // 血条的宽度
        this.h = 10 // 血条的高度
        this.percentage = 1 // 血条的百分比, 1 -> 100% 0.8 -> 80%
        this.speed = 0.05 // 血条消失的速度
        this.greenW = this.w // 绿色条长度
        this.redW = 0 // 红色条长度
        this.isRemove = false // 是否要画血条
        this.character = null // 关联的角色，用于获取地图偏移
    }

    // 设置关联的角色
    setCharacter(character) {
        this.character = character
    }

    remove() {
        this.isRemove = true
    }

    update(percentage) {
        if (this.percentage > percentage) {
            // 如果当前的百分比大于目标百分比就让当前百分比按速度减少
            this.percentage -= this.speed
        }
        this.greenW = this.w * this.percentage < 0 ? 0 : this.w * this.percentage // 当绿色条的宽度小于0的时候，让其为0
        this.redW = this.w - this.w * (this.percentage) > this.w ? this.w : this.w - this.w * (this.percentage) // 当红色条的宽度大于默认宽的时候，让其为默认宽
    }

    draw() {
        if (this.isRemove) {
            return
        }

        // 计算血条的屏幕坐标（考虑地图偏移）
        let screenX = this.x
        let screenY = this.y

        // 如果关联的角色有地图且地图有偏移功能
        if (this.character && this.character.map && this.character.map.worldToScreen) {
            const screenPos = this.character.map.worldToScreen(this.x, this.y)
            screenX = screenPos.x
            screenY = screenPos.y
        }

        // 画绿色血条
        this.game.context.fillStyle = "green"
        this.game.context.fillRect(screenX, screenY, this.greenW, 10)
        // 画红色血条
        this.game.context.fillStyle = 'red'
        this.game.context.fillRect(screenX + this.w * this.percentage < screenX ? screenX : screenX + this.w * this.percentage, screenY, this.redW, 10)
    }
}