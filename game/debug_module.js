// 碰撞调试模块 - 用于可视化物理碰撞和显示调试信息
class DebugModule {
    constructor(game) {
        this.game = game;
        this.enabled = false;
        this.initToggleButton();
    }

    static new(game) {
        return new this(game);
    }

    // 创建调试开关按钮
    initToggleButton() {
        // 创建开关容器
        const toggleContainer = document.createElement('div');
        toggleContainer.style.position = 'absolute';
        toggleContainer.style.top = '10px';
        toggleContainer.style.right = '10px';
        toggleContainer.style.display = 'flex';
        toggleContainer.style.alignItems = 'center';
        toggleContainer.style.padding = '5px 10px';
        toggleContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        toggleContainer.style.borderRadius = '5px';
        toggleContainer.style.zIndex = '1000';

        // 创建标签
        const label = document.createElement('label');
        label.textContent = '调试模式：';
        label.style.color = 'white';
        label.style.marginRight = '10px';
        label.style.fontSize = '14px';
        toggleContainer.appendChild(label);

        // 创建开关容器
        const switchContainer = document.createElement('div');
        switchContainer.style.position = 'relative';
        switchContainer.style.width = '40px';
        switchContainer.style.height = '20px';
        toggleContainer.appendChild(switchContainer);

        // 创建开关滑块背景
        const sliderBg = document.createElement('div');
        sliderBg.style.position = 'absolute';
        sliderBg.style.top = '0';
        sliderBg.style.left = '0';
        sliderBg.style.width = '100%';
        sliderBg.style.height = '100%';
        sliderBg.style.backgroundColor = '#ccc';
        sliderBg.style.borderRadius = '34px';
        sliderBg.style.transition = '0.4s';
        switchContainer.appendChild(sliderBg);

        // 创建滑块
        const slider = document.createElement('div');
        slider.style.position = 'absolute';
        slider.style.height = '16px';
        slider.style.width = '16px';
        slider.style.left = '2px';
        slider.style.bottom = '2px';
        slider.style.backgroundColor = 'white';
        slider.style.borderRadius = '50%';
        slider.style.transition = '0.4s';
        switchContainer.appendChild(slider);

        // 添加到DOM
        document.body.appendChild(toggleContainer);

        // 添加点击事件
        switchContainer.addEventListener('click', () => {
            this.enabled = !this.enabled;
            if (this.enabled) {
                sliderBg.style.backgroundColor = '#4CAF50';
                slider.style.transform = 'translateX(20px)';
            } else {
                sliderBg.style.backgroundColor = '#ccc';
                slider.style.transform = 'translateX(0)';
            }
        });
    }

