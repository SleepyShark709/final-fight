class GameTileMap {
    constructor(game) {
        this.game = game
        /*
         * 实现地图滚轴的思路，给地图增加一个 offset，然后在 update 的时候修改 offset，draw 的时候根据这个 offset 画页面
         * 那 offset 修改了，角色判断地图砖块的逻辑也要修改，然后要根据角色的移动去移动这个 offset
         * */

        // 摄像机系统
        this.cameraX = 0 // 摄像机X位置
        this.cameraWidth = game.canvasWidth // 摄像机宽度
        this.cameraHeight = game.canvasHeight // 摄像机高度
        this.followPlayer = true // 是否跟随玩家
        this.followOffsetX = 200 // 摄像机跟随玩家的水平偏移量（使玩家位于屏幕中心偏左位置）
        this.player = null // 引用玩家对象，用于摄像机跟随
        this.mapWidth = 0 // 地图总宽度，将在初始化后计算
        this.isBlocked = false // 玩家是否被阻挡不能移动
        this.reachedRightBoundary = false // 是否到达右边界
        this.reachedLeftBoundary = false // 是否到达左边界

        this.offsetX = 0 // 初始偏移为0

        /*
         * 这个地图样例是
         * 第一排为第一列从上至下
         * 第二排为第二列从上至下
         * */
        // 原始地图数据
        const originalMapData = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 11, 11, 2, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 11, 11, 2, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 11, 11, 2, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 11, 11, 2, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 11, 2, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 8, 2, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 0, 0, 0, 2, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 6, 0, 0, 0, 2, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 11, 5, 0, 0, 2, 11, 0, 0, 0, 0, 0, 0, 0, 1, 4, 11, 11, 6, 0, 0, 2, 11, 0, 0, 0, 0, 0, 0, 0, 2, 11, 11, 11, 6, 0, 0, 2, 11, 0, 0, 0, 0, 0, 0, 0, 3, 11, 11, 8, 7, 0, 0, 2, 11, 0, 0, 0, 0, 0, 0, 0, 0, 2, 6, 0, 0, 0, 0, 2, 11, 0, 0, 0, 0, 0, 0, 0, 0, 2, 6, 0, 0, 0, 0, 2, 11, 0, 0, 0, 0, 0, 0, 0, 0, 3, 8, 0, 0, 0, 0, 2, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 11, 0, 0, 0, 0, 1, 5, 0, 0, 0, 0, 0, 0, 0, 0, 2, 11, 0, 0, 0, 0, 2, 6, 0, 0, 0, 0, 0, 0, 0, 0, 2, 11, 0, 0, 0, 0, 3, 7, 0, 0, 0, 0, 0, 0, 0, 0, 2, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 11];

        // 计算原始地图宽度
        this.th = 16; // 高度为16行
        const originalWidth = originalMapData.length / this.th; // 原始宽度(列数)

        // 创建扩展地图 - 将原始地图复制5次
        this.tiles = [];
        const repeatCount = 5; // 重复5次以创建更长的地图

        for (let repeat = 0; repeat < repeatCount; repeat++) {
            // 复制原始地图数据
            for (let i = 0; i < originalMapData.length; i++) {
                // 为每个重复段添加一些变化，使地图更有趣
                let tileValue = originalMapData[i];

                // 添加一些随机障碍物和平台(在非第一段地图中)
                if (repeat > 0 && tileValue === 0 && Math.random() < 0.05) {
                    // 5%概率添加砖块
                    tileValue = Math.floor(Math.random() * 8) + 2; // 随机砖块类型
                }

                this.tiles.push(tileValue);
            }
        }

        // 更新地图宽度(列数)
        this.tw = originalWidth * repeatCount;

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

        // 计算地图总宽度(像素)
        this.mapWidth = this.tw * this.tileSize;
        console.log('扩展后的地图宽度(像素):', this.mapWidth);
    }

    static new(...args) {
        return new this(...args)
    }

    // 设置要跟随的玩家对象
    setPlayer(player) {
        this.player = player
    }

    // 计算摄像机的位置，基于玩家位置
    updateCamera() {
        if (!this.followPlayer || !this.player) {
            return;
        }

        // 记录调试信息
        const originalPlayerX = this.player.x;

        // 简化逻辑：将摄像机位置简单地固定在画布宽度的1/3处
        // 这样玩家可以看到更多前方的场景
        const cameraFixedX = Math.floor(this.game.canvasWidth / 3);

        // 计算理想的地图偏移量：让玩家位于固定位置
        const idealOffsetX = -(this.player.x - cameraFixedX);

        // 限制地图偏移不超过边界
        // 最小偏移（最左边）：0
        // 最大偏移（最右边）：-(地图宽度 - 画布宽度)
        const maxOffsetX = -(this.mapWidth - this.game.canvasWidth);

        // 应用地图偏移（考虑边界）
        if (idealOffsetX > 0) {
            // 到达地图左边界
            this.offsetX = 0;
            this.reachedLeftBoundary = true;
        } else if (idealOffsetX < maxOffsetX) {
            // 到达地图右边界
            this.offsetX = maxOffsetX;
            this.reachedRightBoundary = true;
        } else {
            // 正常滚动区域
            this.offsetX = idealOffsetX;
            this.reachedLeftBoundary = false;
            this.reachedRightBoundary = false;
        }

        // 调试信息
        if (this.game.frameCount % 60 === 0) {
            console.log('摄像机跟随:', {
                玩家位置: originalPlayerX,
                固定位置: cameraFixedX,
                理想偏移: idealOffsetX,
                实际偏移: this.offsetX,
                左边界: this.reachedLeftBoundary,
                右边界: this.reachedRightBoundary
            });
        }

        // 更新摄像机位置用于调试显示
        this.cameraX = -this.offsetX;
    }

    update() {
        // 更新摄像机位置
        this.updateCamera()
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
        // 首先检查该位置是否有砖块
        let tile = this.getTile(i, j);
        if (tile === 0) {
            return false; // 不是砖块
        }

        // 获取上下左右位置的砖块情况
        let aboveTile = this.getTile(i, j - 1); // 上方
        let belowTile = this.getTile(i, j + 1); // 下方
        let leftTile = this.getTile(i - 1, j); // 左侧
        let rightTile = this.getTile(i + 1, j); // 右侧

        // 增加调试日志
        console.log(`墙壁检测: 位置(${i}, ${j}), 上=${aboveTile}, 下=${belowTile}, 左=${leftTile}, 右=${rightTile}`);

        // 改进的墙壁判定逻辑:
        // 1. 如果砖块的下方是空的，这很可能是平台/地面的边缘，不是墙壁
        if (belowTile === 0 || belowTile === undefined) {
            console.log(`位置(${i}, ${j})不是墙壁: 下方为空`);
            return false;
        }

        // 2. 如果上方是空的，而下方不是空的，这是正常的地面，不是墙壁
        if ((aboveTile === 0 || aboveTile === undefined) && belowTile !== 0) {
            console.log(`位置(${i}, ${j})不是墙壁: 符合地面特征`);
            return false;
        }

        // 3. 如果左右都有砖块，但上方是空的，这是连续地面，不是墙壁
        if ((leftTile !== 0 && leftTile !== undefined) &&
            (rightTile !== 0 && rightTile !== undefined) &&
            (aboveTile === 0 || aboveTile === undefined)) {
            console.log(`位置(${i}, ${j})不是墙壁: 左右连续地面`);
            return false;
        }

        // 4. 大多数其他情况为垂直结构的墙壁
        let isWall = (aboveTile !== 0 && aboveTile !== undefined) ||
            (leftTile !== 0 && rightTile !== 0);

        console.log(`位置(${i}, ${j})${isWall ? '是' : '不是'}墙壁`);
        return isWall;
    }

    // 获取指定位置的瓦片类型
    getTile(i, j) {
        let index = i * this.th + j;
        if (index < 0 || index >= this.tiles.length) {
            return undefined;
        }
        return this.tiles[index];
    }

    // 世界坐标转换为屏幕坐标
    worldToScreen(x, y) {
        return {
            x: x + this.offsetX,
            y: y
        }
    }

    // 屏幕坐标转换为世界坐标
    screenToWorld(x, y) {
        return {
            x: x - this.offsetX,
            y: y
        }
    }

    draw() {
        let h = this.th
        let w = this.tw

        // 根据偏移量计算可见区域的起始和结束列
        let startCol = Math.floor(-this.offsetX / this.tileSize)
        startCol = Math.max(0, startCol)

        let endCol = startCol + Math.ceil(this.game.canvasWidth / this.tileSize) + 1
        endCol = Math.min(endCol, w)

        // 只绘制可见区域内的瓦片
        for (let i = startCol; i < endCol; i++) {
            for (let j = 0; j < h; j++) {
                let index = i * h + j
                let tile = this.tiles[index]

                if (tile !== 0) {
                    let x = i * this.tileSize + this.offsetX
                    let y = j * this.tileSize

                    // 绘制瓦片图像
                    let image = this.tileImages[tile - 1]
                    this.game.context.drawImage(image.texture, x, y, this.tileSize, this.tileSize)
                }
            }
        }
    }
}