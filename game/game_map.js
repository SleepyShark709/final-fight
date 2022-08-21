class GameTileMap {
    constructor(game) {
        this.game = game
        // 8 * 5
        this.tiles = [
            1, 2, 0, 0, 1,
            1, 2, 3, 1, 1,
            1, 3, 3, 4, 1,
        ]
        this.th = 5
        this.tw = this.tiles.length / this.th // tw 是一个整数
        this. tileImages = [
            new GameImage(game, 't1'),
            new GameImage(game, 't2'),
            new GameImage(game, 't3'),
            new GameImage(game, 't4'),

        ]
        this.tileSize = 32
    }

    static new(...args) {
        return new this(...args)
    }

    update(){}
    draw(){
        let h = this.th
        for (let i = 0; i < this.tiles.length; i++) {
            let index = this.tiles[i]
            if (index !== 0) {
                let y = Math.floor(i / h) * this.tileSize
                let x = (i % h) * this.tileSize
                console.log(index)
                index = index - 1
                let image = this.tileImages[index]
                console.log(image)
                this.game.context.drawImage(image.texture, x, y, 32, 32)
            }
        }
    }

}