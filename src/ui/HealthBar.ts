/**
 * 血条 UI — Hades 风斜切式血条
 *
 * 特性：
 * - 斜切几何边框（非矩形，更有机械感）
 * - 分三层：底框 / 延迟伤害层 / 当前血量层
 * - 受伤时延迟伤害层缓慢追上当前血量（展示损失）
 * - 低血量（<30%）红色脉冲警告
 * - 数字和心形图标（低血时心跳脉冲）
 */
import Phaser from 'phaser';

export class HealthBar {
    private scene: Phaser.Scene;
    private x: number;
    private y: number;
    private width: number;
    private height: number;

    // 图层
    private frame: Phaser.GameObjects.Graphics;
    private delayBar: Phaser.GameObjects.Graphics;
    private bar: Phaser.GameObjects.Graphics;
    private healthText: Phaser.GameObjects.Text;
    private heartIcon: Phaser.GameObjects.Text;

    // 血量追踪
    private currentHp: number = 100;
    private displayedHp: number = 100; // 当前血条显示值（平滑追击）
    private delayedHp: number = 100;   // 延迟血条值（更慢追击）
    private maxHp: number = 100;

    // 低血量脉冲
    private pulseTween?: Phaser.Tweens.Tween;
    private isPulsing: boolean = false;

    // 动画状态
    private shakeActive: boolean = false;
    private frameBaseX: number;
    private displayedTween?: Phaser.Tweens.Tween;
    private delayedTween?: Phaser.Tweens.Tween;

    constructor(
        scene: Phaser.Scene,
        x: number,
        y: number,
        width: number,
        height: number,
    ) {
        this.scene = scene;
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.frameBaseX = x;

        // 绘制底框（斜切）
        this.frame = scene.add.graphics();
        this.drawFrame();

        // 延迟伤害层（深红）
        this.delayBar = scene.add.graphics();

        // 当前血量层
        this.bar = scene.add.graphics();

        // 血量文字
        this.healthText = scene.add.text(
            x + width / 2,
            y + height / 2,
            '100 / 100',
            {
                fontSize: '13px',
                fontFamily: 'Arial Black, Arial',
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 3,
            },
        );
        this.healthText.setOrigin(0.5);

        // 心形图标（左侧）
        this.heartIcon = scene.add.text(x - 24, y + height / 2, '❤', {
            fontSize: '22px',
            color: '#ff4466',
            stroke: '#000000',
            strokeThickness: 3,
        });
        this.heartIcon.setOrigin(0.5);

        this.redraw();
    }

    /**
     * 绘制斜切底框（一次性，不随血量变化）
     */
    private drawFrame(): void {
        const g = this.frame;
        const { width, height } = this;
        const skew = 10; // 斜切量

        g.clear();

        // 外部阴影
        g.fillStyle(0x000000, 0.6);
        g.beginPath();
        g.moveTo(this.x - 2 - skew, this.y - 2);
        g.lineTo(this.x + width + 2 + skew, this.y - 2);
        g.lineTo(this.x + width + 2, this.y + height + 2);
        g.lineTo(this.x - 2, this.y + height + 2);
        g.closePath();
        g.fillPath();

        // 内部深色槽位
        g.fillStyle(0x181818, 1);
        g.beginPath();
        g.moveTo(this.x - skew, this.y);
        g.lineTo(this.x + width + skew, this.y);
        g.lineTo(this.x + width, this.y + height);
        g.lineTo(this.x, this.y + height);
        g.closePath();
        g.fillPath();

        // 边框线
        g.lineStyle(2, 0xc8c8c8, 0.8);
        g.beginPath();
        g.moveTo(this.x - skew, this.y);
        g.lineTo(this.x + width + skew, this.y);
        g.lineTo(this.x + width, this.y + height);
        g.lineTo(this.x, this.y + height);
        g.closePath();
        g.strokePath();
    }

