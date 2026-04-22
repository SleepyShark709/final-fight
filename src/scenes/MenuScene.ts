/**
 * 菜单场景
 * 游戏主菜单，显示标题和开始按钮
 */
import Phaser from 'phaser';
import { SCENES, GAME_WIDTH, GAME_HEIGHT } from '../utils/Constants';
import { Audio } from '../systems/AudioManager';

export class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: SCENES.MENU });
    }

    create(): void {
        // 创建渐变背景
        this.createBackground();

        // 菜单 BGM
        Audio.playBgm('menu');

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

        // 键盘启动（SPACE / ENTER）
        const keyboard = this.input.keyboard;
        if (keyboard) {
            keyboard.once('keydown-SPACE', () => { Audio.play('ui-select'); this.startGame(); });
            keyboard.once('keydown-ENTER', () => { Audio.play('ui-select'); this.startGame(); });
        }
    }

    /**
     * 创建背景 — 动态渐变 + 呼吸星空 + 地平线火光
     */
    private createBackground(): void {
        // 底色渐变（双层 Graphics 模拟垂直渐变）
        const sky = this.add.graphics();
        sky.fillStyle(0x140020, 1);
        sky.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

        // 中间层 — 紫色雾
        const fog = this.add.graphics();
        fog.fillStyle(0x3a1555, 0.55);
        fog.fillRect(0, GAME_HEIGHT * 0.35, GAME_WIDTH, GAME_HEIGHT * 0.45);

        // 底部橙色火光
        const glow = this.add.graphics();
        glow.fillStyle(0xff5d1f, 0.35);
        glow.fillRect(0, GAME_HEIGHT * 0.78, GAME_WIDTH, GAME_HEIGHT * 0.22);
        const emberGlow = this.add.graphics();
        emberGlow.fillStyle(0xffaa44, 0.25);
        emberGlow.fillRect(0, GAME_HEIGHT * 0.88, GAME_WIDTH, GAME_HEIGHT * 0.12);

        // 星空 — 每颗星独立 Graphics 以支持闪烁
        for (let i = 0; i < 70; i++) {
            const x = Phaser.Math.Between(0, GAME_WIDTH);
            const y = Phaser.Math.Between(0, GAME_HEIGHT * 0.55);
            const size = Phaser.Math.FloatBetween(1, 2.8);
            const star = this.add.circle(x, y, size, 0xffffff, Phaser.Math.FloatBetween(0.35, 0.9));
            // 缓慢呼吸闪烁
            this.tweens.add({
                targets: star,
                alpha: { from: star.alpha, to: star.alpha * 0.2 },
                scale: { from: 1, to: 0.6 },
                duration: Phaser.Math.Between(1800, 3500),
                yoyo: true,
                repeat: -1,
                delay: Phaser.Math.Between(0, 2000),
            });
        }

        // 远处山脉剪影
        const mountains = this.add.graphics();
        mountains.fillStyle(0x0d0515, 1);
        mountains.beginPath();
        mountains.moveTo(0, GAME_HEIGHT * 0.72);
        const peaks = 6;
        for (let i = 0; i <= peaks; i++) {
            const px = (i / peaks) * GAME_WIDTH;
            const py = GAME_HEIGHT * 0.72 - Phaser.Math.Between(0, 50);
            mountains.lineTo(px, py);
        }
        mountains.lineTo(GAME_WIDTH, GAME_HEIGHT);
        mountains.lineTo(0, GAME_HEIGHT);
        mountains.closePath();
        mountains.fillPath();

        // 飘散的余烬粒子（向上升起）
        for (let i = 0; i < 18; i++) {
            const x = Phaser.Math.Between(0, GAME_WIDTH);
            const ember = this.add.circle(x, GAME_HEIGHT + 20, Phaser.Math.FloatBetween(1.5, 3), 0xff9955, 0.85);
            this.tweens.add({
                targets: ember,
                y: -20,
                x: x + Phaser.Math.Between(-80, 80),
                alpha: 0,
                duration: Phaser.Math.Between(4500, 8000),
                delay: Phaser.Math.Between(0, 4000),
                repeat: -1,
            });
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
            Audio.play('ui-click');
        });

        container.on('pointerout', () => {
            bg.clear();
            bg.fillStyle(0x4a9eff, 1);
            bg.fillRoundedRect(-100, -25, 200, 50, 10);
            bg.lineStyle(3, 0xffffff, 1);
            bg.strokeRoundedRect(-100, -25, 200, 50, 10);
        });

        container.on('pointerdown', () => { Audio.play('ui-select'); callback(); });

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
