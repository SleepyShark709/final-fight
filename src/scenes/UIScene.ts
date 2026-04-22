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
import { WeaponIndicator } from '../ui/WeaponIndicator';
import { BlessingTray } from '../ui/BlessingTray';

export class UIScene extends Phaser.Scene {
    // 血条组件
    private healthBar!: HealthBar;

    // 武器指示器
    private weaponIndicator?: WeaponIndicator;

    // 祝福托盘
    private blessingTray?: BlessingTray;

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

    private parentSceneKey?: string;

    create(data?: { parentScene?: string }): void {
        // 创建血条
        this.healthBar = new HealthBar(this, 52, 22, 200, 22);

        // 武器指示器（左下）
        this.weaponIndicator = new WeaponIndicator(this, 70, GAME_HEIGHT - 50);

        // 祝福托盘（顶部，血条右侧）
        this.blessingTray = new BlessingTray(this, 280, 36);

        // 创建背包
        this.inventory = new Inventory(this);

        // 创建暂停菜单
        this.createPauseMenu();

        // 创建连击计数器
        this.createComboCounter();

        // 获取父场景（支持 GameScene 和 RunScene）
        this.parentSceneKey = data?.parentScene || SCENES.GAME;
        const gameScene = this.scene.get(this.parentSceneKey) as any;

        // 先尝试直接获取player
        if (gameScene?.player) {
            this.player = gameScene.player;
            this.healthBar.update(this.player.health, this.player.maxHealth);
            this.weaponIndicator?.setPlayer(this.player);
        }

        // 也监听事件（以防顺序问题）
        gameScene?.events.on('player-created', (player: Player) => {
            this.player = player;
            this.healthBar.update(this.player.health, this.player.maxHealth);
            this.weaponIndicator?.setPlayer(this.player);
        });

        // 接入祝福管理器（RunScene 独有）
        if (gameScene && 'blessingManager' in gameScene) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            this.blessingTray?.setBlessingManager((gameScene as any).blessingManager);
            // 监听祝福选择，刷新 UI
            gameScene.events.on('blessing-selected', () => {
                this.blessingTray?.refresh();
            });
        }

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

        // 场景关闭时清理跨场景事件监听器
        this.events.on('shutdown', () => {
            gameScene?.events.off('player-created');
            gameScene?.events.off('combo-count-changed');
            this.input.keyboard?.removeAllListeners();
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
     * 创建暂停菜单（升级版：半透明背景 + 卡片式面板 + 操作提示）
     */
    private createPauseMenu(): void {
        this.pauseMenu = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2);
        this.pauseMenu.setDepth(DEPTH.UI + 10);
        this.pauseMenu.setVisible(false);

        // 半透明渐变背景
        const overlay = this.add.graphics();
        overlay.fillStyle(0x0a0a18, 0.82);
        overlay.fillRect(-GAME_WIDTH / 2, -GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT);

        // 中央卡片面板
        const cardW = 440;
        const cardH = 300;
        const panel = this.add.graphics();
        panel.fillStyle(0x1b1e2a, 0.95);
        panel.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 12);
        panel.lineStyle(3, 0x5a6dd0, 0.8);
        panel.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 12);
        // 顶部装饰线
        panel.fillStyle(0x7389ea, 0.9);
        panel.fillRect(-cardW / 2 + 30, -cardH / 2 + 24, cardW - 60, 2);

        // 暂停标题
        const pauseText = this.add.text(0, -cardH / 2 + 50, '⏸  游戏暂停', {
            fontSize: '36px',
            fontFamily: 'Arial Black, Arial',
            color: '#e8ebff',
            stroke: '#1b1e2a',
            strokeThickness: 4,
        });
        pauseText.setOrigin(0.5);

        // 分隔
        const divider = this.add.graphics();
        divider.fillStyle(0x44486a, 0.6);
        divider.fillRect(-cardW / 2 + 60, -cardH / 2 + 96, cardW - 120, 1);

        // 操作说明
        const hints = [
            '[ESC]     继续游戏',
            '[C]        属性面板',
            '[I]         背包',
            '[P]        调试信息',
        ];
        hints.forEach((line, i) => {
            const t = this.add.text(0, -cardH / 2 + 130 + i * 30, line, {
                fontSize: '18px',
                fontFamily: 'Courier, monospace',
                color: '#c0c7e8',
            });
            t.setOrigin(0.5);
            this.pauseMenu.add(t);
        });

        this.pauseMenu.add([overlay, panel, pauseText, divider]);
    }

    /**
     * 每帧更新
     */
    update(): void {
        // 更新血条显示
        if (this.player) {
            this.healthBar.update(this.player.health, this.player.maxHealth);
        }
        // 更新武器指示器
        this.weaponIndicator?.update();
    }
}
