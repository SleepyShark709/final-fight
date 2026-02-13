import Phaser from 'phaser';
import { SCENES, GAME_WIDTH, GAME_HEIGHT } from '../utils/Constants';

export class WinScene extends Phaser.Scene {
    constructor() {
        super({ key: SCENES.WIN });
    }

    create(): void {
        const x = GAME_WIDTH / 2;
        const y = GAME_HEIGHT / 2;

        this.add
            .text(x, y - 50, 'VICTORY!', {
                fontSize: '64px',
                color: '#ffff00',
                fontStyle: 'bold',
            })
            .setOrigin(0.5);

        this.add
            .text(x, y + 50, 'Thank you for playing!', {
                fontSize: '32px',
                color: '#ffffff',
            })
            .setOrigin(0.5);

        this.add
            .text(x, y + 100, 'Press R to Play Again', {
                fontSize: '24px',
                color: '#cccccc',
            })
            .setOrigin(0.5);

        this.input.keyboard?.on('keydown-R', () => {
            this.scene.start(SCENES.GAME);
        });
    }
}
