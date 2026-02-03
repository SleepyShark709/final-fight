/**
 * 伤害飘字类
 * 显示战斗中的伤害数字和治疗数字
 */

export enum DamageType {
    NORMAL = 'normal', // 普通伤害 - 白色
    CRITICAL = 'critical', // 暴击伤害 - 黄色/金色
    HEAL = 'heal', // 治疗 - 绿色
}

export class DamageText extends Phaser.GameObjects.Text {
    constructor(
        scene: Phaser.Scene,
        x: number,
        y: number,
        damage: number,
        type: DamageType = DamageType.NORMAL,
    ) {
        // 根据类型设置颜色和大小
        let color = '#ffffff';
        let fontSize = '16px';
        let strokeColor = '#000000';

        switch (type) {
            case DamageType.NORMAL:
                color = '#ffffff';
                fontSize = '16px';
                break;
            case DamageType.CRITICAL:
                color = '#ffcc00'; // 金色
                fontSize = '24px';
                strokeColor = '#ff6600';
                break;
            case DamageType.HEAL:
                color = '#00ff00'; // 绿色
                fontSize = '18px';
                strokeColor = '#006600';
                break;
        }

        super(scene, x, y, damage.toString(), {
            fontSize: fontSize,
            color: color,
            fontStyle: 'bold',
            stroke: strokeColor,
            strokeThickness: 3,
        });

        // 设置原点为中心
        this.setOrigin(0.5, 0.5);

        // 设置深度，确保在最上层
        this.setDepth(1500);

        // 添加到场景
        scene.add.existing(this);

        // 播放飘字动画
        this.playAnimation(type);
    }

    /**
     * 播放飘字动画
     */
    private playAnimation(type: DamageType): void {
        const targetY = this.y - (type === DamageType.CRITICAL ? 80 : 60);
        const duration = type === DamageType.CRITICAL ? 1200 : 1000;

        // 向上飘动 + 淡出
        this.scene.tweens.add({
            targets: this,
            y: targetY,
            alpha: 0,
            duration: duration,
            ease: 'Cubic.easeOut',
            onComplete: () => {
                this.destroy();
            },
        });

        // 暴击时添加缩放效果
        if (type === DamageType.CRITICAL) {
            this.scene.tweens.add({
                targets: this,
                scaleX: 1.3,
                scaleY: 1.3,
                duration: 150,
                yoyo: true,
                ease: 'Back.easeOut',
            });
        }
    }

    /**
     * 在指定位置创建伤害飘字
     */
    static create(
        scene: Phaser.Scene,
        x: number,
        y: number,
        damage: number,
        type: DamageType = DamageType.NORMAL,
    ): DamageText {
        // 添加轻微的随机偏移，避免多个伤害数字重叠
        const offsetX = Phaser.Math.Between(-10, 10);
        const offsetY = Phaser.Math.Between(-5, 5);

        return new DamageText(scene, x + offsetX, y + offsetY, damage, type);
    }
}
