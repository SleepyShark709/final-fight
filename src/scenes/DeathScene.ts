/**
 * 死亡结算场景
 * 玩家死亡后展示本次运行的统计数据，并将结果持久化
 */
import Phaser from 'phaser';
import { SCENES, GAME_WIDTH, GAME_HEIGHT, DEPTH } from '@/utils/Constants';
import { SaveManager } from '@/core/SaveManager';

/** RunScene 传递过来的运行状态 */
interface RunState {
    kills: number;
    roomsCleared: number;
    damageTaken: number;
    damageDealt: number;
    runShards: number;
    runGold: number;
    currentBiome: string;
}

export class DeathScene extends Phaser.Scene {
    constructor() {
        super({ key: SCENES.DEATH });
    }

    create(data: { runState: RunState }): void {
        const runState = data.runState ?? {
            kills: 0,
            roomsCleared: 0,
            damageTaken: 0,
            damageDealt: 0,
            runShards: 0,
            runGold: 0,
            currentBiome: '未知',
        };

        // --- 持久化本次运行数据 ---
        SaveManager.recordRun(
            runState.kills,
            runState.roomsCleared,
            runState.runShards,
            false, // survived = false（玩家死亡）
        );

        const cx = GAME_WIDTH / 2;
        const cy = GAME_HEIGHT / 2;

        // --- 半透明黑色背景遮罩 ---
        this.add
            .rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.85)
            .setDepth(DEPTH.UI);

        // --- 标题：你倒下了... ---
        const title = this.add
            .text(cx, 60, '你倒下了...', {
                fontSize: '42px',
                color: '#cc2222',
                fontStyle: 'bold',
                fontFamily: 'monospace',
            })
            .setOrigin(0.5)
            .setDepth(DEPTH.UI)
            .setAlpha(0);

        // --- 统计面板背景 ---
        const panelX = cx;
        const panelY = cy - 10;
        const panelW = 360;
        const panelH = 260;

        const panelBg = this.add.graphics().setDepth(DEPTH.UI).setAlpha(0);
        panelBg.fillStyle(0x1a1a2e, 0.9);
        panelBg.fillRoundedRect(panelX - panelW / 2, panelY - panelH / 2, panelW, panelH, 12);
        panelBg.lineStyle(2, 0x444466, 1);
        panelBg.strokeRoundedRect(panelX - panelW / 2, panelY - panelH / 2, panelW, panelH, 12);

        // --- 运行统计 ---
        const stats: Array<{ label: string; value: number | string }> = [
            { label: '击杀数', value: runState.kills },
            { label: '清理房间', value: runState.roomsCleared },
            { label: '造成伤害', value: runState.damageDealt },
            { label: '承受伤害', value: runState.damageTaken },
            { label: '获得碎片', value: runState.runShards },
        ];

        const lineHeight = 40;
        const startY = panelY - panelH / 2 + 35;

        const statTexts: Phaser.GameObjects.Text[] = [];

        stats.forEach((stat, i) => {
            const y = startY + i * lineHeight;

            // 标签（左侧）
            const label = this.add
                .text(panelX - panelW / 2 + 40, y, stat.label, {
                    fontSize: '20px',
                    color: '#aaaacc',
                    fontFamily: 'monospace',
                })
                .setOrigin(0, 0.5)
                .setDepth(DEPTH.UI)
                .setAlpha(0);

            // 数值（右侧）
            const value = this.add
                .text(panelX + panelW / 2 - 40, y, `${stat.value}`, {
                    fontSize: '22px',
                    color: '#ffffff',
                    fontStyle: 'bold',
                    fontFamily: 'monospace',
                })
                .setOrigin(1, 0.5)
                .setDepth(DEPTH.UI)
                .setAlpha(0);

            statTexts.push(label, value);
        });

        // --- 分隔线 ---
        const divider = this.add.graphics().setDepth(DEPTH.UI).setAlpha(0);
        divider.lineStyle(1, 0x444466, 0.6);
        const dividerY = startY + stats.length * lineHeight - 10;
        divider.lineBetween(
            panelX - panelW / 2 + 20,
            dividerY,
            panelX + panelW / 2 - 20,
            dividerY,
        );

        // --- 返回据点按钮 ---
        const btnY = panelY + panelH / 2 + 50;
        const btnW = 200;
        const btnH = 46;

        const btnBg = this.add.graphics().setDepth(DEPTH.UI).setAlpha(0);
        const drawButton = (fillColor: number) => {
            btnBg.clear();
            btnBg.fillStyle(fillColor, 1);
            btnBg.fillRoundedRect(cx - btnW / 2, btnY - btnH / 2, btnW, btnH, 8);
            btnBg.lineStyle(2, 0xccccff, 0.6);
            btnBg.strokeRoundedRect(cx - btnW / 2, btnY - btnH / 2, btnW, btnH, 8);
        };
        drawButton(0x334455);

        const btnText = this.add
            .text(cx, btnY, '返回据点', {
                fontSize: '22px',
                color: '#ffffff',
                fontStyle: 'bold',
                fontFamily: 'monospace',
            })
            .setOrigin(0.5)
            .setDepth(DEPTH.UI)
            .setAlpha(0);

        // 按钮交互区域
        const btnZone = this.add
            .zone(cx, btnY, btnW, btnH)
            .setDepth(DEPTH.UI)
            .setInteractive({ useHandCursor: true });

        btnZone.on('pointerover', () => {
            drawButton(0x445566);
            btnText.setColor('#ffdd88');
        });

        btnZone.on('pointerout', () => {
            drawButton(0x334455);
            btnText.setColor('#ffffff');
        });

        btnZone.on('pointerdown', () => {
            this.cameras.main.fadeOut(400, 0, 0, 0);
            this.cameras.main.once('camerafadeoutcomplete', () => {
                this.scene.start(SCENES.HUB);
            });
        });

        // --- 淡入动画 ---
        this.cameras.main.fadeIn(600, 0, 0, 0);

        // 标题淡入
        this.tweens.add({
            targets: title,
            alpha: 1,
            duration: 800,
            delay: 200,
            ease: 'Power2',
        });

        // 面板背景淡入
        this.tweens.add({
            targets: [panelBg, divider],
            alpha: 1,
            duration: 600,
            delay: 500,
            ease: 'Power2',
        });

        // 统计数据逐行淡入
        statTexts.forEach((text, i) => {
            this.tweens.add({
                targets: text,
                alpha: 1,
                duration: 400,
                delay: 700 + Math.floor(i / 2) * 150,
                ease: 'Power2',
            });
        });

        // 按钮淡入
        this.tweens.add({
            targets: [btnBg, btnText],
            alpha: 1,
            duration: 500,
            delay: 1400,
            ease: 'Power2',
        });
    }
}
