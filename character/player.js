// 主角角色
class Player extends Character {
    constructor(game, map) {
        super(game);
        this.game = game
        this.map = map
        this.tileSize = map.tileSize
        this.frames = [] // 要渲染的 frames 里面是图片
        this.idleFrame = [] // 闲置时的 frame
        this.runFrames = [] // 奔跑时的 frame
        this.attack1Frames = [] // 攻击类型1的 frame
        this.attack2Frames = [] // 攻击类型2的 frame
        this.attack3Frames = [] // 攻击类型3的 frame
        this.jumpFrames = [] // 跳跃的 frame
        this.initIdleFrame(game) // 给 idleFrame 赋值
        this.initRunFrame(game) // 给 runFrames 赋值
        this.initAttackFrame(game, 1) // 给 attack1Frames 赋值
        this.initAttackFrame(game, 2) // 给 attack2Frames 赋值
        this.initAttackFrame(game, 3) // 给 attack3Frames 赋值
        this.initJumpFrame(game) // 给 jumpFrames 赋值
        this.texture = this.idleFrame[0] // 设置第一帧图片
        this.frameCount = 0 // 设置 frame 的数量
        this.w = this.texture.width // 图片宽
        this.h = this.texture.height // 图片高
        this.flipX = false // 是否进行 X 轴翻转
        this.isMoving = false // 是否在进行移动
        this.movingDirection = 'right' // 移动的方向
        this.cooldown = COOL_DOWN // 攻击的冷却时间，不能让用户按住攻击键不松手一直进行攻击
        this.attackType = 1 // 攻击类型，每次按下攻击会切换攻击类型，一共有3组，为攻击1、攻击2、攻击3
        this.gy = GRAVITATIONAL_ACCELERATION // 重力加速度
        this.vy = 0 // y轴的速度
        this.isJump = false // 是否在跳跃
        this.isOnGround = false // 新增：是否在地面上
        this.isPlayer = true // 是否是玩家
        this.vx = 0 // x加速度
        this.mx = 0 // x摩擦力
        this.maxSpeed = 2.5
        // 添加血量相关属性
        this.maxHP = 100
        this.currentHP = 100
        this.isDead = false
        this.HPBar = new HpBar(game, this.x, this.y + 20)
        // 和地图相关的数据

    }
    static new(...args) {
        return new this(...args)
    }
    initIdleFrame(game) {
        // 创建闲置时的 frame 数组，里面存放的是图片信息
        for (let i = 0; i < PLAYER_IDLE_IMAGE_NUMBER; i++) {
            let name = `idle${i}`
            let t = game.textureByName(name)
            for (let j = 0; j < RENDER_IMAGE_NUMBER; j++) {
                this.idleFrame.push(t)
            }
        }
    }
    initRunFrame(game) {
        // 创建奔跑时的 frame 数组，里面存放的是图片信息
        for (let i = 0; i < PLAYER_RUN_IMAGE_NUMBER; i++) {
            let name = `run${i}`
            let t = game.textureByName(name)
            for (let j = 0; j < RENDER_IMAGE_NUMBER; j++) {
                this.runFrames.push(t)
            }
        }
    }
    initAttackFrame(game, type) {
        let ATTACK_MAP = {
            1: this.attack1Frames,
            2: this.attack2Frames,
            3: this.attack3Frames
        }
        let index = type === 3 ? PLAYER_ATTACK_TYPE_3_NUMBER : PLAYER_ATTACK_TYPE_1_OR_2_NUMBER
        for (let i = 0; i < index; i++) {
            let name = `attack${type}_${i}`
            let t = game.textureByName(name)
            for (let j = 0; j < RENDER_IMAGE_NUMBER; j++) {
                ATTACK_MAP[type].push(t)
            }
        }
    }
    initJumpFrame(game) {
        for (let i = 0; i < PLAYER_JUMP_IMAGE_NUMBER; i++) {
            let name = `jump${i}`
            let t = game.textureByName(name)
            for (let j = 0; j < RENDER_IMAGE_NUMBER; j++) {
                this.jumpFrames.push(t)
            }
        }
    }
    jump(keyStatus) {
        // 只有人物在地面的时候才可以跳
        // if (this.y === 385) {
        if (keyStatus === 'down' && this.isJump === false) {
            console.log('跳跃')

            this.isJump = true
            this.frames = this.jumpFrames
            this.vy = -JUMP_HEIGHT
        }

        // }
    }
    updateGravity() {
        // 使用角色中心点和底部作为地面检测点
        let footX = Math.floor((this.x + this.w / 2) / this.tileSize)
        let footY = Math.floor((this.y + this.h) / this.tileSize)

        // 检查脚下是否有地面
        let onTheGround = this.map.onTheGround(footX, footY)

        // 检测上一帧是否已经在地面上
        let wasOnGround = this.isOnGround
        this.isOnGround = onTheGround && this.vy >= 0

        if (this.isOnGround) {
            // 在地面上时，停止下落并重置状态
            if (this.vy > 0) { // 只有当正在下落时才调整位置
                // 将角色精确放置在地形上方，不留间隙
                this.y = (footY * this.tileSize) - this.h
                this.vy = 0
            }

            // 只有在之前不在地面而现在在地面时才重置跳跃状态
            if (!wasOnGround) {
                this.isJump = false
                // 如果是从跳跃状态落地，改变动画
                if (this.frames === this.jumpFrames) {
                    this.frames = this.idleFrame
                }
            }
        } else {
            // 不在地面上，应用重力
            this.y += this.vy
            this.vy += this.gy * GRAVITATIONAL_ACCELERATION_PERCENT

            // 游戏世界的底部边界检查
            if (this.y > 385) {
                this.y = 385
                this.vy = 0
                this.isJump = false
                this.isOnGround = true
                if (this.frames === this.jumpFrames) {
                    this.frames = this.idleFrame
                }
            }
        }

        // 检测头顶碰撞
        if (this.vy < 0) {
            // 使用角色顶部中心点检测头顶碰撞
            let headX = Math.floor((this.x + this.w / 2) / this.tileSize)
            let headY = Math.floor(this.y / this.tileSize)
            let headBlock = this.map.onTheGround(headX, headY)

            if (headBlock) {
                // 如果头顶有障碍物，停止上升
                this.vy = 0
                // 稍微下移角色，防止卡在砖块中
                this.y = (headY + 1) * this.tileSize
            }
        }
    }

