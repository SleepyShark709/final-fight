import { ASSETS, VFX_CONFIG } from '../utils/Constants';

/**
 * 战斗视觉特效管理器
 * 使用 spritesheet 动画播放特效
 */
export class EffectsManager {
    /**
     * 创建斩击特效（攻击命中时在目标位置播放斩击动画）
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
        // 创建斩击精灵，使用第一帧纹理
        const slash = scene.add.sprite(x, y, `${ASSETS.VFX_SLASH}-1`);
        slash.setDepth(VFX_CONFIG.slash.depth);

        // 根据是否暴击设置缩放和着色
        const baseScale = isCritical ? VFX_CONFIG.slash.critScale : VFX_CONFIG.slash.normalScale;
        slash.setScale(baseScale);
        if (isCritical) {
            slash.setTint(0xffdd00);
        }

        // 根据朝向翻转（朝左时 flipX = true）
        slash.setFlipX(!facingRight);

        // 设置原点偏移，斩击弧在画布右下位置
        slash.setOrigin(0.55, 0.65);

        // 播放斩击动画
        slash.play(ASSETS.VFX_SLASH);

        // 动画完成后销毁精灵
        slash.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
            slash.destroy();
        });

        // 轻微膨胀 tween，从当前缩放到 1.15 倍
        scene.tweens.add({
            targets: slash,
            scaleX: baseScale * 1.15,
            scaleY: baseScale * 1.15,
            duration: 200,
            ease: 'Power1',
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
        // 使用小型爆炸 spritesheet 动画替代程序生成粒子
        const sprite = scene.add.sprite(x, y, ASSETS.VFX_EXPLOSION_SMALL);
        sprite.setDepth(45);

        if (isCritical) {
            // 暴击：放大 + 金色染色
            sprite.setScale(1.5);
            sprite.setTint(0xffaa00);
        } else {
            // 普通命中
            sprite.setScale(VFX_CONFIG.explosionSmall.scale);
        }

        // 播放动画，完成后销毁
        sprite.play(ASSETS.VFX_EXPLOSION_SMALL);
        sprite.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
            sprite.destroy();
        });
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
        // 使用爆炸 spritesheet 动画替代程序生成粒子
        const sprite = scene.add.sprite(x, y, ASSETS.VFX_EXPLOSION);
        sprite.setDepth(45);
        sprite.setScale(VFX_CONFIG.explosion.scale);

        // 播放动画，完成后销毁
        sprite.play(ASSETS.VFX_EXPLOSION);
        sprite.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
            sprite.destroy();
        });
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
