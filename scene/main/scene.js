class Scene extends GameScene{
    constructor(game) {
        super(game);
        // 背景
        let bg = new GameImage(game, 'bg', 0, 0, 1024, 512)
        this.addElement(bg)
        let player = new Player(game, this)
        player.x = 112
        player.y = 385
        this.player = player
        this.addElement(player)
        let enemy = new Enemy(game, this)
        this.enemy = enemy
        enemy.x = 500
        enemy.y = 364
        this.addElement(enemy)
        this.setupInputs()
    }
    update() {
        super.update();
        // if (this.enemy.x > this.player.x) {
        //     this.enemy.move(-3)
        // } else {
        //     this.enemy.move(3)
        // }
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
            this.player.attack(this.enemy, this)
        })
        self.game.registerAction('k', () => {
            this.player.jump()
        })
    }
}
