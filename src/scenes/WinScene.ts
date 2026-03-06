import Phaser from 'phaser';
import { SCENES, GAME_WIDTH, GAME_HEIGHT } from '../utils/Constants';
import { SaveManager } from '@/core/SaveManager';

interface WinData {
    runState?: {
        kills: number;
        roomsCleared: number;
        runShards: number;
        runGold: number;
    };
}

export class WinScene extends Phaser.Scene {
    constructor() {
        super({ key: SCENES.WIN });
    }

    create(data: WinData): void {
        const x = GAME_WIDTH / 2;
        const y = GAME_HEIGHT / 2;
        const runState = data.runState;

        // 持久化通关数据
        if (runState) {
            SaveManager.recordRun(runState.kills, runState.roomsCleared, runState.runShards, true);
            if (runState.runGold > 0) {
                SaveManager.addGold(runState.runGold);
            }
        }

        this.add
            .text(x, y - 50, '通关胜利!', {
                fontSize: '64px',
                color: '#ffff00',
                fontStyle: 'bold',
            })
            .setOrigin(0.5);

        this.add
            .text(x, y + 50, '感谢游玩!', {
                fontSize: '32px',
                color: '#ffffff',
            })
            .setOrigin(0.5);

        // 通关统计
        if (runState) {
            this.add
                .text(x, y + 90, `击杀: ${runState.kills}  房间: ${runState.roomsCleared}  碎片: ${runState.runShards}`, {
                    fontSize: '16px',
                    color: '#aaaaaa',
                })
                .setOrigin(0.5);
        }

        this.add
            .text(x, y + 130, '按 R 返回据点', {
                fontSize: '24px',
                color: '#cccccc',
            })
            .setOrigin(0.5);

        this.input.keyboard?.on('keydown-R', () => {
            this.scene.start(SCENES.HUB);
        });
    }
}
