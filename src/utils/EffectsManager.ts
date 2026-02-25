/**
 * 战斗视觉特效管理器
 * 使用 Phaser Graphics 程序生成，无需外部资源
 */
export class EffectsManager {
    /**
     * 创建斩击特效（攻击命中时在目标位置显示斩击线）
     * @param scene Phaser 场景
     * @param x 特效中心 X
     * @param y 特效中心 Y
     * @param facingRight 玩家朝右
     * @param isCritical 是否暴击
     */
    static createSlashEffect(
        scene: Phaser.Scene,
        x: number,
        y: number,
        facingRight: boolean,
        isCritical: boolean = false,
    ): void {
        const dir = facingRight ? 1 : -1;
        const size = isCritical ? 52 : 38;
        const color = isCritical ? 0xffaa00 : 0xffffff;
        const lineWidth = isCritical ? 5 : 3;

        const g = scene.add.graphics();
        g.setDepth(45);
        g.setPosition(x, y);

        // 主斩线
        g.lineStyle(lineWidth, color, 1.0);
        g.beginPath();
        g.moveTo(dir * 6, -size * 0.65);
        g.lineTo(dir * size, size * 0.45);
        g.strokePath();

        // 辅助斩线（偏移，降低透明度）
        g.lineStyle(lineWidth - 1, color, 0.55);
        g.beginPath();
        g.moveTo(dir * 6, -size * 0.85);
        g.lineTo(dir * size, size * 0.2);
        g.strokePath();

        g.lineStyle(lineWidth - 1, color, 0.35);
        g.beginPath();
        g.moveTo(dir * 6, -size * 0.4);
        g.lineTo(dir * size, size * 0.65);
        g.strokePath();

        // 暴击额外光晕
        if (isCritical) {
            g.fillStyle(0xffdd00, 0.25);
            g.fillCircle(dir * size * 0.6, 0, 22);
        }

        scene.tweens.add({
            targets: g,
            alpha: 0,
            scaleX: 1.45,
            scaleY: 1.45,
            duration: 180,
            ease: 'Power2',
            onComplete: () => g.destroy(),
        });
    }

    /**
     * 创建命中粒子（击中敌人时在接触点爆发）
     * @param scene Phaser 场景
     * @param x 命中 X
     * @param y 命中 Y
     * @param isCritical 是否暴击
     */
    static createHitParticles(
        scene: Phaser.Scene,
        x: number,
        y: number,
        isCritical: boolean = false,
    ): void {
        const count = isCritical ? 10 : 6;
        const colors = isCritical
            ? [0xffaa00, 0xff6600, 0xffff00, 0xffffff, 0xff4400]
            : [0xffffff, 0xffddcc, 0xff9999];

        for (let i = 0; i < count; i++) {
            const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
            const speed = Phaser.Math.Between(70, isCritical ? 200 : 140);
            const size = Phaser.Math.Between(2, isCritical ? 5 : 4);
            const color = colors[Math.floor(Math.random() * colors.length)];
            const duration = Phaser.Math.Between(180, 360);

            const g = scene.add.graphics();
            g.setDepth(45);
            g.fillStyle(color, 1);
            g.fillCircle(0, 0, size);
            g.setPosition(
                x + Phaser.Math.Between(-8, 8),
                y + Phaser.Math.Between(-8, 8),
            );

            scene.tweens.add({
                targets: g,
                x: g.x + Math.cos(angle) * speed * 0.4,
                y: g.y + Math.sin(angle) * speed * 0.4,
                alpha: 0,
                scaleX: 0.1,
                scaleY: 0.1,
                duration,
                ease: 'Power1',
                onComplete: () => g.destroy(),
            });
        }
    }

    /**
     * 创建死亡粒子（敌人死亡时爆散）
     * @param scene Phaser 场景
     * @param x 死亡位置 X
     * @param y 死亡位置 Y
     */
    static createDeathParticles(
        scene: Phaser.Scene,
        x: number,
        y: number,
    ): void {
        const count = 14;
        const colors = [0xff2200, 0xff6600, 0xffaa00, 0xffffff, 0x888888, 0xffdd00];

        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2 + Phaser.Math.FloatBetween(-0.3, 0.3);
            const speed = Phaser.Math.Between(90, 240);
            const size = Phaser.Math.Between(3, 9);
            const color = colors[Math.floor(Math.random() * colors.length)];
            const duration = Phaser.Math.Between(350, 650);

            const g = scene.add.graphics();
            g.setDepth(45);
            g.fillStyle(color, 1);
            // 交替矩形/圆形粒子，增加视觉多样性
            if (i % 2 === 0) {
                g.fillRect(-size / 2, -size / 2, size, size);
            } else {
                g.fillCircle(0, 0, size / 2);
            }
            g.setPosition(
                x + Phaser.Math.Between(-18, 18),
                y + Phaser.Math.Between(-18, 18),
            );

            scene.tweens.add({
                targets: g,
                x: g.x + Math.cos(angle) * speed * 0.55,
                y: g.y + Math.sin(angle) * speed * 0.55,
                alpha: 0,
                duration,
                ease: 'Power2',
                onComplete: () => g.destroy(),
            });
        }
    }

    /**
     * 暴击闪白效果（画面短暂闪白）
     * @param scene Phaser 场景
     */
    static createCriticalFlash(scene: Phaser.Scene): void {
        const cam = scene.cameras.main;
        const flash = scene.add.graphics();
        flash.setScrollFactor(0);
        flash.setDepth(500);
        flash.fillStyle(0xffffff, 0.35);
        flash.fillRect(0, 0, cam.width, cam.height);

        scene.tweens.add({
            targets: flash,
            alpha: 0,
            duration: 60,
            ease: 'Linear',
            onComplete: () => flash.destroy(),
        });
    }
}
