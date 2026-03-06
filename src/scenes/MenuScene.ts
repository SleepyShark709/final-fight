/**
 * 菜单场景
 * 游戏主菜单，显示标题和开始按钮
 */
import Phaser from 'phaser';
import { SCENES, GAME_WIDTH, GAME_HEIGHT } from '../utils/Constants';

export class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: SCENES.MENU });
    }

    create(): void {
        // 创建渐变背景
        this.createBackground();

        // 游戏标题
        const title = this.add.text(
            GAME_WIDTH / 2,
            GAME_HEIGHT / 3,
            'FINAL FIGHT',
            {
                fontSize: '64px',
                fontFamily: 'Arial Black, Arial',
                color: '#ff6b35',
                stroke: '#000000',
                strokeThickness: 8,
                shadow: {
                    offsetX: 4,
                    offsetY: 4,
                    color: '#000000',
                    blur: 8,
                    fill: true,
                },
            },
        );
        title.setOrigin(0.5);

        // 副标题
        const subtitle = this.add.text(
            GAME_WIDTH / 2,
            GAME_HEIGHT / 3 + 60,
            'V2',
            {
                fontSize: '32px',
                fontFamily: 'Arial',
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 4,
            },
        );
        subtitle.setOrigin(0.5);

        // 开始游戏按钮
        const startButton = this.createButton(
            GAME_WIDTH / 2,
            GAME_HEIGHT / 2 + 50,
            '开始游戏',
            () => {
                this.startGame();
            },
        );

        // 操作说明
        const instructions = this.add.text(
            GAME_WIDTH / 2,
            GAME_HEIGHT - 80,
            'A/D: 移动  |  K: 跳跃  |  J: 攻击  |  L: 冲刺  |  U: 技能  |  I: 背包',
            {
                fontSize: '16px',
                fontFamily: 'Arial',
                color: '#aaaaaa',
            },
        );
        instructions.setOrigin(0.5);

        // 闪烁动画效果
        this.tweens.add({
            targets: startButton,
            alpha: { from: 1, to: 0.7 },
            duration: 800,
            yoyo: true,
            repeat: -1,
        });
    }

    /**
     * 创建背景
     */
    private createBackground(): void {
        // 创建背景图形
        const graphics = this.add.graphics();

        // 深蓝色背景
        graphics.fillStyle(0x1a1a2e, 1);
        graphics.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

        // 添加一些装饰性粒子/星星
        for (let i = 0; i < 50; i++) {
            const x = Phaser.Math.Between(0, GAME_WIDTH);
            const y = Phaser.Math.Between(0, GAME_HEIGHT);
            const size = Phaser.Math.Between(1, 3);
            const alpha = Phaser.Math.FloatBetween(0.3, 0.8);

            graphics.fillStyle(0xffffff, alpha);
            graphics.fillCircle(x, y, size);
        }
    }

    /**
     * 创建按钮
     */
    private createButton(
        x: number,
        y: number,
        text: string,
        callback: () => void,
    ): Phaser.GameObjects.Container {
        const container = this.add.container(x, y);

        // 按钮背景
        const bg = this.add.graphics();
        bg.fillStyle(0x4a9eff, 1);
        bg.fillRoundedRect(-100, -25, 200, 50, 10);
        bg.lineStyle(3, 0xffffff, 1);
        bg.strokeRoundedRect(-100, -25, 200, 50, 10);

        // 按钮文字
        const buttonText = this.add.text(0, 0, text, {
            fontSize: '24px',
            fontFamily: 'Arial',
            color: '#ffffff',
        });
        buttonText.setOrigin(0.5);

        container.add([bg, buttonText]);

        // 使容器可交互
        container.setSize(200, 50);
        container.setInteractive({ useHandCursor: true });

        // 添加悬停效果
        container.on('pointerover', () => {
            bg.clear();
            bg.fillStyle(0x6ab4ff, 1);
            bg.fillRoundedRect(-100, -25, 200, 50, 10);
            bg.lineStyle(3, 0xffffff, 1);
            bg.strokeRoundedRect(-100, -25, 200, 50, 10);
        });

        container.on('pointerout', () => {
            bg.clear();
            bg.fillStyle(0x4a9eff, 1);
            bg.fillRoundedRect(-100, -25, 200, 50, 10);
            bg.lineStyle(3, 0xffffff, 1);
            bg.strokeRoundedRect(-100, -25, 200, 50, 10);
        });

        container.on('pointerdown', callback);

        return container;
    }

    /**
     * 开始游戏
     */
    private startGame(): void {
        // 淡出过渡效果
        this.cameras.main.fadeOut(500, 0, 0, 0);

        this.cameras.main.once('camerafadeoutcomplete', () => {
            // 进入据点（Hub）
            this.scene.start(SCENES.HUB);
        });
    }
}
