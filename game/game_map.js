class GameTileMap {
    constructor(game) {
        this.game = game
        // 8 * 5
        this.tiles = [
            1, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1, 0,
            1, 6, 5, 0, 1, 6, 5, 0, 0, 1, 6, 5, 0, 0, 1, 0,
            1, 8, 3, 0, 1, 8, 3, 1, 0, 1, 8, 3, 1, 0, 1, 1,
        ]
        this.th = 16
        this.tw = this.tiles.length / this.th // tw 是一个整数
        this. tileImages = [
            new GameImage(game, 't1'),
            new GameImage(game, 't2'),
            new GameImage(game, 't3'),
            new GameImage(game, 't4'),
            new GameImage(game, 't5'),
            new GameImage(game, 't6'),
            new GameImage(game, 't7'),
            new GameImage(game, 't8'),
            new GameImage(game, 't9'),
            new GameImage(game, 't10'),
            new GameImage(game, 't11'),
        ]
        this.tileSize = 32
    }

    static new(...args) {
        return new this(...args)
    }

    update(){}
    onTheGround(i, j) {
        let index = i * this.th + j
        let tile = this.tiles[index]
        if (tile === undefined) {
            return false
        }
        return tile !== 0
    }
    draw(){
        let h = this.th
        let w = this.tw
        for (let i = 0; i < this.tiles.length; i++) {
            let index = this.tiles[i]
            if (index !== 0) {
                let x = Math.floor(i / h) * this.tileSize
                let y = (i % h) * this.tileSize
                // index = index - 1
                let image = this.tileImages[index - 1]
                this.game.context.drawImage(image.texture, x, y, 32, 32)
            }
        }
    }

}