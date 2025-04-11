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
        this.tiles = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 11, 11, 2, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 11, 11, 2, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 11, 11, 2, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 11, 11, 2, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 11, 2, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 8, 2, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 0, 0, 0, 2, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 6, 0, 0, 0, 2, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 6, 0, 0, 0, 2, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 11, 5, 0, 0, 2, 11, 0, 0, 0, 0, 0, 0, 0, 1, 4, 11, 11, 6, 0, 0, 2, 11, 0, 0, 0, 0, 0, 0, 0, 2, 11, 11, 11, 6, 0, 0, 2, 11, 0, 0, 0, 0, 0, 0, 0, 3, 11, 11, 8, 7, 0, 0, 2, 11, 0, 0, 0, 0, 0, 0, 0, 0, 2, 6, 0, 0, 0, 0, 2, 11, 0, 0, 0, 0, 0, 0, 0, 0, 2, 6, 0, 0, 0, 0, 2, 11, 0, 0, 0, 0, 0, 0, 0, 0, 3, 8, 0, 0, 0, 0, 2, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 11, 0, 0, 0, 0, 1, 5, 0, 0, 0, 0, 0, 0, 0, 0, 2, 11, 0, 0, 0, 0, 2, 6, 0, 0, 0, 0, 0, 0, 0, 0, 2, 11, 0, 0, 0, 0, 3, 7, 0, 0, 0, 0, 0, 0, 0, 0, 2, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 11]
        this.th = 16
        this.tw = this.tiles.length / this.th // tw 是一个整数
        this.tileImages = [
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

    update() {
        this.offsetX -= 1
    }

    // 检查某个位置是否有砖块
    onTheGround(i, j) {
        let index = i * this.th + j
        let tile = this.tiles[index]
        if (tile === undefined) {
            return false
        }
        return tile !== 0
    }

    // 新增：判断某个位置是墙壁还是地面
    // 墙壁通常是垂直方向的砖块，地面是水平方向的砖块
    isTileWall(i, j) {
        // 检查上下位置是否都是空白，如果是则认为是墙壁
        let tile = this.getTile(i, j);
        if (tile === 0) {
            return false; // 不是砖块
        }

        // 检查下方位置是否为空，如果下方为空则不是墙壁
        let belowTile = this.getTile(i, j + 1);

        // 检查左右位置的砖块情况
        let leftTile = this.getTile(i - 1, j);
        let rightTile = this.getTile(i + 1, j);

        // 如果左右任一侧有砖块，则更可能是墙壁
        let horizontalBlock = (leftTile !== 0 && leftTile !== undefined) ||
            (rightTile !== 0 && rightTile !== undefined);

        // 新的墙壁判断逻辑：
        // 1. 当前位置有砖块
        // 2. 左右方向有连续砖块
        return horizontalBlock;
    }

    // 获取指定位置的瓦片类型
    getTile(i, j) {
        let index = i * this.th + j;
        if (index < 0 || index >= this.tiles.length) {
            return undefined;
        }
        return this.tiles[index];
    }

    draw() {
        let h = this.th
        // 限制超出屏幕的东西不要画
        let offsetIndex = Math.abs(parseInt(this.offsetX / this.tileSize))
        let numberOfTiles = h * (12 + 1)

        if (offsetIndex + numberOfTiles < this.tiles.length) {
            numberOfTiles = this.tiles.length
        }

        for (let i = 0; i < numberOfTiles; i++) {
            let index = this.tiles[i]
            if (index !== 0) {
                let x = Math.floor(i / h) * this.tileSize
                let y = (i % h) * this.tileSize

                // 绘制瓦片图像
                let image = this.tileImages[index - 1]
                this.game.context.drawImage(image.texture, x, y, this.tileSize, this.tileSize)
            }
        }
    }

}