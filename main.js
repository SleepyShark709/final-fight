
const __main = () => {

    // 这个地方是加了一个滑动条来控制帧率
    let input = document.querySelector('#id-input-speed')
    let zhen = document.querySelector('.zhen')
    let fps = FPS
    input.value = FPS
    input.addEventListener('input', (event) => {
        let input = event.target
        fps = Number(input.value)
        zhen.innerHTML = `帧率（${fps}）`
        window.fps = fps
    })


    var images = {
        bg: 'image/bg.png',
        startbg: 'image/startbg.png',
    }
    let playerImages = new PlayerImages().images
    let enemyImages = new EnemyImages().images
    let mapImages = new MapImages().images

    images = Object.assign(images, playerImages)
    images = Object.assign(images, enemyImages)
    images = Object.assign(images, mapImages)

    var game = new Game(FPS, images, function(g) {
        // var s = SceneTitle.new(g)
        var s = SceneTitle.new(g)
        g.runWithScene(s)
    })
}
__main()
