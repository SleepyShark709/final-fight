import Phaser from 'phaser';
import { SCENES, GAME_WIDTH, GAME_HEIGHT } from '../utils/Constants';

export class GameOverScene extends Phaser.Scene {
    constructor() {
        super({ key: SCENES.GAME_OVER });
    }

    create(): void {
        const x = GAME_WIDTH / 2;
        const y = GAME_HEIGHT / 2;

        this.add
            .text(x, y - 50, '游戏结束', {
                fontSize: '64px',
                color: '#ff0000',
                fontStyle: 'bold',
            })
            .setOrigin(0.5);

        this.add
            .text(x, y + 50, '按 R 返回据点', {
                fontSize: '32px',
                color: '#ffffff',
            })
            .setOrigin(0.5);

        this.input.keyboard?.on('keydown-R', () => {
            this.scene.stop(SCENES.UI);
            this.scene.start(SCENES.HUB);
        });
    }
}
