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

    // 玩家引用
    private player!: Player;

    constructor() {
        super({ key: SCENES.UI });
    }

    create(): void {
        // 创建血条
        this.healthBar = new HealthBar(this, 20, 20, 200, 20);

        // 创建背包
        this.inventory = new Inventory(this);
        this.inventory.hide();

        // 创建暂停菜单
        this.createPauseMenu();

        // 监听游戏场景的玩家创建事件
        const gameScene = this.scene.get(SCENES.GAME) as any;

        // 先尝试直接获取player（如果GameScene已经创建了player）
        if (gameScene.player) {
            this.player = gameScene.player;
            // 初始化血条显示
            this.healthBar.update(this.player.health, this.player.maxHealth);
        }

        // 也监听事件（以防顺序问题）
        gameScene.events.on('player-created', (player: Player) => {
            this.player = player;
            // 初始化血条显示
            this.healthBar.update(this.player.health, this.player.maxHealth);
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
