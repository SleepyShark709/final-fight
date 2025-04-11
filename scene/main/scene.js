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

        if (this.enemy.x + this.enemy.w - this.player.w / 2 < this.player.x || this.enemy.x > this.player.x + this.player.w - this.player.w / 2) {
            // 玩家和敌人没有碰撞的时候，敌人去自动寻找玩家
            if (this.enemy.x > this.player.x) {
                this.enemy.move(-3)
            } else {
                this.enemy.move(3)
            }
            this.enemy.isAttack = false
        } else {
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
}