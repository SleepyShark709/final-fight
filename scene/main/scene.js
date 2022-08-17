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
        this.setupInputs()
    }
    update() {
        super.update();
    }

    setupInputs() {
        let self = this
        self.game.registerAction('a', () => {
            this.player.move(-10)
        })
        self.game.registerAction('d', () => {
            this.player.move(10)
        })
    }
}
