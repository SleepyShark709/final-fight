class AttackValue {
    constructor(game, x, y) {
        this.game = game
        this.x = x // 伤害数值的 x
        this.y = y // 伤害数值的 y
        this.number = 0
        this.color = '#ffffff'
        this.text = ''
        this.isShow = false
    }
    setShow(show) {
        this.isShow = show
    }
    update(hurtNum) {
        if (this.number < hurtNum && this.isShow === true) {
            this.number += 3
            this.text = `-${this.number}`
        } else {
            this.number = hurtNum
            if (this.isShow === false) {
                this.number = 0
            } else {
                setTimeout(() => {
                    this.number = 0
                    this.isShow = false
                }, 300)
            }
        }
    }
    draw() {
        if (this.isShow) {
            this.game.context.font = "20px serif";
            this.game.context.fillStyle = this.color
            this.game.context.fillText(this.text, this.x, this.y)
        }
    }
}