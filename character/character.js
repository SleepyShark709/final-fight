// 角色
class Character {
    constructor(game) {
        this.game = game
        this.frames = [] // 要展示的动画
        this.runFrames = [] // 奔跑时的 frame
        this.flipX = false
        this.isJump = false
        this.isMoving = false
        this.isDie = false // 是否死亡
        this.defaultLocation = 'right' // 默认朝向
        this.cooldown = COOL_DOWN // 攻击的冷却时间，不能让用户按住攻击键不松手一直进行攻击
        this.movingDirection = 'left' // 默认前进方向
        this.isAttack = false // 是否在攻击
        this.tileSize = 32
        this.map = new GameTileMap(game)
        this.isBlockOnFrount = false // 前方是否为 tiles
    }

    static new (game) {
        return new this(game)
    }

    delete(element) {
        this.game.deleteImage(element)
    }

    update() {
        // 如果当前没有移动，则更改 frame 为闲置状态
        if (this.isMoving === false && this.isAttack === false && this.isJump === false) {
            this.frames = this.idleFrame
        }
        this.isMoving = false
        this.w = this.texture.width // 图片宽
        this.h = this.texture.height // 图片高
    }
    draw () {
        let context = this.game.context
        context.save()
        let w2 = this.w / 2
        let h2 = this.h / 2
        context.translate(this.x + w2, this.y + h2)
        if (this.flipX) {
            context.scale(-1, 1)
        }
        context.translate(-w2,  -h2)
        if (this.isPlayer) {
            // 他妈的，因为玩家和敌人的图片大小不一致，玩家图太几小了，所以要放大
            this.texture && context.drawImage(this.texture, 0, 0, 96, 64)
        } else {
            this.texture && context.drawImage(this.texture, 0, 0)
        }
        context.restore()
    }

    move(x) {
        if (this.isDie === false) {
            // 在移动的时候更换动作
            this.isMoving = true
            // 移动前要判断前方的是否为砖块，如果为砖块，则不允许人物进行移动（x不改变）
            // 获取玩家当前坐标，并根据前进的方向拿到前后砖块的坐标
            // 拿到角色在地图中的坐标 i j
            let i = 0
            if (x < 0) {
                // 向左移动
                i = Math.floor(this.x / this.tileSize)
                this.movingDirection = 'left'
            } else {
                i = Math.floor(this.x / this.tileSize) + 2
                this.movingDirection = 'right'
            }
            let j = Math.floor(this.y / this.tileSize) + 1
            let onTheGround = this.map.onTheGround(i, j)
            if (!onTheGround) {
                this.x += x //  设置当前人物的 x 轴坐标
                this.isBlockOnFrount = false
            } else {
                this.isBlockOnFrount = true
            }
            // console.log('onTheGround', onTheGround)

            this.flipX = this.defaultLocation === 'right' ? x < 0 : this.defaultLocation === 'left' ? x > 0 : false; // 设置反转
            if (this.isJump === false && this.isAttack === false) {
                this.frames = this.runFrames // 设置奔跑的 frame
            }
        }
    }
}