/**
 * 玩家类
 * 处理玩家的移动、跳跃、攻击等行为
 */
import Phaser from 'phaser';
import {
    PLAYER_CONFIG,
    CONTROLS,
    // DEPTH, // Unused
} from '../utils/Constants';
import { WeaponBase } from '../combat/WeaponBase';
import { WeaponFactory } from '../combat/WeaponFactory';

/** 场景需要提供 playerEnemyCollider 以支持冲刺穿越 */
interface SceneWithCollider extends Phaser.Scene {
    playerEnemyCollider?: Phaser.Physics.Arcade.Collider;
}

// 玩家状态枚举
export enum PlayerState {
    IDLE = 'idle',
    RUN = 'run',
    JUMP = 'jump',
    ATTACK = 'attack',
    HURT = 'hurt',
}

export class Player extends Phaser.Physics.Arcade.Sprite {
    // 生命值
    public health: number;
    public maxHealth: number;

    // 攻击属性
    public attackDamage: number;
    public criticalChance: number; // 暴击率
    public criticalMultiplier: number; // 暴击伤害倍率

    // 移动速度（可被升级加成修改）
    public moveSpeed: number;
    // 冲刺冷却（可被升级加成修改）
    public dashCooldownTime: number;

    // 武器（策略模式）
    public weapon: WeaponBase;

    // 受击硬直状态
    private isStunned: boolean = false;

    // 无敌状态
    public isInvincible: boolean = false;

    // 当前状态
    private currentState: PlayerState = PlayerState.IDLE;

    // 面向方向 (1: 右, -1: 左)
    // private facingDirection: number = 1; // Unused

    // 输入按键
    private keys!: {
        left: Phaser.Input.Keyboard.Key;
        right: Phaser.Input.Keyboard.Key;
        jump: Phaser.Input.Keyboard.Key;
        attack: Phaser.Input.Keyboard.Key;
        dash: Phaser.Input.Keyboard.Key;
        weaponSkill: Phaser.Input.Keyboard.Key;
    };

    // 冲刺状态
    private isDashing: boolean = false;
    private canDash: boolean = true;
    private dashDirection: number = 1;

    // 命中连击计数（用于 UI 显示，仅在实际命中敌人时递增）
    public hitComboCount: number = 0;
    private lastHitTime: number = 0;
    private readonly HIT_COMBO_WINDOW: number = 1500; // 连击重置窗口
    private comboResetTimer?: Phaser.Time.TimerEvent;

    // 输入缓冲（攻击动画期间按下J，动画结束后自动触发）
    private bufferedAttack: boolean = false;
    private bufferedAttackTime: number = 0;
    private readonly ATTACK_BUFFER_WINDOW: number = 200; // ms

