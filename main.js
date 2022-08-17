const __main = () => {
    // 这个地方是加了一个滑动条来控制帧率
    let input = document.querySelector('#id-input-speed')
    input.addEventListener('input', (event) => {
        let input = event.target
        window.fps = Number(input.value)
    })
    var images = {
        // pipe: 'image/pipe.png',
        bg: 'image/bg.png',
        // b1: 'image/bird0.png',
        // b2: 'image/bird1.png',
        // b3: 'image/bird2.png',
        idle0: 'image/idle-sword/0.png',
        idle1: 'image/idle-sword/1.png',
        idle2: 'image/idle-sword/2.png',
        idle3: 'image/idle-sword/3.png',
        // land: 'image/land.png',
        // f0: 'image/f0.png',
        // f1: 'image/f1.png',
        // f2: 'image/f2.png',
        // f3: 'image/f3.png',
        // f4: 'image/f4.png',
        // f5: 'image/f5.png',
        // f6: 'image/f6.png',
        // f7: 'image/f7.png',
        // f8: 'image/f8.png',
        // f9: 'image/f9.png',
    }

    var game = new Game(30, images, function(g) {
        // var s = SceneTitle.new(g)
        var s = SceneTitle.new(g)
        g.runWithScene(s)
    })
}
__main()
