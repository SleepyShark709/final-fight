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
            .text(x, y - 50, 'GAME OVER', {
                fontSize: '64px',
                color: '#ff0000',
                fontStyle: 'bold',
            })
            .setOrigin(0.5);

        this.add
            .text(x, y + 50, 'Press R to Restart', {
                fontSize: '32px',
                color: '#ffffff',
            })
            .setOrigin(0.5);

        this.input.keyboard?.on('keydown-R', () => {
            this.scene.stop(SCENES.UI);
            this.scene.start(SCENES.GAME);
            this.scene.start(SCENES.UI);
        });
    }
}
