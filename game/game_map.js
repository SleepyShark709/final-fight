class GameTileMap {
    constructor(game) {
        this.game = game
        /*
        * 实现地图滚轴的思路，给地图增加一个 offset，然后在 update 的时候修改 offset，draw 的时候根据这个 offset 画页面
        * 那 offset 修改了，角色判断地图砖块的逻辑也要修改，然后要根据角色的移动去移动这个 offset
        * */


        this.offsetX = 10

        /*
        * 这个地图样例是
        * 第一排为第一列从上至下
        * 第二排为第二列从上至下
        * */
        this.tiles = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4,5,0,0,0,0,0,0,0,0,0,0,0,0,0,0,11,6,0,0,0,0,0,0,0,0,0,0,0,0,0,0,8,7,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
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

    update(){
        this.offsetX -= 1
    }
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
        // 限制超出屏幕的东西不要画
        let offsetIndex = Math.abs(parseInt(this.offsetX / this.tileSize))
        let numberOfTiles = h * ( 12 + 1 )
        // let maxIndex = offsetIndex + numberOfTiles
        // if(maxIndex > this.tiles.length){
        //     offsetIndex = 0
        // }
        if (offsetIndex + numberOfTiles < this.tiles.length) {
            numberOfTiles = this.tiles.length
        }
        for (let i = 0; i < numberOfTiles; i++) {
            let index = this.tiles[i]
            if (index !== 0) {
                let x = Math.floor(i / h) * this.tileSize
                // x += this.offsetX
                let y = (i % h) * this.tileSize
                // index = index - 1
                let image = this.tileImages[index - 1]
                this.game.context.drawImage(image.texture, x, y, 32, 32)
            }
        }
    }

}