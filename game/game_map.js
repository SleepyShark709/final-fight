class GameTileMap {
    constructor(game) {
        this.game = game
        // 8 * 5
        this.tiles = [
            1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,3,
            2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,2,2,3,0,0,0,
            0,0,0,0,0,0,0,0,0,5,6,6,7,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
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
    draw(){
        let h = this.th
        let w = this.tw
        for (let i = 0; i < this.tiles.length; i++) {
            let index = this.tiles[i]
            if (index !== 0) {
                let y = Math.floor(i / h) * this.tileSize
                let x = (i % h) * this.tileSize
                index = index - 1
                let image = this.tileImages[index]
                this.game.context.drawImage(image.texture, x, y, 32, 32)
            }
        }
    }

}