    // 绘制玩家的碰撞可视化
    drawPlayerCollision(player) {
        if (!this.enabled) return;

        const context = this.game.context;

        // 保存当前画布状态
        context.save();

        // 考虑地图偏移
        const playerScreenPos = player.map && player.map.worldToScreen ?
            player.map.worldToScreen(player.x, player.y) : {
                x: player.x,
                y: player.y
            };

        // 设置半透明边界框，这是实际用于碰撞的边界
        context.fillStyle = 'rgba(0, 255, 0, 0.3)'; // 绿色半透明
        context.fillRect(playerScreenPos.x, playerScreenPos.y, player.w, player.h);

        // 获取碰撞检测点对应的tile坐标
        const footX = Math.floor((player.x + player.w / 2) / player.tileSize);
        const footY = Math.floor((player.y + player.h) / player.tileSize);
        const headX = Math.floor((player.x + player.w / 2) / player.tileSize);
        const headY = Math.floor(player.y / player.tileSize);
        const leftX = Math.floor(player.x / player.tileSize);
        const rightX = Math.floor((player.x + player.w) / player.tileSize);

        // 获取三个高度位置进行水平碰撞检测
        const topY = Math.floor((player.y + player.h * 0.2) / player.tileSize);
        const middleY = Math.floor((player.y + player.h * 0.5) / player.tileSize);
        const bottomY = Math.floor((player.y + player.h * 0.8) / player.tileSize);

        // 左右墙壁检测点 - 改为使用角色中心左右侧的点
        const centerX = footX; // 使用脚部X坐标作为中心点
        const leftWallX = centerX - 1;
        const rightWallX = centerX + 1;

        // 转换为屏幕坐标（应用地图偏移）
        const tileToScreen = (tileX, tileY) => {
            const worldX = tileX * player.tileSize;
            const worldY = tileY * player.tileSize;

            if (player.map && player.map.worldToScreen) {
                return player.map.worldToScreen(worldX, worldY);
            }

            return {
                x: worldX,
                y: worldY
            };
        };

        // 绘制碰撞检测点
        // 脚部检测点 - 红色
        context.fillStyle = 'rgba(255, 0, 0, 0.5)';
        const footScreenPos = tileToScreen(footX, footY);
        context.fillRect(footScreenPos.x, footScreenPos.y, player.tileSize, player.tileSize);

        // 头部检测点 - 青色
        context.fillStyle = 'rgba(0, 255, 255, 0.5)';
        const headScreenPos = tileToScreen(headX, headY);
        context.fillRect(headScreenPos.x, headScreenPos.y, player.tileSize, player.tileSize);

        // 左侧检测点 - 蓝色（上中下三个点）
        context.fillStyle = 'rgba(0, 0, 255, 0.5)';
        const leftTopScreenPos = tileToScreen(leftWallX, topY);
        const leftMiddleScreenPos = tileToScreen(leftWallX, middleY);
        const leftBottomScreenPos = tileToScreen(leftWallX, bottomY);
        context.fillRect(leftTopScreenPos.x, leftTopScreenPos.y, player.tileSize, player.tileSize);
        context.fillRect(leftMiddleScreenPos.x, leftMiddleScreenPos.y, player.tileSize, player.tileSize);
        context.fillRect(leftBottomScreenPos.x, leftBottomScreenPos.y, player.tileSize, player.tileSize);

        // 右侧检测点 - 黄色（上中下三个点）
        context.fillStyle = 'rgba(255, 255, 0, 0.5)';
        const rightTopScreenPos = tileToScreen(rightWallX, topY);
        const rightMiddleScreenPos = tileToScreen(rightWallX, middleY);
        const rightBottomScreenPos = tileToScreen(rightWallX, bottomY);
        context.fillRect(rightTopScreenPos.x, rightTopScreenPos.y, player.tileSize, player.tileSize);
        context.fillRect(rightMiddleScreenPos.x, rightMiddleScreenPos.y, player.tileSize, player.tileSize);
        context.fillRect(rightBottomScreenPos.x, rightBottomScreenPos.y, player.tileSize, player.tileSize);

        // 检查碰撞状态
        const onGround = player.map.onTheGround(footX, footY);
        const headCollision = player.map.onTheGround(headX, headY);

        // 检查左右墙壁碰撞（任一高度位置）
        const checkPoints = [topY, middleY, bottomY];
        const leftWall = checkPoints.some(y =>
            player.map.onTheGround(leftWallX, y) && player.map.isTileWall(leftWallX, y)
        );
        const rightWall = checkPoints.some(y =>
            player.map.onTheGround(rightWallX, y) && player.map.isTileWall(rightWallX, y)
        );

        // 绘制信息面板背景
        context.fillStyle = 'rgba(0, 0, 0, 0.7)';
        context.fillRect(10, 10, 300, 140);

        // 显示碰撞状态信息 - 放到画布左上角并增大字体
        context.fillStyle = 'white';
        context.font = '16px Arial';
        context.textBaseline = 'top';

        // 在canvas左上角显示调试信息
        const debugInfo = [
            `调试信息：`,
            `位置: (${Math.floor(player.x)}, ${Math.floor(player.y)})`,
            `速度: vx=${player.vx.toFixed(1)}, vy=${player.vy.toFixed(1)}`,
            `地面: ${onGround ? '是' : '否'}, 头部: ${headCollision ? '是' : '否'}`,
            `左墙: ${leftWall ? '是' : '否'}, 右墙: ${rightWall ? '是' : '否'}`,
            `跳跃: ${player.isJump ? '是' : '否'}, 地面状态: ${player.isOnGround ? '是' : '否'}`
        ];

        let textY = 15;
        for (const line of debugInfo) {
            context.fillText(line, 20, textY);
            textY += 20; // 增加行间距
        }

        // 恢复画布状态
        context.restore();
    }

