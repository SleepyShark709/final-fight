class SceneTitle extends GameScene{
    constructor(game) {
        super(game);
        let startbg = new GameImage(game, 'startbg', 0, 0, 1024, 512)
        let label = new GameLabel(game, '按r开始游戏', 100, 190, "#ffffff")
        this.addElement(startbg)
        this.addElement(label)
        game.registerAction('r', (event) => {
            var s = new Scene(game)
            game.replaceScene(s)
        })
        if (window.isMobileTerminal === true) {
        }
    }
}