/**
 * 屏幕震动工具类
 * 为相机提供不同强度的震动效果
 */

export enum ShakeIntensity {
    LIGHT = 'light', // 轻击 - 2-3像素，50ms
    MEDIUM = 'medium', // 中击 - 5-8像素，100ms
    HEAVY = 'heavy', // 重击 - 10-15像素，150ms
}

export class CameraShake {
    /**
     * 触发屏幕震动
     * @param camera Phaser 相机对象
     * @param intensity 震动强度
     */
    static shake(
        camera: Phaser.Cameras.Scene2D.Camera,
        intensity: ShakeIntensity = ShakeIntensity.LIGHT,
    ): void {
        let shakeIntensity = 0.002;
        let shakeDuration = 50;

        switch (intensity) {
            case ShakeIntensity.LIGHT:
                shakeIntensity = 0.005; // 约4-6像素（增强）
                shakeDuration = 80; // 延长持续时间
                break;
            case ShakeIntensity.MEDIUM:
                shakeIntensity = 0.006; // 约5-8像素
                shakeDuration = 100;
                break;
            case ShakeIntensity.HEAVY:
                shakeIntensity = 0.012; // 约10-15像素
                shakeDuration = 150;
                break;
        }

        camera.shake(shakeDuration, shakeIntensity);
    }

    /**
     * 自定义震动参数
     * @param camera Phaser 相机对象
     * @param duration 持续时间（毫秒）
     * @param intensity 震动强度（0-1）
     */
    static customShake(
        camera: Phaser.Cameras.Scene2D.Camera,
        duration: number,
        intensity: number,
    ): void {
        camera.shake(duration, intensity);
    }
}
