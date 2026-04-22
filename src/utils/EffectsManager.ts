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

    /**
     * 受击瞬白闪烁（比红色 tint 更脆的打击反馈）
     * 复制目标 sprite 并用 tintFill 填满白色，短暂叠加后消失
     * @param scene Phaser 场景
     * @param target 目标 Sprite
     * @param duration 闪烁时长（默认 80ms）
     */
    static createHitFlash(
        scene: Phaser.Scene,
        target: Phaser.GameObjects.Sprite,
        duration: number = 80,
    ): void {
        if (!target.active || !target.texture) return;
        // 获取当前帧的 key 和 frame
        const textureKey = target.texture.key;
        const frameName = target.frame.name;

        const flash = scene.add.sprite(target.x, target.y, textureKey, frameName);
        flash.setFlipX(target.flipX);
        flash.setFlipY(target.flipY);
        flash.setScale(target.scaleX, target.scaleY);
        flash.setOrigin(target.originX, target.originY);
        flash.setDepth((target.depth ?? 0) + 1);
        flash.setTintFill(0xffffff);
        flash.setBlendMode(Phaser.BlendModes.ADD);
        flash.setAlpha(0.95);

        scene.tweens.add({
            targets: flash,
            alpha: 0,
            duration,
            ease: 'Quad.easeOut',
            onComplete: () => flash.destroy(),
        });
    }

    /**
     * 落地扬尘（玩家/敌人落地时在脚底喷出灰尘粒子）
     * @param scene Phaser 场景
     * @param x 脚底中心 X
     * @param y 脚底 Y（地面高度）
     * @param strength 强度（0.5=轻跳，1.0=正常，1.5=重落）
     */
    static createLandingDust(
        scene: Phaser.Scene,
        x: number,
        y: number,
        strength: number = 1.0,
    ): void {
        const count = Math.round(5 * strength);
        for (let i = 0; i < count; i++) {
            const dx = Phaser.Math.Between(-18, 18);
            const dust = scene.add.circle(
                x + dx,
                y - 2,
                Phaser.Math.Between(2, 4),
                0xc8bfa8,
                0.75,
            );
            dust.setDepth(35);
            const vx = dx * 1.8;
            const vy = -Phaser.Math.FloatBetween(20, 50) * strength;
            scene.tweens.add({
                targets: dust,
                x: dust.x + vx,
                y: dust.y + vy,
                alpha: 0,
                scale: 0.3,
                duration: 350 + Phaser.Math.Between(0, 150),
                ease: 'Quad.easeOut',
                onComplete: () => dust.destroy(),
            });
        }
    }

    /**
     * 冲刺残影（复制当前帧，渐隐消失，生成拖尾）
     * 建议在冲刺期间按固定间隔重复调用（如每 40ms）
     * @param scene Phaser 场景
     * @param source 源 Sprite
     * @param tint 残影着色（默认青色 0x66ccff）
     */
    static createAfterimage(
        scene: Phaser.Scene,
        source: Phaser.GameObjects.Sprite,
        tint: number = 0x66ccff,
    ): void {
        if (!source.active || !source.texture) return;
        const ghost = scene.add.sprite(
            source.x,
            source.y,
            source.texture.key,
            source.frame.name,
        );
        ghost.setFlipX(source.flipX);
        ghost.setScale(source.scaleX, source.scaleY);
        ghost.setOrigin(source.originX, source.originY);
        ghost.setDepth((source.depth ?? 0) - 1);
        ghost.setTint(tint);
        ghost.setAlpha(0.55);
        ghost.setBlendMode(Phaser.BlendModes.ADD);
        scene.tweens.add({
            targets: ghost,
            alpha: 0,
            duration: 300,
            ease: 'Quad.easeOut',
            onComplete: () => ghost.destroy(),
        });
    }

    /**
     * 慢动作 / 击杀时刻（临时时间缩放）
     *
     * ⚠️ 重要：scene.anims.globalTimeScale 是**全局**的（整个 game 共用一个
     * AnimationManager）。scene 切换时必须无条件恢复，否则新场景的动画会卡慢。
     * 场景本地的 time/tweens/physics.world.timeScale 仅在原场景仍活跃时恢复。
     *
     * @param scene Phaser 场景
     * @param duration 持续时间（ms，按实际时间计，不受 timeScale 影响）
     * @param scale 时间缩放系数（0.3 = 以 30% 速度播放）
     */
    static createSlowMotion(
        scene: Phaser.Scene,
        duration: number = 300,
        scale: number = 0.35,
    ): void {
        // Phaser physics.world.timeScale 为"倍数"而非"速度"：值越大越慢
        const physicsInverse = 1 / Math.max(scale, 0.05);
        scene.time.timeScale = scale;
        scene.tweens.timeScale = scale;
        scene.anims.globalTimeScale = scale;
        scene.physics.world.timeScale = physicsInverse;

        // 保存对 anims 的引用，无论 scene 是否还活跃都必须恢复全局时间缩放
        const animsRef = scene.anims;

        // 用 setTimeout（不受 timeScale 影响的真实时钟）还原
        setTimeout(() => {
            // 全局：必须恢复（否则后续场景全局动画速度异常）
            animsRef.globalTimeScale = 1;
            // 场景本地：仅当原场景仍活跃时恢复（否则可能触及已销毁的对象）
            if (scene.sys?.isActive?.()) {
                scene.time.timeScale = 1;
                scene.tweens.timeScale = 1;
                scene.physics.world.timeScale = 1;
            }
        }, duration);
    }

    /**
     * 命中脉冲（目标短暂放大后回弹，增强命中确认感）
     * @param scene Phaser 场景
     * @param target 目标 Sprite
     * @param strength 放大强度（默认 1.12）
     */
    static createHitPunch(
        scene: Phaser.Scene,
        target: Phaser.GameObjects.Sprite,
        strength: number = 1.12,
    ): void {
        if (!target.active) return;
        const sx = target.scaleX;
        const sy = target.scaleY;
        scene.tweens.add({
            targets: target,
            scaleX: sx * strength,
            scaleY: sy * (2 - strength), // 轻微纵向挤压
            duration: 60,
            yoyo: true,
            ease: 'Quad.easeOut',
            onComplete: () => {
                if (target.active) target.setScale(sx, sy);
            },
        });
    }
}
