// 宠物类
class Pet extends Character {
    constructor(game, player, map) {
        super(game);
        this.game = game;
        this.player = player; // 关联主角
        this.map = map;
        this.tileSize = map.tileSize;

        // 宠物动画帧
        this.frames = []; // 当前播放的动画帧
        this.idleFrame = []; // 闲置时的动画帧

        // 初始化动画帧
        this.initIdleFrame(game);

        // 设置宠物初始状态
        this.texture = this.idleFrame[0];
        this.frameCount = 0;
        this.w = 40; // 宠物宽度
        this.h = 40; // 宠物高度
        this.flipX = false;
        this.isMoving = false;
        this.movingDirection = 'right';

        // 跟随参数 - 使用全局常量，但调整为更小的距离
        this.followDistance = 20; // 减小到20px
        this.followSpeed = PET_FOLLOW_SPEED * 1.5; // 加快跟随速度

        // 物理属性
        this.gy = GRAVITATIONAL_ACCELERATION * 0.8; // 重力加速度（稍小于主角）
        this.vy = 0; // y轴的速度
        this.isJump = false; // 是否在跳跃
        this.isOnGround = true; // 初始默认为在地面上

        // 地面检测参数 - 修改为更合适的值
        this.footOffset = 5; // 修改为5像素的偏移量，让宠物脚部更好地对齐地面
        this.minVerticalDelta = 0.1; // 最小垂直位移量
        this.groundStabilityCounter = 10; // 初始化为阈值，表示已经稳定在地面上
        this.groundStabilityThreshold = 10; // 在地面上保持稳定的帧数阈值

        // 动画参数 - 恢复这些参数
        this.animationSpeed = 8; // 动画播放速度
        this.animationCounter = 0; // 动画计数器

        // 调试信息
        this.debug = false; // 是否显示调试信息

        // 初始化位置 - 确保宠物在正确的高度
        this.x = this.player.x - this.followDistance;
        this.y = this.player.y;

        // 立即进行一次地面检测，确保宠物站在地面上
        this.initGroundPosition();
    }

    // 新增：初始位置设置，确保宠物站在地面上
    initGroundPosition() {
        // 从宠物当前位置向下检测，找到第一个地面
        let footX = Math.floor((this.x + this.w / 2) / this.tileSize);
        let startY = Math.floor(this.y / this.tileSize);
        let groundY = null;

        // 向下搜索直到找到地面
        for (let y = startY; y < startY + 20; y++) {
            if (this.map.onTheGround(footX, y)) {
                groundY = y;
                break;
            }
        }

        // 如果找到地面，将宠物放在地面上
        if (groundY !== null) {
            this.y = groundY * this.tileSize - this.h + this.footOffset;
        } else {
            // 没找到地面，放在与玩家相同高度
            this.y = this.player.y;
        }

        this.vy = 0;
        this.isOnGround = true;
        this.groundStabilityCounter = this.groundStabilityThreshold;
    }

    static new(...args) {
        return new this(...args);
    }

    initIdleFrame(game) {
        // 加载宠物的闲置动画帧，使用全局常量
        for (let i = 0; i < PET_IDLE_IMAGE_NUMBER; i++) {
            let name = `pet-idle${i}`;
            let t = game.textureByName(name);
            // 添加相同的图片多次以降低动画速度
            for (let j = 0; j < RENDER_IMAGE_NUMBER; j++) {
                this.idleFrame.push(t);
            }
        }
        // 初始化当前播放的动画
        this.frames = this.idleFrame;
    }

