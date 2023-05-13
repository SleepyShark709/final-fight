class GameScene {
    constructor(game) {
        this.game = game
        this.elements = []
    }
    static new(game) {
        var i = new this(game)
        return i
    }
    addElement(img) {
        img.scene = this
        this.elements.push(img)
    }
    popElement() {
        this.elements.pop()
    }
    deleteElement(element) {
        // 找到要删除的类
        let index = this.elements.indexOf(element)
        if (index > 0) {
            // 如果找到了则删除
            this.elements.splice(index, 1)
        }
    }
    draw() {
        for (let i = 0; i < this.elements.length; i++) {
            let e = this.elements[i]
            e.draw()
        }
    }
    update() {
        for (let i = 0; i < this.elements.length; i++) {
            let e = this.elements[i]
            e.update()
        }
    }
}