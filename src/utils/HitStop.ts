/**
 * Hit Stop (Frame Freeze) Utility
 *
 * Temporarily pauses physics to create a sense of impact during combat.
 * Uses Phaser's scene.time (not browser setTimeout) to avoid deadlock with
 * animation completion events.
 */
export class HitStop {
    private static isFrozen: boolean = false;
    private static freezeTimer: Phaser.Time.TimerEvent | null = null;

    /**
     * Freeze physics for a short duration (in frames at 60fps)
     * @param scene The Phaser scene
     * @param frames Duration in frames (e.g. 8 = ~133ms at 60fps)
     */
    static freeze(scene: Phaser.Scene, frames: number): void {
        // If already frozen, cancel existing timer and restart
        if (this.isFrozen && this.freezeTimer) {
            this.freezeTimer.remove(false);
            this.freezeTimer = null;
        }

        this.isFrozen = true;

        // Pause only physics — do NOT pause animations, as that blocks
        // animationcomplete events and causes a deadlock where isAttacking
        // never resets to false.
        scene.physics.world.pause();

        const durationMs = frames * (1000 / 60);

        this.freezeTimer = scene.time.delayedCall(durationMs, () => {
            if (!scene.sys.isActive()) {
                this.isFrozen = false;
                this.freezeTimer = null;
                return;
            }
            scene.physics.world.resume();
            this.isFrozen = false;
            this.freezeTimer = null;
        });
    }
}
