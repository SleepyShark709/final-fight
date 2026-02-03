/**
 * Hit Stop (Frame Freeze) Utility
 *
 * Provides a way to temporarily pause the game physics and animations
 * to create a sense of impact during combat.
 */
export class HitStop {
    private static isFrozen: boolean = false;
    private static timer: any = null;

    /**
     * Freeze the game for a short duration
     * @param scene The Phaser scene to freeze
     * @param duration Duration in milliseconds
     */
    static freeze(scene: Phaser.Scene, duration: number): void {
        // If already frozen, just update the timer if the new duration is longer?
        // For simplicity, we'll just ignore new freeze requests if already frozen significant amount,
        // or we could overwrite. Let's overwrite to ensure the latest strongest hit is felt.

        if (this.isFrozen) {
            clearTimeout(this.timer);
        }

        this.isFrozen = true;

        // Pause physics
        if (scene.physics.world) {
            scene.physics.world.timeScale = 0;
        }

        // Pause animations
        scene.anims.pauseAll();

        // Resume after duration
        this.timer = setTimeout(() => {
            if (!scene || !scene.sys || !scene.sys.isActive()) {
                // Scene might be destroyed during freeze
                this.isFrozen = false;
                return;
            }

            if (scene.physics.world) {
                scene.physics.world.timeScale = 1;
            }
            scene.anims.resumeAll();
            this.isFrozen = false;
        }, duration);
    }
}
