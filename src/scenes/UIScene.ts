/**
 * UI 场景
 * 覆盖在游戏场景之上，显示血条、背包等 UI 元素
 */
import Phaser from 'phaser';
import {
    SCENES,
    GAME_WIDTH,
    GAME_HEIGHT,
    DEPTH,
    CONTROLS,
} from '../utils/Constants';
import { HealthBar } from '../ui/HealthBar';
import { Inventory } from '../ui/Inventory';
import { Player } from '../entities/Player';

export class UIScene extends Phaser.Scene {
    // 血条组件
    private healthBar!: HealthBar;

    // 背包组件
    private inventory!: Inventory;

    // 暂停菜单容器
    private pauseMenu!: Phaser.GameObjects.Container;

    // 连击计数器
    private comboContainer!: Phaser.GameObjects.Container;
    private comboCountText!: Phaser.GameObjects.Text;
    private comboLabelText!: Phaser.GameObjects.Text;
    private comboHideTimer?: Phaser.Time.TimerEvent;

    // 玩家引用
    private player!: Player;

    constructor() {
        super({ key: SCENES.UI });
    }

    create(data?: { parentScene?: string }): void {
        // 创建血条
        this.healthBar = new HealthBar(this, 20, 20, 200, 20);

        // 创建背包
        this.inventory = new Inventory(this);
        this.inventory.hide();

        // 创建暂停菜单
        this.createPauseMenu();

        // 创建连击计数器
        this.createComboCounter();

        // 获取父场景（支持 GameScene 和 RunScene）
        const parentSceneKey = data?.parentScene || SCENES.GAME;
        const gameScene = this.scene.get(parentSceneKey) as any;

        // 先尝试直接获取player
        if (gameScene?.player) {
            this.player = gameScene.player;
            this.healthBar.update(this.player.health, this.player.maxHealth);
        }

        // 也监听事件（以防顺序问题）
        gameScene?.events.on('player-created', (player: Player) => {
            this.player = player;
            this.healthBar.update(this.player.health, this.player.maxHealth);
        });

        // 监听连击事件
        gameScene?.events.on('combo-count-changed', (count: number) => {
            this.showCombo(count);
        });

        // 监听暂停事件
        this.events.on('show-pause-menu', () => {
            this.pauseMenu.setVisible(true);
        });

        this.events.on('hide-pause-menu', () => {
            this.pauseMenu.setVisible(false);
        });

        // 背包快捷键
        this.input.keyboard?.on(`keydown-${CONTROLS.INVENTORY}`, () => {
            this.inventory.toggle();
        });
    }

    /**
     * 创建连击计数器（右侧屏幕）
     */
    private createComboCounter(): void {
        const x = GAME_WIDTH - 80;
        const y = GAME_HEIGHT / 2 - 30;

        this.comboContainer = this.add.container(x, y);
        this.comboContainer.setDepth(DEPTH.UI + 5);
        this.comboContainer.setAlpha(0);

        // 连击数数字（大字）
        this.comboCountText = this.add.text(0, 0, '0', {
            fontSize: '52px',
            fontFamily: 'Arial Black, Arial',
            color: '#ffdd00',
            stroke: '#882200',
            strokeThickness: 6,
        });
        this.comboCountText.setOrigin(0.5);

        // "HIT" 标签（小字）
        this.comboLabelText = this.add.text(0, 36, 'HIT', {
            fontSize: '18px',
            fontFamily: 'Arial Black, Arial',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3,
        });
        this.comboLabelText.setOrigin(0.5);

        this.comboContainer.add([this.comboCountText, this.comboLabelText]);
    }

    /**
     * 显示连击数
     */
    private showCombo(count: number): void {
        // 更新数字
        this.comboCountText.setText(String(count));

        // 根据连击数变色
        if (count >= 5) {
            this.comboCountText.setColor('#ff4400');
        } else if (count >= 3) {
            this.comboCountText.setColor('#ff8800');
        } else {
            this.comboCountText.setColor('#ffdd00');
        }

        // 弹出动画
        this.comboContainer.setAlpha(1);
        this.comboContainer.setScale(1.3);
        this.tweens.add({
            targets: this.comboContainer,
            scaleX: 1,
            scaleY: 1,
            duration: 120,
            ease: 'Back.Out',
        });

        // 重置自动隐藏计时器
        if (this.comboHideTimer) {
            this.comboHideTimer.remove(false);
        }
        this.comboHideTimer = this.time.delayedCall(1800, () => {
            this.tweens.add({
                targets: this.comboContainer,
                alpha: 0,
                duration: 300,
            });
        });
    }

    /**
     * 创建暂停菜单
     */
    private createPauseMenu(): void {
        this.pauseMenu = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2);
        this.pauseMenu.setDepth(DEPTH.UI + 10);
        this.pauseMenu.setVisible(false);

        // 半透明黑色背景
        const overlay = this.add.graphics();
        overlay.fillStyle(0x000000, 0.7);
        overlay.fillRect(
            -GAME_WIDTH / 2,
            -GAME_HEIGHT / 2,
            GAME_WIDTH,
            GAME_HEIGHT,
        );

        // 暂停文字
        const pauseText = this.add.text(0, -50, '游戏暂停', {
            fontSize: '48px',
            fontFamily: 'Arial',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4,
        });
        pauseText.setOrigin(0.5);

        // 继续游戏提示
        const resumeText = this.add.text(0, 30, '按 ESC 继续游戏', {
            fontSize: '24px',
            fontFamily: 'Arial',
            color: '#aaaaaa',
        });
        resumeText.setOrigin(0.5);

        this.pauseMenu.add([overlay, pauseText, resumeText]);
    }

    /**
     * 每帧更新
     */
    update(): void {
        // 更新血条显示
        if (this.player) {
            this.healthBar.update(this.player.health, this.player.maxHealth);
        }
    }
}