    // 简化水平碰撞检测
    checkHorizontalCollision() {
        // 使用角色中心点的X坐标作为碰撞检测基准
        const centerX = Math.floor((this.x + this.w / 2) / this.tileSize);

        // 计算左右检测点，向左右各偏移一格
        const leftCheckX = centerX - 1;
        const rightCheckX = centerX + 1;

        // 使用角色上中下三个点进行检测，确保全身都考虑到
        const checkPoints = [
            Math.floor((this.y + this.h * 0.2) / this.tileSize), // 上部位置
            Math.floor((this.y + this.h * 0.5) / this.tileSize), // 中部位置
            Math.floor((this.y + this.h * 0.8) / this.tileSize) // 下部位置（接近脚部）
        ]

        // 检查左右是否有墙壁（任一高度位置）
        const leftWall = checkPoints.some(y => {
            // 使用角色中心左侧点检测
            return this.map.onTheGround(leftCheckX, y) && this.map.isTileWall(leftCheckX, y);
        });

        const rightWall = checkPoints.some(y => {
            // 使用角色中心右侧点检测
            return this.map.onTheGround(rightCheckX, y) && this.map.isTileWall(rightCheckX, y);
        });

        // 应用碰撞响应
        if (rightWall && this.vx > 0) {
            // 计算新的X位置，使角色中心恰好在右侧检测点左侧
            this.x = (rightCheckX - 1) * this.tileSize + this.tileSize / 2 - this.w / 2;
            this.vx = 0;
            this.mx = 0;
        }

        if (leftWall && this.vx < 0) {
            // 计算新的X位置，使角色中心恰好在左侧检测点右侧
            this.x = (leftCheckX + 1) * this.tileSize + this.tileSize / 2 - this.w / 2;
            this.vx = 0;
            this.mx = 0;
        }
    }

