class GameImage {
    constructor(game, name, x, y, w, h) {
        this.game = game
        this.texture = game.textureByName(name)
        if (x === undefined) {
            x = 0
        }
        if (y === undefined) {
            y = 0
        }
        this.x = x
        this.y = y
        this.w = w || this.texture.width
        this.h = h || this.texture.height
    }
    static new(game, name) {
        var i = new this(game, name)
        return i
    }
    draw() {
        this.game.drawImage(this, this.w, this.h)
    }
    update() {

    }
}