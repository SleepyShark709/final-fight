class Scene extends GameScene{
    constructor(game) {
        super(game);
        // 背景
        let bg = new GameImage(game, 'bg', 0, 0, 1024, 512)
        this.addElement(bg)
        let player = new Player(game)
        player.x = 112
        player.y = 385
        this.player = player
        this.addElement(player)
        let enemy = new Enemy(game)
        this.enemy = enemy
        enemy.x = 500
        enemy.y = 364
        this.addElement(enemy)
        this.setupInputs()
    }
    update() {
        super.update();
        // 判断人物与敌人是否碰撞
        if ((reactIntersects(this.player, this.enemy) || reactIntersects(this.enemy, this.player))) {
            // 判断人物是否在攻击状态下
            if (this.player.isAttack === true) {
                // 开始攻击, 删除敌人 TODO 这里应该在攻击动画播放结束的时候删除敌人,现在定时器是一种 hack 的方案。不应该这么做
                setTimeout(() => {
                    this.deleteElement(this.enemy)
                }, 500)
            }
        }
    }

    setupInputs() {
        let self = this
        self.game.registerAction('a', () => {
            this.player.move(-5)
        })
        self.game.registerAction('d', () => {
            this.player.move(5)
        })
        self.game.registerAction('j', () => {
            this.player.attack()
        })
        self.game.registerAction('k', () => {
            this.player.jump()
        })
    }
}
