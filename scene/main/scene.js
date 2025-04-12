class Scene extends GameScene {
    constructor(game) {
        super(game);

        // 创建地图
        let map = new GameTileMap(game)
        this.map = map

        // 背景管理系统
        this.backgroundSystem = {
            // 背景图片资源
            texture: game.textureByName('bg'),
            // 每张背景图片的尺寸
            width: 1024,
            height: 512,
            // 背景图片偏移系数（视差效果）- 0.5表示背景移动速度是地图的一半
            parallaxFactor: 0.5,
            // 绘制背景
            draw: function (context, map) {
                if (!this.texture) return;

                // 计算背景偏移量（视差效果）
                const bgOffset = map.offsetX * this.parallaxFactor;

                // 计算需要绘制的背景图片数量
                const canvasWidth = map.game.canvasWidth;
                const repeatCount = Math.ceil(canvasWidth / this.width) + 2;

                // 计算第一张图的x位置
                const firstImageX = Math.floor(bgOffset / this.width) * this.width;

                // 绘制多张背景图片实现无限滚动
                for (let i = 0; i < repeatCount; i++) {
                    const x = firstImageX + (i * this.width) + (bgOffset % this.width);
                    context.drawImage(this.texture, x, 0, this.width, this.height);
                }
            }
        };

        // 添加地图到场景
        this.addElement(map)

        // 创建玩家
        let player = new Player(game, map)
        player.x = 112
        player.y = 100
        this.player = player

        // 将玩家添加到地图系统中，使摄像机能够跟随玩家
        map.setPlayer(player)

        this.addElement(player)

        // 创建敌人
        let enemy = new Enemy(game, this)
        this.enemy = enemy
        enemy.x = 500
        enemy.y = 354
        // 将敌人也关联到地图系统中
        enemy.map = map
        this.addElement(enemy)

        // 添加伤害冷却时间
        this.damageCooldown = 0
        this.damageCooldownTime = 30 // 30帧的冷却时间

        // 创建调试模块
        this.debugModule = new DebugModule(game)

        this.setupInputs()
    }

    update() {
        super.update();
        // 如果玩家已经死亡，不再更新场景
        if (this.player.isDead) {
            return
        }

        // 更新伤害冷却时间
        if (this.damageCooldown > 0) {
            this.damageCooldown--
        }

        // 获取玩家和敌人的世界坐标位置
        // 要使用真实世界坐标进行碰撞检测，而不是屏幕坐标
        const playerX = this.player.x;
        const playerY = this.player.y;
        const enemyX = this.enemy.x;
        const enemyY = this.enemy.y;

        // 检查x轴和y轴的碰撞情况 - 基于世界坐标
        const xCollision = !(enemyX + this.enemy.w - this.player.w / 2 < playerX ||
            enemyX > playerX + this.player.w - this.player.w / 2);

        // y轴碰撞检测逻辑改进
        // 1. 定义y轴接近阈值 - 敌人会在这个范围内追踪玩家
        const yProximityThreshold = 150;
        // 2. 定义y轴攻击阈值 - 只有在这个范围内才会实际攻击
        const yAttackThreshold = 40;

        // 检查y轴距离
        const yDistance = Math.abs(playerY - enemyY);
        const yProximity = yDistance < yProximityThreshold;
        const yAttackRange = yDistance < yAttackThreshold;

        // 敌人和玩家的碰撞检测
        const canAttack = xCollision && yAttackRange;

        // 敌人的移动和攻击逻辑
        if (!canAttack) {
            // 如果不能攻击，则尝试接近玩家
            if (yProximity) {
                // 如果垂直距离很近，敌人会追踪玩家的x位置
                // 注意：这里要使用世界坐标，而不是屏幕坐标
                if (enemyX > playerX) {
                    this.enemy.move(-3)
                } else {
                    this.enemy.move(3)
                }
            } else {
                // 如果玩家在敌人非常远的上方或下方，敌人会保持站立不动
                // 或者可以让敌人巡逻或执行其他行为
            }
            this.enemy.isAttack = false;
        } else {
            // 可以攻击则进行攻击
            this.enemy.attackEvent()

            // 检查玩家是否被敌人攻击，并且伤害冷却时间已过
            if (this.damageCooldown === 0) {
                if (this.enemy.isAttack) {
                    this.player.takeDamage(10) // 被攻击时扣除10点血量
                } else {
                    // 如果只是接触但没有被攻击，扣除5点血量
                    this.player.takeDamage(5)
                }
                // 设置伤害冷却时间
                this.damageCooldown = this.damageCooldownTime
            }
        }
    }

    setupInputs() {
        let self = this
        let playerSpeed = 5

        self.game.registerAction('a', (keyStatus) => {
            // 简化移动逻辑，直接调用移动方法
            this.player.move(-playerSpeed, keyStatus);
        })

        self.game.registerAction('d', (keyStatus) => {
            // 简化移动逻辑，直接调用移动方法
            this.player.move(playerSpeed, keyStatus);
        })

        self.game.registerAction('j', (keyStatus) => {
            this.player.attack(this.enemy, keyStatus)
        })

        self.game.registerAction('k', (keyStatus) => {
            this.player.jump(keyStatus)
        })

        // 按p键切换调试信息显示
        let debugToggled = false
        self.game.registerAction('p', (keyStatus) => {
            if (keyStatus === 'down' && !debugToggled) {
                debugToggled = true
                this.debugModule.enabled = !this.debugModule.enabled
                console.log('调试信息显示:', this.debugModule.enabled ? '开启' : '关闭')
            } else if (keyStatus === 'up') {
                debugToggled = false
            }
        })

        // 添加手动控制地图滚动的按键(用于调试)
        self.game.registerAction('z', (keyStatus) => {
            if (keyStatus === 'down') {
                // 手动向左滚动地图
                this.map.offsetX += 10
                console.log('手动向左滚动地图:', this.map.offsetX)
            }
        })

        self.game.registerAction('x', (keyStatus) => {
            if (keyStatus === 'down') {
                // 手动向右滚动地图
                this.map.offsetX -= 10
                console.log('手动向右滚动地图:', this.map.offsetX)
            }
        })

        // 添加重置位置的功能
        self.game.registerAction('r', (keyStatus) => {
            if (keyStatus === 'down') {
                // 重置玩家位置和地图偏移
                this.player.x = 112
                this.player.y = 100
                this.map.offsetX = 0
                console.log('重置玩家位置和地图偏移')
            }
        })
    }

    // 在场景绘制完成后调用调试模块绘制
    draw() {
        // 背景需要先绘制
        this.backgroundSystem.draw(this.game.context, this.map);

        // 然后调用基类的绘制方法（绘制地图和角色）
        super.draw()

        // 绘制调试信息
        if (this.debugModule) {
            // 绘制地图碰撞
            this.debugModule.drawMapCollision(this.map)

            // 绘制玩家碰撞
            this.debugModule.drawPlayerCollision(this.player)

            // 绘制摄像机调试信息
            this.debugModule.drawCameraDebug(this.map)
        }
    }
}