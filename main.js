const __main = () => {
    // 这个地方是加了一个滑动条来控制帧率
    let input = document.querySelector('#id-input-speed')
    input.addEventListener('input', (event) => {
        let input = event.target
        window.fps = Number(input.value)
    })
    var images = {
        bg: 'image/bg.png',
        run0: 'image/run/0.png',
        run1: 'image/run/1.png',
        run2: 'image/run/2.png',
        run3: 'image/run/3.png',
        run4: 'image/run/4.png',
        run5: 'image/run/5.png',
        idle0: 'image/idle-sword/0.png',
        idle1: 'image/idle-sword/1.png',
        idle2: 'image/idle-sword/2.png',
        idle3: 'image/idle-sword/3.png',
    }

    var game = new Game(30, images, function(g) {
        // var s = SceneTitle.new(g)
        var s = SceneTitle.new(g)
        g.runWithScene(s)
    })
}
__main()
