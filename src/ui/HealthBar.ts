/**
 * 血条 UI 组件
 */
import Phaser from 'phaser';

export class HealthBar {
    // private scene: Phaser.Scene; // Unused
    private x: number;
    private y: number;
    private width: number;
    private height: number;

    // 图形对象
    private background: Phaser.GameObjects.Graphics;
    private bar: Phaser.GameObjects.Graphics;
    private border: Phaser.GameObjects.Graphics;

    // 文字显示
    private healthText: Phaser.GameObjects.Text;

    constructor(
        scene: Phaser.Scene,
        x: number,
        y: number,
        width: number,
        height: number,
    ) {
        // this.scene = scene; // Unused
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;

        // 创建背景
        this.background = scene.add.graphics();
        this.background.fillStyle(0x222222, 0.8);
        this.background.fillRoundedRect(x, y, width, height, 4);

        // 创建血条
        this.bar = scene.add.graphics();

        // 创建边框
        this.border = scene.add.graphics();
        this.border.lineStyle(2, 0xffffff, 0.8);
        this.border.strokeRoundedRect(x, y, width, height, 4);

        // 创建血量文字
        this.healthText = scene.add.text(
            x + width / 2,
            y + height / 2,
            '100/100',
            {
                fontSize: '12px',
                fontFamily: 'Arial',
                color: '#ffffff',
            },
        );
        this.healthText.setOrigin(0.5);

        // 添加血条图标（心形）
        const heartIcon = scene.add.text(x - 20, y + height / 2, '❤', {
            fontSize: '16px',
        });
        heartIcon.setOrigin(0.5);
    }

    /**
     * 更新血条显示
     */
    public update(currentHealth: number, maxHealth: number): void {
        // 清除之前的绘制
        this.bar.clear();

        // 计算血条宽度
        const healthPercent = Math.max(0, currentHealth / maxHealth);
        const barWidth = (this.width - 4) * healthPercent;

        // 根据血量百分比选择颜色
        let color: number;
        if (healthPercent > 0.6) {
            color = 0x00ff00; // 绿色
        } else if (healthPercent > 0.3) {
            color = 0xffff00; // 黄色
        } else {
            color = 0xff0000; // 红色
        }

        // 绘制血条
        this.bar.fillStyle(color, 1);
        this.bar.fillRoundedRect(
            this.x + 2,
            this.y + 2,
            barWidth,
            this.height - 4,
            2,
        );

        // 更新文字
        this.healthText.setText(`${Math.floor(currentHealth)}/${maxHealth}`);
    }

    /**
     * 设置可见性
     */
    public setVisible(visible: boolean): void {
        this.background.setVisible(visible);
        this.bar.setVisible(visible);
        this.border.setVisible(visible);
        this.healthText.setVisible(visible);
    }

    /**
     * 销毁组件
     */
    public destroy(): void {
        this.background.destroy();
        this.bar.destroy();
        this.border.destroy();
        this.healthText.destroy();
    }
}
