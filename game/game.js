class Game {
    constructor(fps, images, runCallback) {
        window.fps = fps
        this.images = images
        this.runCallback = runCallback
        this.scene = null
        this.actions = {}
        this.keydowns = {}
        this.canvas = document.querySelector('#id-canvas')
        this.context = this.canvas.getContext('2d')
        this.canvasWidth = this.canvas.clientWidth
        this.canvasHeight = this.canvas.clientHeight
        this.keyStatus = 'up'
        this.frameCount = 0
        window.addEventListener('keydown', (event) => {
            this.keydowns[event.key] = true
            this.keyStatus = 'down'
        })
        window.addEventListener('keyup', (event) => {
            this.keydowns[event.key] = false
            this.keyStatus = 'up'
        })
        this.init()
    }
    drawImage(Img, width, height) {
        //Img 是一个 GameImgae
        // LogGroup: default
        Img.texture && this.context.drawImage(Img.texture, Img.x, Img.y, width, height)
    }
    update() {
        this.scene.update()
    }
    draw() {
        this.scene.draw()
    }
    deleteImage(element) {
        this.scene.deleteElement(element)
    }
    registerAction = (key, callback) => {
        this.actions[key] = () => callback(this.keyStatus)
    }
    runLoop() {
        let g = this
        var actions = Object.keys(g.actions)
        for (let i = 0; i < actions.length; i++) {
            var key = actions[i]
            if (g.keydowns[key]) {
                g.actions[key]()
            }
        }

        this.frameCount++

        g.update()
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height)
        g.draw()
        setTimeout(() => {
            window.requestAnimationFrame(this.runLoop.bind(this))
        }, 1000 / window.fps)
    }
    textureByName(name) {
        let g = this
        var img = g.images[name]
        return img
    }
    runWithScene(scene) {
        let g = this
        g.scene = scene
        setTimeout(() => {
            this.runLoop()
        }, 1000 / window.fps)
    }
    replaceScene(scene) {
        this.scene = scene
    }
    __start() {
        this.runCallback(this)
    }
    init = () => {
        let g = this
        var loads = []
        var names = Object.keys(this.images)
        for (let i = 0; i < names.length; i++) {
            let name = names[i]
            var path = this.images[name]
            let img = new Image()
            img.src = path
            img.onload = function () {
                //存入g.images中
                g.images[name] = img
                // 所有图片都载入成功之后调用run
                loads.push(1)
                if (loads.length === names.length) {
                    g.__start()
                }
            }
        }
    }
}