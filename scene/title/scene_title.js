class SceneTitle extends GameScene{
    constructor(game) {
        super(game);
        let label = new GameLabel(game, '按k开始游戏', 100, 190)
        this.addElement(label)
        game.registerAction('k', (event) => {
            console.log('click')
            var s = new Scene(game)
            game.replaceScene(s)
        })
    }
}