    // 绘制地图瓦片碰撞可视化
    drawMapCollision(map) {
        if (!this.enabled || !map) return;

        const context = this.game.context;
        const tileSize = map.tileSize;

        // 计算要渲染的起始列和结束列（基于当前视口）
        const startCol = Math.floor(-map.offsetX / tileSize);
        const endCol = Math.ceil((map.cameraWidth - map.offsetX) / tileSize);

        // 确保范围不超出地图边界
        const safeStartCol = Math.max(0, startCol);
        const safeEndCol = Math.min(map.tw, endCol);

        // 对每一列进行循环
        for (let col = safeStartCol; col < safeEndCol; col++) {
            // 对每列内的每一行进行循环
            for (let row = 0; row < map.th; row++) {
                const tileIndex = col * map.th + row;
                const tileType = map.tiles[tileIndex];

                // 如果该位置有瓦片
                if (tileType !== 0) {
                    // 计算瓦片的世界坐标
                    const worldX = col * tileSize;
                    const worldY = row * tileSize;

                    // 转换为屏幕坐标（考虑地图偏移）
                    const screenPos = map.worldToScreen(worldX, worldY);

                    // 判断是墙壁还是地面
                    const isWall = map.isTileWall(col, row);

                    // 绘制不同颜色背景
                    context.save();
                    if (isWall) {
                        // 墙壁 - 用红色背景
                        context.fillStyle = 'rgba(255, 0, 0, 0.2)';
                    } else {
                        // 地面 - 用蓝色背景
                        context.fillStyle = 'rgba(0, 0, 255, 0.2)';
                    }
                    context.fillRect(screenPos.x, screenPos.y, tileSize, tileSize);
                    context.restore();
                }
            }
        }
    }

    // 绘制摄像机调试信息
    drawCameraDebug(map) {
        if (!this.enabled || !map) return;

        const context = this.game.context;
        context.save();

        // 绘制背景
        context.fillStyle = 'rgba(0, 0, 0, 0.7)';
        context.fillRect(10, 160, 300, 250);

        // 显示摄像机信息
        context.fillStyle = 'white';
        context.font = '16px Arial';
        context.textBaseline = 'top';

        const debugInfo = [
            `摄像机信息：`,
            `地图偏移X: ${Math.round(map.offsetX)}`,
            `玩家世界位置X: ${Math.round(map.player ? map.player.x : 0)}`,
            `玩家世界位置Y: ${Math.round(map.player ? map.player.y : 0)}`,
            `玩家屏幕位置X: ${Math.round(map.player ? map.player.x + map.offsetX : 0)}`,
            `敌人位置X: ${Math.round(map.game.scene.enemy ? map.game.scene.enemy.x : 0)}`,
            `地图宽度: ${map.mapWidth}像素 (${map.tw}列)`,
            `画布宽度: ${map.game.canvasWidth}像素`,
            `固定位置: ${Math.floor(map.game.canvasWidth / 3)}`,
            `地图尽头: ${-(map.mapWidth - map.game.canvasWidth)}像素`,
            `到达左边界: ${map.reachedLeftBoundary ? '是' : '否'}`,
            `到达右边界: ${map.reachedRightBoundary ? '是' : '否'}`
        ];

        let textY = 170;
        for (const line of debugInfo) {
            context.fillText(line, 20, textY);
            textY += 20;
        }

        // 绘制控制提示
        context.fillStyle = 'rgba(0, 0, 0, 0.7)';
        context.fillRect(10, 420, 300, 120);
        context.fillStyle = 'yellow';

        const controlsInfo = [
            '控制说明:',
            'A/D - 左右移动',
            'K - 跳跃',
            'J - 攻击',
            'Z/X - 手动滚动地图',
            'R - 重置位置'
        ];

        textY = 430;
        for (const line of controlsInfo) {
            context.fillText(line, 20, textY);
            textY += 20;
        }

        context.restore();
    }
}