    update() {
        // 更新血条位置
        this.HPBar.update(this.currentHP / this.maxHP)
        this.HPBar.x = this.x + this.w / 4
        this.HPBar.y = this.y - 20

        // 摩擦力系统
        // 更新 x 加速和受力
        this.vx += this.mx
        if (Math.abs(this.vx) >= this.maxSpeed) {
            this.vx = parseInt(this.vx)
        }
        // 说明摩擦力已经把速度降至 0 以下，停止摩擦
        if (this.vx * this.mx > 0) {
            this.vx = 0
            this.mx = 0
        } else {
            // 应用水平速度
            this.x += this.vx
        }

        // 先应用重力和垂直碰撞检测
        this.updateGravity()

        // 然后单独检测水平碰撞，确保垂直和水平碰撞分开处理
        this.checkHorizontalCollision()

        // 当角色x位置超出画面，将其限制在画面内
        const minX = 0;
        const maxX = this.game.canvasWidth - this.w;
        if (this.x < minX) {
            this.x = minX;
        } else if (this.x > maxX) {
            this.x = maxX;
        }

        if (this.cooldown > 0) {
            // 设置冷却时间
            this.cooldown--
        }
        // 如果当前没有移动，则更改 frame 为闲置状态
        if (this.isMoving === false && this.isAttack === false && this.isJump === false) {
            this.frames = this.idleFrame
        }
        // 判断用户没有移动时，置为闲置状态
        this.frameCount--
        if (this.frameCount < 0) {
            if (this.isAttack === true) {
                this.frames = this.idleFrame
                this.isAttack = false
            }
            this.frameCount = this.frames.length - 1
        }
        // 这里出现「this.frames[this.frameCount] === undefined」报错的问题是，在这一瞬间，调用了 move 函数修改了 this.frame，导致获取到的数组长度不一致了
        // 这里想到简单的 hack 办法是，将所有动作的帧数都保持一致
        if (this.frameCount > this.frames.length) {
            // 解决由于 frame 的长度和 frameCount 对应不上的问题，强制设置当前的 count 为最后一帧，解决画面闪动消失的问题
            this.frameCount = this.frames.length - 1
        }
        this.texture = this.frames[this.frameCount]

        // 设置当前为非移动状态
        this.isMoving = false
    }
    attack(enemy, scene) {
        let ATTACK_FRAMES_MAP = {
            1: this.attack1Frames,
            2: this.attack2Frames,
            3: this.attack3Frames,
        }
        if (this.cooldown === 0) {
            this.cooldown = COOL_DOWN // 设置冷却为10帧
            if (this.attackType > PLAYER_ATTACK_TYPE) {
                // 当攻击的枚举值超过当前枚举数量时，重置攻击枚举值
                this.attackType = 1
            }
            if (this.isMoving === true) {
                this.attackType = 3 // 当移动时攻击使用第三种攻击方式
            }
            this.frames = ATTACK_FRAMES_MAP[this.attackType] // 设置奔跑的 frame
            this.frameCount = PLAYER_ATTACK_TYPE_1_OR_2_NUMBER * RENDER_IMAGE_NUMBER
            this.isAttack = true
            this.attackType += 1 // 攻击枚举值 + 1
            // 判断人物与敌人是否碰撞
            // this.x > enemy.x - 15 - this.w // 当玩家在敌人左侧 15 个像素点
            // enemy.x + enemy.w + 15 > this.x // 当玩家在敌人右侧 15 个像素点
            // console.log('当玩家在敌人左侧 15 个像素点', this.x > enemy.x - 5 - this.w)
            // console.log('当玩家在敌人右侧 15 个像素点', this.x < enemy.x + enemy.w + 5)
            // 逻辑是敌人和玩家的图片解除到的时候，其实肉眼看是没有接触到的（因为有空白部分），所以要让图片负接触一些，才是肉眼可见的打击到了
            if (this.x > enemy.x + 30 - this.w && this.x < enemy.x + enemy.w - 30) {
                console.log('开始攻击')
                // 开始攻击, 删除敌人 TODO 这里应该在攻击动画播放结束的时候删除敌人,现在定时器是一种 hack 的方案。不应该这么做
                setTimeout(() => {
                    // 暂时设置伤害值是 30-50 间的随机数
                    let damageValue = Math.round(PLAYER_ATTACK_DAMAGE_VALUE)
                    enemy.killEvent(damageValue)
                }, 500)
            }
        }
    }
    move(x, keyStatus) {
        // 简化移动碰撞检测
        let canMove = true

        if (x < 0) {
            // 向左移动，检查左侧碰撞
            const centerX = Math.floor((this.x + this.w / 2) / this.tileSize);
            const leftCheckX = centerX - 1; // 以角色中心左侧一格为检测点

            // 检查角色上中下三个位置
            const checkPoints = [
                Math.floor((this.y + this.h * 0.2) / this.tileSize),
                Math.floor((this.y + this.h * 0.5) / this.tileSize),
                Math.floor((this.y + this.h * 0.8) / this.tileSize)
            ]

            // 任一位置有墙壁都不能移动
            canMove = !checkPoints.some(y => {
                // 使用修改后的墙壁检测逻辑
                const hasTile = this.map.onTheGround(leftCheckX, y);
                const isWall = hasTile && this.map.isTileWall(leftCheckX, y);
                return isWall;
            })

            this.movingDirection = 'left'
        } else {
            // 向右移动，检查右侧碰撞
            const centerX = Math.floor((this.x + this.w / 2) / this.tileSize);
            const rightCheckX = centerX + 1; // 以角色中心右侧一格为检测点

            // 检查角色上中下三个位置
            const checkPoints = [
                Math.floor((this.y + this.h * 0.2) / this.tileSize),
                Math.floor((this.y + this.h * 0.5) / this.tileSize),
                Math.floor((this.y + this.h * 0.8) / this.tileSize)
            ]

            // 任一位置有墙壁都不能移动
            canMove = !checkPoints.some(y => {
                // 使用修改后的墙壁检测逻辑
                const hasTile = this.map.onTheGround(rightCheckX, y);
                const isWall = hasTile && this.map.isTileWall(rightCheckX, y);
                return isWall;
            })

            this.movingDirection = 'right'
        }

        if (canMove) {
            super.move(x);
            // 摩擦力系统
            let speed = 0.3 * x
            this.vx += speed
            this.mx = -speed / 2
        } else {
            // 虽然不能移动，但仍然设置方向以便正确显示角色朝向
            this.flipX = this.defaultLocation === 'right' ? x < 0 : this.defaultLocation === 'left' ? x > 0 : false;
            if (this.isJump === false && this.isAttack === false) {
                this.frames = this.runFrames // 即使被阻挡，也设置奔跑动画
            }
            this.isMoving = true
            this.isBlockOnFrount = true
        }
    }
    draw() {
        // 调用原始绘制方法
        super.draw()
        this.HPBar.draw()
    }

    // 受伤方法
    takeDamage(damage) {
        if (!this.isDead) {
            this.currentHP -= damage
            if (this.currentHP <= 0) {
                this.currentHP = 0
                this.die()
            }
        }
    }

    // 死亡方法
    die() {
        this.isDead = true
        // 移除血条
        this.HPBar.remove()
        // 停止所有动画和更新
        this.frames = []
        this.texture = null
        // 停止场景更新

        // 切换到游戏结束场景
        let s = SceneTitle.new(this.game)
        this.game.replaceScene(s)
    }
}