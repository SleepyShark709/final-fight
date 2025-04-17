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

    // 绘制玩家碰撞盒
    drawPlayerCollision(player) {
        if (!this.enabled || !player) return;

        const context = this.game.context;
        context.save();

        // 计算玩家屏幕位置
        let screenX = player.x;
        if (player.map && player.map.offsetX !== undefined) {
            screenX += player.map.offsetX;
        }

        // 绘制玩家外框
        context.strokeStyle = 'blue';
        context.lineWidth = 2;
        context.strokeRect(screenX, player.y, player.w, player.h);

        // 绘制精确碰撞盒 - 玩家实际碰撞区域（60%宽度）
        const hitboxWidth = player.w * 0.6;
        const hitboxX = screenX + (player.w - hitboxWidth) / 2;
        context.strokeStyle = 'cyan';
        context.lineWidth = 1;
        context.strokeRect(hitboxX, player.y, hitboxWidth, player.h);

        // 绘制脚部位置辅助线
        context.strokeStyle = 'green';
        context.lineWidth = 1;
        context.beginPath();
        context.moveTo(screenX, player.y + player.h);
        context.lineTo(screenX + player.w, player.y + player.h);
        context.stroke();

        // 显示玩家坐标
        context.fillStyle = 'white';
        context.font = '12px Arial';
        context.fillText(
            `(${Math.round(player.x)},${Math.round(player.y)})`,
            screenX,
            player.y - 5,
        );

        // 恢复玩家状态信息面板
        context.fillStyle = 'rgba(0, 0, 0, 0.7)';
        context.fillRect(10, 10, 300, 140);

        // 获取碰撞状态信息
        const footX = Math.floor((player.x + player.w / 2) / player.tileSize);
        const footY = Math.floor((player.y + player.h) / player.tileSize);
        const headX = Math.floor((player.x + player.w / 2) / player.tileSize);
        const headY = Math.floor(player.y / player.tileSize);

        // 检查左右墙壁碰撞
        const centerX = footX; // 使用脚部X坐标作为中心点
        const leftWallX = centerX - 1;
        const rightWallX = centerX + 1;

        // 检查碰撞状态
        const onGround =
            player.map && player.map.onTheGround
                ? player.map.onTheGround(footX, footY)
                : false;
        const headCollision =
            player.map && player.map.onTheGround
                ? player.map.onTheGround(headX, headY)
                : false;

        // 检查三个高度位置进行水平碰撞检测
        const topY = Math.floor((player.y + player.h * 0.2) / player.tileSize);
        const middleY = Math.floor(
            (player.y + player.h * 0.5) / player.tileSize,
        );
        const bottomY = Math.floor(
            (player.y + player.h * 0.8) / player.tileSize,
        );

        const checkPoints = [topY, middleY, bottomY];
        const leftWall =
            player.map && player.map.isTileWall
                ? checkPoints.some(
                      (y) =>
                          player.map.onTheGround(leftWallX, y) &&
                          player.map.isTileWall(leftWallX, y),
                  )
                : false;
        const rightWall =
            player.map && player.map.isTileWall
                ? checkPoints.some(
                      (y) =>
                          player.map.onTheGround(rightWallX, y) &&
                          player.map.isTileWall(rightWallX, y),
                  )
                : false;

        // 添加：可视化地面检测区域
        if (player.map) {
            // 显示地面检测点
            const groundCheckX = footX * player.tileSize + player.map.offsetX;
            const groundCheckY = footY * player.tileSize;

            // 绘制中心地面检测点
            context.fillStyle = 'rgba(255, 255, 0, 0.7)'; // 黄色，更醒目
            context.beginPath();
            context.arc(groundCheckX, groundCheckY, 5, 0, Math.PI * 2);
            context.fill();

            // 绘制从脚底到检测点的连线
            context.strokeStyle = 'yellow';
            context.lineWidth = 1;
            context.beginPath();
            context.moveTo(screenX + player.w / 2, player.y + player.h);
            context.lineTo(groundCheckX, groundCheckY);
            context.stroke();

            // 添加：绘制左右脚地面检测点
            const leftFootX = Math.floor(
                (player.x + player.w * 0.3) / player.tileSize,
            );
            const rightFootX = Math.floor(
                (player.x + player.w * 0.7) / player.tileSize,
            );

            // 左脚检测点
            const leftGroundX =
                leftFootX * player.tileSize + player.map.offsetX;
            const leftGroundY = footY * player.tileSize;
            context.fillStyle = 'rgba(0, 255, 255, 0.7)'; // 青色
            context.beginPath();
            context.arc(leftGroundX, leftGroundY, 4, 0, Math.PI * 2);
            context.fill();

            // 右脚检测点
            const rightGroundX =
                rightFootX * player.tileSize + player.map.offsetX;
            const rightGroundY = footY * player.tileSize;
            context.beginPath();
            context.arc(rightGroundX, rightGroundY, 4, 0, Math.PI * 2);
            context.fill();

            // 绘制水平碰撞检测点
            context.fillStyle = 'rgba(255, 0, 255, 0.7)'; // 紫色
            for (const y of checkPoints) {
                // 左侧检测点
                const leftCheckScreenX =
                    leftWallX * player.tileSize + player.map.offsetX;
                const leftCheckScreenY = y * player.tileSize;
                context.beginPath();
                context.arc(
                    leftCheckScreenX,
                    leftCheckScreenY,
                    3,
                    0,
                    Math.PI * 2,
                );
                context.fill();

                // 右侧检测点
                const rightCheckScreenX =
                    rightWallX * player.tileSize + player.map.offsetX;
                const rightCheckScreenY = y * player.tileSize;
                context.beginPath();
                context.arc(
                    rightCheckScreenX,
                    rightCheckScreenY,
                    3,
                    0,
                    Math.PI * 2,
                );
                context.fill();
            }
        }

        context.fillStyle = 'white';
        context.font = '16px Arial';
        context.textBaseline = 'top';

        // 在canvas左上角显示调试信息
        const debugInfo = [
            `玩家信息：`,
            `位置: (${Math.floor(player.x)}, ${Math.floor(player.y)})`,
            `速度: vx=${player.vx ? player.vx.toFixed(1) : '0'}, vy=${
                player.vy ? player.vy.toFixed(1) : '0'
            }`,
            `地面: ${onGround ? '是' : '否'}, 头部: ${
                headCollision ? '是' : '否'
            }`,
            `左墙: ${leftWall ? '是' : '否'}, 右墙: ${rightWall ? '是' : '否'}`,
            `跳跃: ${player.isJump ? '是' : '否'}, 地面状态: ${
                player.isOnGround ? '是' : '否'
            }`,
        ];

        let textY = 15;
        for (const line of debugInfo) {
            context.fillText(line, 20, textY);
            textY += 20; // 增加行间距
        }

        context.restore();
    }

    // 绘制敌人碰撞盒
    drawEnemyCollision(enemy) {
        if (!this.enabled || !enemy) return;

        const context = this.game.context;
        context.save();

        // 计算敌人屏幕位置
        let screenX = enemy.x;
        if (enemy.map && enemy.map.offsetX !== undefined) {
            screenX += enemy.map.offsetX;
        }

        // 根据敌人状态选择颜色
        let color = 'red';
        if (enemy.isDead || enemy.isDie) {
            color = 'gray'; // 死亡状态显示灰色
        }

        // 绘制敌人外框
        context.strokeStyle = color;
        context.lineWidth = 2;
        context.strokeRect(screenX, enemy.y, enemy.w, enemy.h);

        // 只有当敌人活着时才绘制详细碰撞盒
        if (!enemy.isDead && !enemy.isDie) {
            // 绘制精确碰撞盒 - 敌人实际碰撞区域（60%宽度）
            const hitboxWidth = enemy.w * 0.6;
            const hitboxX = screenX + (enemy.w - hitboxWidth) / 2;
            context.strokeStyle = 'orange';
            context.lineWidth = 1;
            context.strokeRect(hitboxX, enemy.y, hitboxWidth, enemy.h);

            // 绘制脚部位置辅助线
            context.strokeStyle = 'yellow';
            context.lineWidth = 1;
            context.beginPath();
            context.moveTo(screenX, enemy.y + enemy.h);
            context.lineTo(screenX + enemy.w, enemy.y + enemy.h);
            context.stroke();
        }

        // 显示敌人坐标和状态
        context.fillStyle = 'white';
        context.font = '12px Arial';
        context.fillText(
            `(${Math.round(enemy.x)},${Math.round(enemy.y)})`,
            screenX,
            enemy.y - 5,
        );
        if (enemy.isDead || enemy.isDie) {
            context.fillText('已死亡', screenX, enemy.y - 20);
        }

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
                    context.fillRect(
                        screenPos.x,
                        screenPos.y,
                        tileSize,
                        tileSize,
                    );
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
            `玩家屏幕位置X: ${Math.round(
                map.player ? map.player.x + map.offsetX : 0,
            )}`,
            `敌人位置X: ${Math.round(
                map.game.scene.enemy ? map.game.scene.enemy.x : 0,
            )}`,
            `地图宽度: ${map.mapWidth}像素 (${map.tw}列)`,
            `画布宽度: ${map.game.canvasWidth}像素`,
            `固定位置: ${Math.floor(map.game.canvasWidth / 3)}`,
            `地图尽头: ${-(map.mapWidth - map.game.canvasWidth)}像素`,
            `到达左边界: ${map.reachedLeftBoundary ? '是' : '否'}`,
            `到达右边界: ${map.reachedRightBoundary ? '是' : '否'}`,
        ];

        let textY = 170;
        for (const line of debugInfo) {
            context.fillText(line, 20, textY);
            textY += 20;
        }

        // 绘制控制提示 - 移动到更合适的位置，确保完全显示
        context.fillStyle = 'rgba(0, 0, 0, 0.7)';
        context.fillRect(this.game.canvasWidth - 310, 10, 300, 140);
        context.fillStyle = 'yellow';

        const controlsInfo = [
            '控制说明:',
            'A/D - 左右移动',
            'K - 跳跃',
            'J - 攻击',
            'Z/X - 手动滚动地图',
            'R - 重置位置',
            'P - 切换调试显示',
        ];

        textY = 20;
        for (const line of controlsInfo) {
            context.fillText(line, this.game.canvasWidth - 290, textY);
            textY += 20;
        }

        context.restore();
    }

    // 添加解释地形颜色的方法
    drawTerrainLegend() {
        if (!this.enabled) return;

        const context = this.game.context;
        context.save();

        // 绘制说明面板背景
        context.fillStyle = 'rgba(0, 0, 0, 0.7)';
        context.fillRect(this.game.canvasWidth - 210, 160, 200, 170);

        // 标题
        context.fillStyle = 'white';
        context.font = '16px Arial';
        context.textBaseline = 'top';
        context.fillText('地形说明:', this.game.canvasWidth - 190, 170);

        // 墙壁示例
        context.fillStyle = 'rgba(255, 0, 0, 0.5)';
        context.fillRect(this.game.canvasWidth - 190, 200, 20, 20);
        context.fillStyle = 'white';
        context.fillText('墙壁 (阻挡移动)', this.game.canvasWidth - 160, 200);

        // 地面示例
        context.fillStyle = 'rgba(0, 0, 255, 0.5)';
        context.fillRect(this.game.canvasWidth - 190, 230, 20, 20);
        context.fillStyle = 'white';
        context.fillText('地面 (可站立)', this.game.canvasWidth - 160, 230);

        // 地面检测点示例
        context.fillStyle = 'rgba(255, 255, 0, 0.7)';
        context.beginPath();
        context.arc(this.game.canvasWidth - 180, 260, 5, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = 'white';
        context.fillText('中心地面检测点', this.game.canvasWidth - 160, 260);

        // 左右脚检测点示例
        context.fillStyle = 'rgba(0, 255, 255, 0.7)';
        context.beginPath();
        context.arc(this.game.canvasWidth - 180, 290, 4, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = 'white';
        context.fillText('左右脚检测点', this.game.canvasWidth - 160, 290);

        // 水平碰撞检测点示例
        context.fillStyle = 'rgba(255, 0, 255, 0.7)';
        context.beginPath();
        context.arc(this.game.canvasWidth - 180, 320, 3, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = 'white';
        context.fillText('水平碰撞点', this.game.canvasWidth - 160, 320);

        context.restore();
    }

    // 绘制宠物碰撞盒
    drawPetCollision(pet) {
        if (!this.enabled || !pet) return;

        const context = this.game.context;
        context.save();

        // 计算宠物屏幕位置
        let screenX = pet.x;
        if (pet.map && pet.map.offsetX !== undefined) {
            screenX += pet.map.offsetX;
        }

        // 绘制宠物外框
        context.strokeStyle = 'orange';
        context.lineWidth = 2;
        context.strokeRect(screenX, pet.y, pet.w, pet.h);

        // 绘制脚部位置辅助线
        context.strokeStyle = 'yellow';
        context.lineWidth = 1;
        context.beginPath();
        context.moveTo(screenX, pet.y + pet.h);
        context.lineTo(screenX + pet.w, pet.y + pet.h);
        context.stroke();

        // 显示宠物坐标
        context.fillStyle = 'white';
        context.font = '12px Arial';
        context.fillText(
            `(${Math.round(pet.x)},${Math.round(pet.y)})`,
            screenX,
            pet.y - 5,
        );

        // 获取碰撞状态信息 - 修正检测点坐标计算
        const footX = Math.floor((pet.x + pet.w / 2) / pet.tileSize);
        // 使用与宠物类中相同的计算逻辑
        const footY = Math.floor((pet.y + pet.h - 1) / pet.tileSize);

        // 添加：可视化地面检测区域
        if (pet.map) {
            // 显示地面检测点
            const groundCheckX = footX * pet.tileSize + pet.map.offsetX;
            const groundCheckY = footY * pet.tileSize;

            // 绘制中心地面检测点
            context.fillStyle = 'rgba(255, 165, 0, 0.7)'; // 橙色
            context.beginPath();
            context.arc(groundCheckX, groundCheckY, 5, 0, Math.PI * 2);
            context.fill();

            // 绘制从脚底到检测点的连线
            context.strokeStyle = 'orange';
            context.lineWidth = 1;
            context.beginPath();
            context.moveTo(screenX + pet.w / 2, pet.y + pet.h);
            context.lineTo(groundCheckX, groundCheckY);
            context.stroke();

            // 添加：绘制左右脚地面检测点
            const leftFootX = Math.floor((pet.x + pet.w * 0.3) / pet.tileSize);
            const rightFootX = Math.floor((pet.x + pet.w * 0.7) / pet.tileSize);

            // 左脚检测点
            const leftGroundX = leftFootX * pet.tileSize + pet.map.offsetX;
            const leftGroundY = footY * pet.tileSize;
            context.fillStyle = 'rgba(255, 215, 0, 0.7)'; // 金黄色
            context.beginPath();
            context.arc(leftGroundX, leftGroundY, 4, 0, Math.PI * 2);
            context.fill();

            // 右脚检测点
            const rightGroundX = rightFootX * pet.tileSize + pet.map.offsetX;
            const rightGroundY = footY * pet.tileSize;
            context.beginPath();
            context.arc(rightGroundX, rightGroundY, 4, 0, Math.PI * 2);
            context.fill();

            // 增加：显示格子顶部线，便于直观判断宠物是否正确接触地面
            context.strokeStyle = 'lime';
            context.lineWidth = 2; // 加粗线条更容易看到
            context.beginPath();
            // 绘制当前格子的顶部线（宠物应该站在这条线上）
            const gridTopY = (footY + 1) * pet.tileSize;
            context.moveTo(screenX - 20, gridTopY);
            context.lineTo(screenX + pet.w + 20, gridTopY);
            context.stroke();

            // 增加一个视觉提示来显示宠物底部和格子顶部的差距
            if (Math.round(pet.y + pet.h) !== gridTopY) {
                const gap = Math.abs(Math.round(pet.y + pet.h) - gridTopY);

                // 绘制一个半透明的填充区域显示差距
                context.fillStyle = 'rgba(255, 0, 0, 0.3)'; // 红色半透明
                if (pet.y + pet.h < gridTopY) {
                    // 宠物在地面上方
                    context.fillRect(
                        screenX,
                        pet.y + pet.h,
                        pet.w,
                        gridTopY - (pet.y + pet.h),
                    );
                } else {
                    // 宠物在地面下方
                    context.fillRect(
                        screenX,
                        gridTopY,
                        pet.w,
                        pet.y + pet.h - gridTopY,
                    );
                }

                // 标记差距数值
                context.fillStyle = 'white';
                context.font = 'bold 12px Arial';
                context.fillText(
                    `差距: ${gap}px`,
                    screenX + pet.w + 5,
                    (pet.y + pet.h + gridTopY) / 2,
                );
            } else {
                // 如果完全对齐，显示一个绿色的勾号
                context.fillStyle = 'lime';
                context.font = 'bold 14px Arial';
                context.fillText('✓', screenX + pet.w + 5, pet.y + pet.h);
            }
        }

        // 在宠物上方显示状态信息
        const debugInfo = [
            `在地面: ${pet.isOnGround ? '是' : '否'}`,
            `vy: ${pet.vy ? pet.vy.toFixed(1) : '0'}`,
            `footY: ${footY}`,
            `格子顶部: ${(footY + 1) * pet.tileSize}`,
            `宠物底部: ${Math.round(pet.y + pet.h)}`,
        ];

        context.fillStyle = 'rgba(0, 0, 0, 0.7)';
        context.fillRect(screenX - 5, pet.y - 75, 120, 70);
        context.fillStyle = 'white';
        context.font = '12px Arial';

        let textY = pet.y - 70;
        for (const line of debugInfo) {
            context.fillText(line, screenX, textY);
            textY += 15; // 增加行间距
        }

        context.restore();
    }
}
