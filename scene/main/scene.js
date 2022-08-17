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
        enemy.x = 500
        enemy.y = 364
        this.addElement(enemy)
        this.setupInputs()
    }
    update() {
        super.update();
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
