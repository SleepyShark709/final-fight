class GameLabel {
    constructor(game, text, x, y, color) {
        this.game = game
        this.text = text
        this.x = x
        this.y = y
        this.color = color || '#000000'
    }
    static new(game, text) {
        return new this(game, text)
    }
    draw() {
        this.game.context.font = "20px serif";
        this.game.context.fillStyle = this.color
        this.game.context.fillText(this.text, this.x, this.y)
    }
    update() {
    }
}
