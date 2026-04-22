/**
 * 运行进度条 — 顶部中间显示当前区域 + 房间进度
 *
 * 样式：
 * [ 🔥 熔岩区 ]  ● ● ● ◯ ◯ ◯ ◯ ★
 *  (区域)        (8 个点，当前高亮，最后一个为 Boss 星)
 */
import Phaser from 'phaser';

export class RunProgressBar {
    private scene: Phaser.Scene;
    private container: Phaser.GameObjects.Container;
    private biomeLabel: Phaser.GameObjects.Text;
    private dots: Phaser.GameObjects.Graphics[] = [];

    private currentRoom: number = 0;
    private totalRooms: number = 8;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        this.scene = scene;
        this.container = scene.add.container(x, y);
        this.container.setDepth(100);
        this.container.setScrollFactor(0);

        // 区域标签（左侧）
        this.biomeLabel = scene.add.text(0, 0, '石窟', {
            fontSize: '16px',
            fontFamily: 'Arial Black, Arial',
            color: '#ffd28c',
            stroke: '#000000',
            strokeThickness: 3,
        });
        this.biomeLabel.setOrigin(1, 0.5);
        this.biomeLabel.setX(-14);

        // 底框
        const bg = scene.add.graphics();
        bg.fillStyle(0x0a0a14, 0.75);
        bg.fillRoundedRect(-110, -14, 280, 28, 14);
        bg.lineStyle(1.5, 0x5a6a84, 0.7);
        bg.strokeRoundedRect(-110, -14, 280, 28, 14);

        this.container.add([bg, this.biomeLabel]);

        // 进度点占位
        this.createDots();
    }

    private createDots(): void {
        this.dots.forEach(d => d.destroy());
        this.dots = [];
        const dotCount = this.totalRooms;
        const startX = 0;
        const step = (160 - 14) / Math.max(dotCount - 1, 1);
        for (let i = 0; i < dotCount; i++) {
            const g = this.scene.add.graphics();
            g.setPosition(startX + i * step, 0);
            this.container.add(g);
            this.dots.push(g);
        }
        this.updateDots();
    }

    private updateDots(): void {
        this.dots.forEach((g, i) => {
            g.clear();
            const isCurrent = i === this.currentRoom;
            const isCleared = i < this.currentRoom;
            const isBoss = i === this.totalRooms - 1;

            if (isCurrent) {
                // 当前：大高亮圆
                const color = isBoss ? 0xff5522 : 0xffdd55;
                g.fillStyle(color, 1);
                g.fillCircle(0, 0, 7);
                g.lineStyle(2, 0xffffff, 0.9);
                g.strokeCircle(0, 0, 8);
                // 脉冲效果
                this.scene.tweens.add({
                    targets: g,
                    scale: { from: 1, to: 1.25 },
                    duration: 700,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut',
                });
            } else if (isCleared) {
                // 已通关：灰色实心圆
                g.fillStyle(0x557788, 0.9);
                g.fillCircle(0, 0, 4);
                g.lineStyle(1, 0x9abbcc, 0.5);
                g.strokeCircle(0, 0, 4);
            } else {
                // 未来：空心
                if (isBoss) {
                    // Boss 位置特殊标记：星形（简化为矩形+旋转）
                    g.fillStyle(0x661a0a, 0.7);
                    g.fillCircle(0, 0, 6);
                    g.lineStyle(1.5, 0xff8855, 0.7);
                    g.strokeCircle(0, 0, 6);
                } else {
                    g.lineStyle(1.5, 0x5a6a84, 0.6);
                    g.strokeCircle(0, 0, 4);
                }
            }
        });
    }

    /**
     * 更新进度
     * @param biomeName 区域名
     * @param currentRoom 当前房间索引（从 0 开始）
     * @param totalRooms 区域总房间数
     */
    public update(biomeName: string, currentRoom: number, totalRooms: number): void {
        this.biomeLabel.setText(biomeName);
        if (totalRooms !== this.totalRooms) {
            this.totalRooms = totalRooms;
            this.createDots();
        }
        if (currentRoom !== this.currentRoom) {
            this.currentRoom = currentRoom;
            this.updateDots();
        }
    }

    public destroy(): void {
        this.container.destroy();
    }
}
