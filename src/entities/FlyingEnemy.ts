/**
 * 飞行敌人
 * 在空中漂浮，检测到玩家后俯冲攻击，攻击后返回高空
 * 外观：骷髅动画 + 紫色 tint + 小体型
 */
import Phaser from 'phaser';
import { Enemy, EnemyState } from './Enemy';
import { Player } from './Player';
import { ENEMY_CONFIG, ASSETS } from '../utils/Constants';

const CFG = ENEMY_CONFIG.flying;

// 飞行状态扩展
enum FlyState {
    FLOAT = 'float',   // 空中漂浮巡逻
    SWOOP = 'swoop',   // 俯冲攻击
    RETURN = 'return', // 返回高空
}

export class FlyingEnemy extends Enemy {
    private flyState: FlyState = FlyState.FLOAT;
    private floatY: number; // 悬浮的目标Y坐标
    private swoopTargetY: number = 0;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, `${ASSETS.ENEMY_SKELETON_IDLE}-0`, CFG);

        this.setScale(CFG.scale);
        this.setSize(CFG.collisionWidth, CFG.collisionHeight);
        this.setOffset(CFG.offsetX, CFG.offsetY);

        // 紫色 tint
        this.setTint(0xcc44ff);

        // 禁用重力（自行管理垂直运动）
        (this.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);

        // 目标悬浮高度（生成点上方 floatHeight 像素）
        this.floatY = y - CFG.floatHeight;

        this.play('skeleton-idle');
    }

    protected playAttackAnimation(): void {
        this.play('skeleton-attack', true);
    }

    protected updateAnimation(): void {
        if (this.isAttacking || this.isPreparing || this.isDead) return;

        const body = this.body as Phaser.Physics.Arcade.Body;
        const isMoving = Math.abs(body.velocity.x) > 5 || Math.abs(body.velocity.y) > 5;

        if (isMoving && this.anims.currentAnim?.key !== 'skeleton-walk') {
            this.play('skeleton-walk', true);
        } else if (!isMoving && this.anims.currentAnim?.key !== 'skeleton-idle') {
            this.play('skeleton-idle', true);
        }
    }

    /**
     * 重写 AI：飞行模式
     */
    protected updateAI(distanceToPlayer: number, player: Player): void {
        if (this.isAttacking || this.isPreparing || this.isStunned) return;

        const body = this.body as Phaser.Physics.Arcade.Body;

        // 取消父类的平台碰撞判断（飞行不需要在地面判断 isSamePlatform）

        switch (this.flyState) {
            case FlyState.FLOAT:
                this.maintainFloatHeight(body);

                if (distanceToPlayer <= CFG.detectRange) {
                    // 检测到玩家：追踪并朝向玩家
                    this.setFlipX(player.x < this.x);
                    this.currentState = EnemyState.CHASE;
                    // 水平追踪
                    const dir = player.x > this.x ? 1 : -1;
                    body.setVelocityX(dir * CFG.speed);

                    if (distanceToPlayer <= CFG.attackRange * 3 && this.canAttack) {
                        // 开始俯冲
                        this.startSwoop(player);
                    }
                } else {
                    this.currentState = EnemyState.PATROL;
                    this.patrol();
                    this.maintainFloatHeight(body);
                }
                break;

            case FlyState.SWOOP:
                // 俯冲中：向下冲
                body.setVelocityY(CFG.swoopSpeed);
                // 同时水平追踪
                {
                    const hDir = player.x > this.x ? 1 : -1;
                    body.setVelocityX(hDir * CFG.speed * 1.5);
                    this.setFlipX(player.x < this.x);

                    // 到达攻击位置时触发攻击
                    if (Math.abs(this.y - player.y) < 40) {
                        this.flyState = FlyState.RETURN;
                        this.attack(player);
                    }

                    // 防止俯冲过低
                    if (this.y > this.swoopTargetY + 80) {
                        this.flyState = FlyState.RETURN;
                    }
                }
                break;

            case FlyState.RETURN:
                // 返回高空
                this.maintainFloatHeight(body, true);
                if (Math.abs(this.y - this.floatY) < 20) {
                    this.flyState = FlyState.FLOAT;
                    body.setVelocityY(0);
                }
                break;
        }
    }

    /**
     * 维持悬浮高度（弹簧效果）
     */
    private maintainFloatHeight(body: Phaser.Physics.Arcade.Body, fast = false): void {
        const yDiff = this.floatY - this.y;
        const speed = fast ? 8 : 4;
        // 软性弹簧：离目标越远速度越快，上限 swoopSpeed
        body.setVelocityY(
            Phaser.Math.Clamp(yDiff * speed, -CFG.swoopSpeed, CFG.swoopSpeed),
        );
    }

    /**
     * 开始俯冲
     */
    private startSwoop(player: Player): void {
        this.flyState = FlyState.SWOOP;
        this.swoopTargetY = player.y;
        this.canAttack = false;

        // 俯冲冷却
        this.scene.time.delayedCall(CFG.attackCooldown, () => {
            this.canAttack = true;
        });
    }

    /**
     * 重写巡逻：空中水平来回
     */
    protected patrol(): void {
        const body = this.body as Phaser.Physics.Arcade.Body;

        if (this.x > this.patrolStartX + CFG.patrolRange) {
            this.patrolDirection = -1;
        } else if (this.x < this.patrolStartX - CFG.patrolRange) {
            this.patrolDirection = 1;
        }

        body.setVelocityX(CFG.speed * 0.4 * this.patrolDirection);
        this.setFlipX(this.patrolDirection < 0);
    }
}