    // 地面碰撞检测和重力应用
    updateGravity() {
        // 使用宠物中心点和底部作为地面检测点
        let footX = Math.floor((this.x + this.w / 2) / this.tileSize);

        // 确保footY计算正确，使用宠物底部坐标
        let footY = Math.floor((this.y + this.h - 1) / this.tileSize);

        if (this.debug) {
            console.log(
                `宠物地面检测坐标: footX=${footX}, footY=${footY}, 宠物Y=${
                    this.y
                }, 宠物底部=${this.y + this.h}`,
            );
        }

        // 检查脚下是否有地面
        let onTheGround = this.map.onTheGround(footX, footY);

        // 增加：检查左右脚位置，提高站在边缘时的稳定性
        if (!onTheGround) {
            // 检查左脚和右脚
            const leftFootX = Math.floor(
                (this.x + this.w * 0.3) / this.tileSize,
            );
            const rightFootX = Math.floor(
                (this.x + this.w * 0.7) / this.tileSize,
            );

            // 如果左脚或右脚下方有砖块，就认为在地面上
            const leftGroundCheck = this.map.onTheGround(leftFootX, footY);
            const rightGroundCheck = this.map.onTheGround(rightFootX, footY);
            onTheGround = leftGroundCheck || rightGroundCheck;
        }

        // 新增：检查脚下一格是否有地面（解决刚好在格子边缘的情况）
        if (!onTheGround) {
            const footYBelow = footY + 1;
            if (this.map.onTheGround(footX, footYBelow)) {
                // 如果下一格有地面，并且宠物足够接近，认为在地面上
                const distanceToNextTile =
                    (footY + 1) * this.tileSize - (this.y + this.h);
                if (distanceToNextTile <= 10) {
                    // 10像素的容差
                    onTheGround = true;

                    if (this.debug) {
                        console.log(
                            `宠物检测到下一格地面，距离=${distanceToNextTile}px`,
                        );
                    }
                }
            }
        }

        // 将原来的地面状态保存起来
        let wasOnGround = this.isOnGround;

        // 修复：简化地面检测逻辑，提高稳定性
        if (onTheGround) {
            // 在地面上，递增计数器
            this.groundStabilityCounter++;
            if (this.groundStabilityCounter >= this.groundStabilityThreshold) {
                this.isOnGround = true;
            }
        } else if (this.vy > 0.5) {
            // 明显的下落状态，立即离开地面
            this.groundStabilityCounter = 0;
            this.isOnGround = false;
        } else if (this.vy < -0.5) {
            // 明显的上升状态，立即离开地面
            this.groundStabilityCounter = 0;
            this.isOnGround = false;
        } else if (this.groundStabilityCounter > 0) {
            // 轻微的状态变化，逐渐减少计数器但不立即改变状态
            this.groundStabilityCounter -= 2;
            if (this.groundStabilityCounter <= 0) {
                this.groundStabilityCounter = 0;
                this.isOnGround = false;
            }
        }

        if (this.debug) {
            console.log(
                `宠物地面状态: 上一帧=${wasOnGround}, 当前帧=${this.isOnGround}, vy=${this.vy}, 稳定计数=${this.groundStabilityCounter}`,
            );
        }

        if (this.isOnGround) {
            // 在地面上时，停止下落并重置状态
            if (this.vy >= 0) {
                // 只有当正在下落或静止时才调整位置
                const oldY = this.y;

                // 计算目标Y位置
                const targetY =
                    (footY + 1) * this.tileSize - this.h + this.footOffset;

                // 平滑过渡到目标位置
                const transitionSpeed = 0.3;
                this.y =
                    this.y * (1 - transitionSpeed) + targetY * transitionSpeed;

                // 强制将垂直速度设为0
                this.vy = 0;

                if (this.debug) {
                    console.log(
                        `宠物落地调整: 从${oldY}到${this.y}, 目标Y=${targetY}`,
                    );
                }
            }

            // 只有在之前不在地面而现在在地面时才重置跳跃状态
            if (!wasOnGround) {
                this.isJump = false;
            }
        } else {
            // 不在地面上，应用重力

            // 直接应用垂直速度
            this.y += this.vy;

            // 应用重力，使垂直速度增加
            this.vy += this.gy * GRAVITATIONAL_ACCELERATION_PERCENT;

            // 限制最大下落速度
            const maxFallSpeed = 12;
            if (this.vy > maxFallSpeed) {
                this.vy = maxFallSpeed;
            }

            // 游戏世界的底部边界检查
            const worldBottom = 385 - this.h + this.footOffset;
            if (this.y > worldBottom) {
                this.y = worldBottom;
                this.vy = 0;
                this.isJump = false;
                this.isOnGround = true;
                this.groundStabilityCounter = this.groundStabilityThreshold; // 立即设为稳定
            }
        }

        // 检测头顶碰撞
        if (this.vy < 0) {
            // 使用宠物顶部中心点检测头顶碰撞
            let headX = Math.floor((this.x + this.w / 2) / this.tileSize);
            let headY = Math.floor(this.y / this.tileSize);
            let headBlock = this.map.onTheGround(headX, headY);

            if (headBlock) {
                // 如果头顶有障碍物，停止上升
                this.vy = 0;
                // 稍微下移，防止卡在砖块中
                this.y = (headY + 1) * this.tileSize;
            }
        }
    }

    update() {
        // 首先应用重力和进行地面碰撞检测
        this.updateGravity();

        // 计算宠物应该在主角的哪一侧 - 修改逻辑，始终在主角身后
        // 主角朝右时(flipX=false)，宠物在主角左侧(后方)
        // 主角朝左时(flipX=true)，宠物在主角右侧(后方)
        const isPlayerFacingRight = !this.player.flipX;

        // 计算目标X位置 - 宠物应该站在主角身后
        let targetX;
        if (isPlayerFacingRight) {
            // 主角朝右，宠物在左侧(后方)
            targetX = this.player.x - this.w - this.followDistance;
        } else {
            // 主角朝左，宠物在右侧(后方)
            targetX = this.player.x + this.player.w + this.followDistance;
        }

        // 平滑移动到目标位置
        const dx = targetX - this.x;
        this.x += dx * this.followSpeed;

        // 设置朝向 - 宠物应该与主角朝向相同
        this.flipX = this.player.flipX;

        // 更新动画帧 - 确保动画正确播放
        this.animationCounter++;
        if (this.animationCounter >= this.animationSpeed) {
            this.animationCounter = 0;
            this.frameCount = (this.frameCount + 1) % this.frames.length;
            this.texture = this.frames[this.frameCount];
        }
    }

    draw() {
        let context = this.game.context;
        context.save();
        let w2 = this.w / 2;
        let h2 = this.h / 2;

        // 获取宠物的屏幕坐标（考虑地图偏移）
        let screenX = this.x;
        let screenY = this.y;

        // 应用地图偏移
        if (this.map && this.map.offsetX !== undefined) {
            screenX = this.x + this.map.offsetX;
        }

        context.translate(screenX + w2, screenY + h2);
        if (this.flipX) {
            context.scale(-1, 1);
        }
        context.translate(-w2, -h2);

        // 绘制宠物图像，缩放至宠物尺寸
        if (this.texture) {
            context.drawImage(this.texture, 0, 0, this.w, this.h);
        }

        context.restore();
    }
}