    /**
     * 根据当前血量重绘填充层
     */
    private redraw(): void {
        const { width, height } = this;
        const skew = 10;

        // 画一个斜切填充条：宽度按百分比
        const drawSkewBar = (
            g: Phaser.GameObjects.Graphics,
            percent: number,
            colorTop: number,
            colorBottom: number,
        ) => {
            g.clear();
            if (percent <= 0) return;
            const fillW = width * percent;
            // 起始 x（保持和底框一致的左斜切）
            const x0 = this.x;
            const y0 = this.y;
            const ySkew = skew;

            // 渐变模拟：上下两色填充各半
            g.fillStyle(colorTop, 1);
            g.beginPath();
            g.moveTo(x0 - ySkew, y0);
            g.lineTo(x0 - ySkew + fillW, y0);
            g.lineTo(x0 + fillW, y0 + height / 2);
            g.lineTo(x0, y0 + height / 2);
            g.closePath();
            g.fillPath();

            g.fillStyle(colorBottom, 1);
            g.beginPath();
            g.moveTo(x0, y0 + height / 2);
            g.lineTo(x0 + fillW, y0 + height / 2);
            g.lineTo(x0 + fillW - ySkew, y0 + height);
            g.lineTo(x0 - ySkew, y0 + height);
            g.closePath();
            g.fillPath();
        };

        const currentPct = Math.max(0, this.displayedHp / this.maxHp);
        const delayPct = Math.max(0, this.delayedHp / this.maxHp);

        // 颜色：根据血量变化
        let colorTop: number;
        let colorBottom: number;
        if (currentPct > 0.55) {
            colorTop = 0x7fe27f;
            colorBottom = 0x2d9140;
        } else if (currentPct > 0.28) {
            colorTop = 0xffe866;
            colorBottom = 0xc77a1a;
        } else {
            colorTop = 0xff7766;
            colorBottom = 0xb01b22;
        }

        // 先画延迟层（深红）
        drawSkewBar(this.delayBar, delayPct, 0x9a1a1a, 0x4a0a0a);
        // 再画当前血量层覆盖其上
        drawSkewBar(this.bar, currentPct, colorTop, colorBottom);
    }

    /**
     * 更新血条显示
     */
    public update(currentHealth: number, maxHealth: number): void {
        const hpChanged = currentHealth !== this.currentHp || maxHealth !== this.maxHp;
        this.currentHp = currentHealth;
        this.maxHp = maxHealth;

        // 平滑过渡到新血量
        // displayedHp 快速追击（180ms）
        this.displayedTween?.stop();
        this.displayedTween = this.scene.tweens.add({
            targets: this,
            displayedHp: currentHealth,
            duration: 180,
            ease: 'Cubic.easeOut',
            onUpdate: () => this.redraw(),
        });

        // 受伤时，delayedHp 停留一会儿再慢慢追上（500ms 延迟 + 500ms 动画）
        if (currentHealth < this.delayedHp) {
            this.delayedTween?.stop();
            this.delayedTween = this.scene.tweens.add({
                targets: this,
                delayedHp: currentHealth,
                duration: 500,
                delay: 400,
                ease: 'Cubic.easeOut',
                onUpdate: () => this.redraw(),
            });
            if (hpChanged && this.currentHp < this.delayedHp) this.triggerShake();
        } else if (currentHealth > this.delayedHp) {
            // 治疗：直接跟上
            this.delayedHp = currentHealth;
        }

        // 更新文字
        this.healthText.setText(`${Math.max(0, Math.floor(currentHealth))} / ${maxHealth}`);

        // 低血量脉冲
        const pct = currentHealth / maxHealth;
        if (pct < 0.3 && pct > 0 && !this.isPulsing) {
            this.startPulse();
        } else if (pct >= 0.3 && this.isPulsing) {
            this.stopPulse();
        }
    }

    /**
     * 受击抖动
     */
    private triggerShake(): void {
        if (this.shakeActive) return;
        this.shakeActive = true;
        const baseX = this.frameBaseX;
        const tx = { offset: 0 };
        this.scene.tweens.add({
            targets: tx,
            offset: { from: -3, to: 3 },
            duration: 50,
            repeat: 3,
            yoyo: true,
            onUpdate: () => {
                this.x = baseX + tx.offset;
                this.healthText.setX(this.x + this.width / 2);
                this.heartIcon.setX(this.x - 24);
                this.drawFrame();
                this.redraw();
            },
            onComplete: () => {
                this.x = baseX;
                this.healthText.setX(this.x + this.width / 2);
                this.heartIcon.setX(this.x - 24);
                this.drawFrame();
                this.redraw();
                this.shakeActive = false;
            },
        });
    }

    private startPulse(): void {
        this.isPulsing = true;
        this.pulseTween = this.scene.tweens.add({
            targets: this.heartIcon,
            scale: { from: 1, to: 1.25 },
            duration: 400,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });
    }

    private stopPulse(): void {
        this.isPulsing = false;
        if (this.pulseTween) {
            this.pulseTween.stop();
            this.pulseTween = undefined;
            this.heartIcon.setScale(1);
        }
    }

    public setVisible(visible: boolean): void {
        this.frame.setVisible(visible);
        this.delayBar.setVisible(visible);
        this.bar.setVisible(visible);
        this.healthText.setVisible(visible);
        this.heartIcon.setVisible(visible);
    }

    public destroy(): void {
        this.stopPulse();
        this.frame.destroy();
        this.delayBar.destroy();
        this.bar.destroy();
        this.healthText.destroy();
        this.heartIcon.destroy();
    }
}
