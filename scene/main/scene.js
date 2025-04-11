class Scene extends GameScene {
    constructor(game) {
        super(game);
        // 背景
        let bg = new GameImage(game, 'bg', 0, 0, 1024, 512)
        this.addElement(bg)
        let map = new GameTileMap(game)
        this.addElement(map)
        let player = new Player(game, map)
        player.x = 112
        player.y = 100
        this.player = player
        this.addElement(player, map)
        let enemy = new Enemy(game, this)
        this.enemy = enemy
        enemy.x = 500
        enemy.y = 354
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

        // 检查x轴和y轴的碰撞情况
        const xCollision = !(this.enemy.x + this.enemy.w - this.player.w / 2 < this.player.x || this.enemy.x > this.player.x + this.player.w - this.player.w / 2);

        // y轴碰撞检测逻辑改进
        // 1. 定义y轴接近阈值 - 敌人会在这个范围内追踪玩家
        const yProximityThreshold = 150;
        // 2. 定义y轴攻击阈值 - 只有在这个范围内才会实际攻击
        const yAttackThreshold = 40;

        // 检查y轴距离
        const yDistance = Math.abs(this.player.y - this.enemy.y);
        const yProximity = yDistance < yProximityThreshold;
        const yAttackRange = yDistance < yAttackThreshold;

        // 敌人和玩家的碰撞检测
        const canAttack = xCollision && yAttackRange;

        // 敌人的移动和攻击逻辑
        if (!canAttack) {
            // 如果不能攻击，则尝试接近玩家
            if (yProximity) {
                // 如果垂直距离很近，敌人会追踪玩家的x位置
                if (this.enemy.x > this.player.x) {
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
            this.player.move(-playerSpeed, keyStatus)
        })
        self.game.registerAction('d', (keyStatus) => {
            this.player.move(playerSpeed, keyStatus)
        })
        self.game.registerAction('j', (keyStatus) => {
            this.player.attack(this.enemy, keyStatus)
        })
        self.game.registerAction('k', (keyStatus) => {
            this.player.jump(keyStatus)
        })
    }

    // 在场景绘制完成后调用调试模块绘制
    draw() {
        // 先调用基类的绘制方法
        super.draw()

        // 绘制调试信息
        if (this.debugModule) {
            // 绘制地图碰撞
            this.debugModule.drawMapCollision(this.elements[1]) // 假设map是第二个元素

            // 绘制玩家碰撞
            this.debugModule.drawPlayerCollision(this.player)
        }
    }
}