    // 调试模式
    private debugGraphics?: Phaser.GameObjects.Graphics;
    private debugText?: Phaser.GameObjects.Text;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, 'player-idle-0');

        // 初始化属性
        this.health = PLAYER_CONFIG.maxHealth;
        this.maxHealth = PLAYER_CONFIG.maxHealth;
        this.attackDamage = PLAYER_CONFIG.attackDamage;
        this.criticalChance = PLAYER_CONFIG.criticalChance;
        this.criticalMultiplier = PLAYER_CONFIG.criticalMultiplier;
        this.moveSpeed = PLAYER_CONFIG.speed;
        this.dashCooldownTime = PLAYER_CONFIG.dashCooldown;

        // 添加到场景
        scene.add.existing(this);
        scene.physics.add.existing(this);

        // 设置物理属性
        this.setCollideWorldBounds(true);
        this.setBounce(0);
        this.setDrag(500, 0);

        // 设置缩放（使用配置中的值）
        this.setScale(PLAYER_CONFIG.scale);

        // 设置碰撞体积（基于100*75的素材比例）
        this.setSize(
            PLAYER_CONFIG.collisionWidth,
            PLAYER_CONFIG.collisionHeight,
        );
        this.setOffset(PLAYER_CONFIG.offsetX, PLAYER_CONFIG.offsetY);

        // 设置不可推动（防止被敌人推着走）
        (this.body as Phaser.Physics.Arcade.Body).pushable = false;

        // 初始化武器（默认：裂空剑）
        this.weapon = WeaponFactory.create('sword', scene, this);

        // 初始化输入
        this.setupInput(scene);

        // 播放待机动画
        this.play('player-idle');
    }

    /**
     * 设置输入按键
     */
    private setupInput(scene: Phaser.Scene): void {
        const keyboard = scene.input.keyboard;
        if (!keyboard) return;

        this.keys = {
            left: keyboard.addKey(CONTROLS.LEFT),
            right: keyboard.addKey(CONTROLS.RIGHT),
            jump: keyboard.addKey(CONTROLS.JUMP),
            attack: keyboard.addKey(CONTROLS.ATTACK),
            dash: keyboard.addKey(CONTROLS.DASH),
            weaponSkill: keyboard.addKey(CONTROLS.WEAPON_SKILL),
        };
    }

    /**
     * 应用永久升级加成
     * 在 RunScene.create() 中创建玩家后调用
     */
    public applyUpgradeBonuses(bonuses: {
        maxHealth: number;
        attackDamage: number;
        speed: number;
        critChance: number;
        dashCooldown: number;
    }): void {
        if (bonuses.maxHealth > 0) {
            this.maxHealth += bonuses.maxHealth;
            this.health = this.maxHealth;
        }
        if (bonuses.attackDamage > 0) {
            this.attackDamage += bonuses.attackDamage;
        }
        if (bonuses.speed > 0) {
            this.moveSpeed += bonuses.speed;
        }
        if (bonuses.critChance > 0) {
            this.criticalChance += bonuses.critChance;
        }
        if (bonuses.dashCooldown > 0) {
            this.dashCooldownTime = Math.max(200, this.dashCooldownTime - bonuses.dashCooldown);
        }
        // 通知UI更新血量
        this.scene.events.emit('player-health-changed', this.health, this.maxHealth);
        console.log(`[Player] 升级加成: HP+${bonuses.maxHealth}, ATK+${bonuses.attackDamage}, SPD+${bonuses.speed}, CRIT+${(bonuses.critChance * 100).toFixed(0)}%, DASH-${bonuses.dashCooldown}ms`);
    }

    /** 回复生命值 */
    public heal(amount: number): void {
        this.health = Math.min(this.health + amount, this.maxHealth);
        this.scene.events.emit('player-health-changed', this.health, this.maxHealth);
    }

    /**
     * 受到攻击/击退
     * @param direction 击退方向 (1 或 -1)
     */
    public hit(direction: number): void {
        if (this.isInvincible) return;

        this.currentState = PlayerState.HURT;
        // 无敌状态在 takeDamage 里设置，或者这里
        // 这里主要处理物理和视觉

        const body = this.body as Phaser.Physics.Arcade.Body;
        body.setVelocityX(direction * PLAYER_CONFIG.knockbackForce);
        body.setVelocityY(-200); // 给一点向上的力，避免地面摩擦

        // 变红反馈
        this.setTint(0xff0000);

        // 播放受伤动画（如果没有专用动画，暂停在当前帧或播放特定帧）
        // 这里我们要防止它切回 run/idle

        this.scene.time.delayedCall(300, () => {
            this.clearTint();
            // 恢复控制
            if (this.health > 0) {
                this.currentState = PlayerState.IDLE;
            }
        });
    }

    /**
     * 命中敌人时调用 —— 更新命中连击数并通知 UI
     * 与按键动画连击（comboCount）分离，只在实际打到敌人时才计数
     */
    public registerHit(): void {
        const now = this.scene.time.now;

        if (now - this.lastHitTime > this.HIT_COMBO_WINDOW) {
            this.hitComboCount = 1; // 超时：新连击从 1 开始
        } else {
            this.hitComboCount++;
        }

        this.lastHitTime = now;
        this.scene.events.emit('combo-count-changed', this.hitComboCount);

        // 重置计时器：若超过窗口无新命中则归零（UI 自动淡出由 UIScene 处理）
        if (this.comboResetTimer) {
            this.comboResetTimer.remove(false);
        }
        this.comboResetTimer = this.scene.time.delayedCall(
            this.HIT_COMBO_WINDOW,
            () => {
                this.hitComboCount = 0;
                this.comboResetTimer = undefined;
            },
        );
    }

    /**
     * 获取当前攻击伤害（委托给武器）
     */
    public getCurrentDamage(): number {
        return this.weapon.getCurrentDamage();
    }

    /**
     * 每帧更新
     */
    update(_time: number, _delta: number): void {
        // 每帧更新武器（如 BowWeapon 的投射物清理）
        this.weapon.update(_time, _delta);

        // 处理冲刺输入（冲刺优先级最高）
        if (Phaser.Input.Keyboard.JustDown(this.keys.dash)) {
            this.handleDash();
        }

        // 如果正在冲刺，不处理其他输入
        if (this.isDashing) return;

        // 捕获攻击输入缓冲（即使在攻击动画期间也要捕获）
        if (Phaser.Input.Keyboard.JustDown(this.keys.attack)) {
            this.bufferedAttack = true;
            this.bufferedAttackTime = this.scene.time.now;
        }

        // 如果正在攻击或受伤，不处理移动
        if (this.weapon.isAttacking || this.currentState === PlayerState.HURT) return;

        // 处理移动输入
        this.handleMovement();

        // 处理跳跃输入
        this.handleJump();

        // 处理攻击输入（含缓冲）
        this.handleAttack();

        // 处理武器技能输入
        this.handleWeaponSkill();

        // 更新动画状态
        this.updateAnimation();
    }

    /**
     * 处理移动
     */
    private handleMovement(): void {
        // 受击硬直时不处理移动，让击退效果完整
        if (this.isStunned) return;

        const body = this.body as Phaser.Physics.Arcade.Body;

        if (this.keys.left.isDown) {
            body.setVelocityX(-this.moveSpeed);
            // this.facingDirection = -1; // Unused
            this.setFlipX(true);
        } else if (this.keys.right.isDown) {
            body.setVelocityX(this.moveSpeed);
            // this.facingDirection = 1; // Unused
            this.setFlipX(false);
        } else {
            body.setVelocityX(0);
        }
    }

    /**
     * 处理跳跃（可变高度：短按 = 小跳，长按 = 满跳）
     */
    private handleJump(): void {
        const body = this.body as Phaser.Physics.Arcade.Body;

        if (Phaser.Input.Keyboard.JustDown(this.keys.jump) && body.onFloor()) {
            body.setVelocityY(-PLAYER_CONFIG.jumpForce);
            this.currentState = PlayerState.JUMP;
        }

        // 松开跳跃键时，如果仍在上升阶段则削减速度（实现小跳）
        if (Phaser.Input.Keyboard.JustUp(this.keys.jump) && body.velocity.y < 0) {
            body.setVelocityY(body.velocity.y * 0.5);
        }
    }

    /**
     * 处理攻击（支持输入缓冲，委托给武器）
     */
    private handleAttack(): void {
        // 清除超时的缓冲输入
        if (
            this.bufferedAttack &&
            this.scene.time.now - this.bufferedAttackTime > this.ATTACK_BUFFER_WINDOW
        ) {
            this.bufferedAttack = false;
        }

        const shouldAttack =
            this.bufferedAttack ||
            Phaser.Input.Keyboard.JustDown(this.keys.attack);

        if (shouldAttack && !this.weapon.isAttacking) {
            this.bufferedAttack = false;
            this.weapon.attack();
            this.currentState = PlayerState.ATTACK;
        }
    }

    /**
     * 处理武器技能（U键）
     */
    private handleWeaponSkill(): void {
        if (Phaser.Input.Keyboard.JustDown(this.keys.weaponSkill)) {
            if (!this.weapon.isSkillReady()) return;
            this.weapon.skill();
            this.currentState = PlayerState.ATTACK;
        }
    }

    /**
     * 更新动画状态
     */
    private updateAnimation(): void {
        if (this.weapon.isAttacking || this.currentState === PlayerState.HURT) return;

        const body = this.body as Phaser.Physics.Arcade.Body;
        const isMoving = Math.abs(body.velocity.x) > 10;
        const isOnFloor = body.onFloor();

        if (!isOnFloor) {
            // 空中状态
            if (this.currentState !== PlayerState.JUMP) {
                this.currentState = PlayerState.JUMP;
                this.play('player-jump', true);
            }
        } else if (isMoving) {
            // 移动状态
            if (this.currentState !== PlayerState.RUN) {
                this.currentState = PlayerState.RUN;
                this.play('player-run', true);
            }
        } else {
            // 待机状态
            if (this.currentState !== PlayerState.IDLE) {
                this.currentState = PlayerState.IDLE;
                this.play('player-idle', true);
            }
        }
    }

    /**
     * 踩头反弹
     */
    public bounce(): void {
        const body = this.body as Phaser.Physics.Arcade.Body;
        body.setVelocityY(-PLAYER_CONFIG.jumpForce * 0.8); // 弹跳力
        this.currentState = PlayerState.JUMP;
        this.play('player-jump', true);
    }

    /**
     * 装备新武器（策略替换）
     * @param weaponOrId  WeaponBase 实例 或 武器ID字符串（如 'sword'、'fists'、'bow'）
     */
    public equipWeapon(weaponOrId: WeaponBase | string): void {
        this.weapon.interruptAttack();
        if (typeof weaponOrId === 'string') {
            this.weapon = WeaponFactory.create(weaponOrId, this.scene, this);
        } else {
            this.weapon = weaponOrId;
        }
    }

    /**
     * 受到伤害
     */
    public takeDamage(damage: number, knockbackDir: number = 0): void {
        console.log('[Player] takeDamage called:', {
            damage,
            knockbackDir,
            isInvincible: this.isInvincible,
            currentHealth: this.health,
        });

        if (this.isInvincible) {
            console.log('[Player] Invincible, damage ignored');
            return;
        }

        this.health -= damage;
        console.log(
            '[Player] Health after damage:',
            this.health,
            '/',
            this.maxHealth,
        );

        // 发送血量变化事件
        this.scene.events.emit(
            'player-health-changed',
            this.health,
            this.maxHealth,
        );

        if (this.health <= 0) {
            this.die();
            return;
        }

        // 进入无敌状态（不改变currentState，让玩家继续操作）
        this.isInvincible = true;
        // ❌ 删除：this.currentState = PlayerState.HURT;

        // 击退效果
        if (knockbackDir !== 0) {
            const body = this.body as Phaser.Physics.Arcade.Body;

            // 设置击退
            body.setVelocityX(knockbackDir * PLAYER_CONFIG.knockbackForce);
            body.setVelocityY(-80); // 减少向上力度

            // 进入硬直状态，防止移动输入覆盖击退
            this.isStunned = true;
            this.scene.time.delayedCall(300, () => {
                this.isStunned = false;
            });
        }

        // 变红
        this.setTint(0xff0000);

        // 闪烁效果（增加持续时间，防止夹击卡死）
        this.scene.tweens.add({
            targets: this,
            alpha: { from: 0.5, to: 1 },
            duration: 100,
            repeat: 9, // 闪烁10次，持续1秒
            onComplete: () => {
                this.isInvincible = false;
                this.clearTint();
                this.setAlpha(1); // 确保完全不透明
                // 不修改状态，让update逻辑继续处理
            },
        });
    }

    /**
     * 玩家死亡
     */
    private die(): void {
        this.health = 0;
        this.setTint(0xff0000);

        // 禁用物理
        (this.body as Phaser.Physics.Arcade.Body).enable = false;

        // 发送死亡事件
        this.scene.events.emit('player-died');
    }

    /**
     * 启用调试模式
     */
    public enableDebug(): void {
        if (!this.debugGraphics) {
            this.debugGraphics = this.scene.add.graphics();
            this.debugGraphics.setDepth(1000);
        }
        if (!this.debugText) {
            this.debugText = this.scene.add.text(0, 0, '', {
                fontSize: '12px',
                color: '#00ff00',
                backgroundColor: '#000000',
                padding: { x: 4, y: 2 },
            });
            this.debugText.setDepth(1001);
        }
    }

    /**
     * 禁用调试模式
     */
    public disableDebug(): void {
        if (this.debugGraphics) {
            this.debugGraphics.destroy();
            this.debugGraphics = undefined;
        }
        if (this.debugText) {
            this.debugText.destroy();
            this.debugText = undefined;
        }
    }

    /**
     * 更新调试信息
     */
    public updateDebug(): void {
        if (!this.debugGraphics || !this.debugText) return;

        const body = this.body as Phaser.Physics.Arcade.Body;

        // 清除之前的绘制
        this.debugGraphics.clear();

        // 1. 绘制碰撞框（绿色）
        this.debugGraphics.lineStyle(2, 0x00ff00);
        this.debugGraphics.strokeRect(body.x, body.y, body.width, body.height);

        // 2. 绘制攻击范围（红色圆圈）
        if (this.weapon.isAttacking) {
            this.debugGraphics.lineStyle(2, 0xff0000);
            const attackX =
                this.x +
                (this.flipX
                    ? -PLAYER_CONFIG.attackRange
                    : PLAYER_CONFIG.attackRange);
            this.debugGraphics.strokeCircle(
                attackX,
                this.y,
                PLAYER_CONFIG.attackRange,
            );
        }

        // 3. 更新文本信息
        const debugInfo = [
            `状态: ${this.currentState}`,
            `血量: ${this.health}/${this.maxHealth}`,
            `坐标: (${Math.round(this.x)}, ${Math.round(this.y)})`,
            `速度: (${Math.round(body.velocity.x)}, ${Math.round(body.velocity.y)})`,
            `攻击中: ${this.weapon.isAttacking}`,
            `可造成伤害: ${this.weapon.canDealDamage}`,
        ];

        this.debugText.setText(debugInfo.join('\n'));
        this.debugText.setPosition(this.x - 50, this.y - 100);
        this.debugText.setVisible(true);
    }

    /**
     * 处理冲刺
     */
    private handleDash(): void {
        if (!this.canDash || this.isDashing) return;

        // 确定冲刺方向（优先使用当前面向，如果正在移动则使用移动方向）
        const body = this.body as Phaser.Physics.Arcade.Body;
        if (this.keys.left.isDown) {
            this.dashDirection = -1;
        } else if (this.keys.right.isDown) {
            this.dashDirection = 1;
        } else {
            // 使用当前面向
            this.dashDirection = this.flipX ? -1 : 1;
        }

        // 开始冲刺
        this.isDashing = true;
        this.canDash = false;
        this.isInvincible = true; // 冲刺期间无敌

        // 中断攻击状态 (修复冲刺导致重复伤害的 Bug)
        if (this.weapon.isAttacking) {
            console.log('[Dash] Interrupting attack');
            this.weapon.interruptAttack();
        }

        // 禁用与敌人的碰撞（穿越敌人）
        const sceneWithCollider = this.scene as SceneWithCollider;
        if (sceneWithCollider.playerEnemyCollider) {
            sceneWithCollider.playerEnemyCollider.active = false;
        }

        // 设置冲刺速度
        body.setVelocityX(PLAYER_CONFIG.dashSpeed * this.dashDirection);

        console.log('[Dash] 开始冲刺，方向:', this.dashDirection);

        // 视觉效果：设置半透明
        this.setAlpha(0.6);

        // 冲刺持续时间后结束
        this.scene.time.delayedCall(PLAYER_CONFIG.dashDuration, () => {
            this.isDashing = false;
            this.isInvincible = false;
            this.setAlpha(1.0);

            // 恢复与敌人的碰撞
            if (sceneWithCollider.playerEnemyCollider) {
                sceneWithCollider.playerEnemyCollider.active = true;
            }

            console.log('[Dash] 冲刺结束');
        });

        // 冷却时间
        this.scene.time.delayedCall(this.dashCooldownTime, () => {
            this.canDash = true;
            console.log('[Dash] 冷却完成');
        });
    }
}
