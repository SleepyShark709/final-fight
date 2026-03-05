/**
 * 祝福选择场景
 * 覆盖层场景，房间清理后弹出，展示3张祝福卡牌供玩家选择
 */
import Phaser from 'phaser';
import { SCENES, GAME_WIDTH, GAME_HEIGHT, DEPTH } from '@/utils/Constants';
import { BlessingCard } from '@/ui/BlessingCard';
import { BlessingManager } from '@/combat/BlessingManager';
import { RunManager } from '@/core/RunManager';
import { BlessingData } from '@/config/BlessingConfig';

interface BlessingSelectData {
    blessingManager: BlessingManager;
    runManager: RunManager;
    luckBonus?: number;
}

export class BlessingSelectScene extends Phaser.Scene {
    private blessingManager!: BlessingManager;
    private runManager!: RunManager;
    private cards: BlessingCard[] = [];
    private isSelecting: boolean = true;
    private luckBonus: number = 0;

    constructor() {
        super({ key: SCENES.BLESSING });
    }

    init(data: BlessingSelectData): void {
        this.blessingManager = data.blessingManager;
        this.runManager = data.runManager;
        this.luckBonus = data.luckBonus ?? 0;
    }

    create(): void {
        this.isSelecting = true;
        this.cards = [];

        // 半透明遮罩
        const overlay = this.add.rectangle(
            GAME_WIDTH / 2, GAME_HEIGHT / 2,
            GAME_WIDTH, GAME_HEIGHT,
            0x000000, 0.7,
        );
        overlay.setDepth(DEPTH.BLESSING_OVERLAY);
        overlay.setScrollFactor(0);

        // 获取候选祝福
        const blessings = this.blessingManager.rollBlessings(3, this.luckBonus);

        if (blessings.length === 0) {
            // 没有可用祝福，直接关闭
            this.closeScene();
            return;
        }

        // 标题
        const title = this.add.text(GAME_WIDTH / 2, 50, '选择祝福', {
            fontSize: '28px',
            color: '#ffffff',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 4,
        });
        title.setOrigin(0.5);
        title.setDepth(DEPTH.BLESSING_OVERLAY + 1);
        title.setScrollFactor(0);

        // 计算卡牌布局
        const cardSpacing = 240;
        const totalWidth = (blessings.length - 1) * cardSpacing;
        const startX = GAME_WIDTH / 2 - totalWidth / 2;

        // 创建卡牌（带入场动画）
        blessings.forEach((blessing: BlessingData, index: number) => {
            const targetY = GAME_HEIGHT / 2 + 20;
            const card = new BlessingCard(
                this,
                startX + index * cardSpacing,
                targetY + 100, // 起始位置偏下，用于入场动画
                blessing,
                index,
            );
            card.setDepth(DEPTH.BLESSING_OVERLAY + 2);
            card.setScrollFactor(0);

            // 入场动画：从下方滑入
            card.setAlpha(0);
            this.tweens.add({
                targets: card,
                y: targetY,
                alpha: 1,
                duration: 400,
                delay: index * 100,
                ease: 'Back.easeOut',
            });

            // 鼠标 hover/click
            card.on('pointerover', () => {
                if (!this.isSelecting) return;
                this.highlightCard(index);
            });
            card.on('pointerout', () => {
                if (!this.isSelecting) return;
                card.setSelected(false);
            });
            card.on('pointerdown', () => {
                if (!this.isSelecting) return;
                this.selectBlessing(index);
            });

            this.cards.push(card);
        });

        // 键盘选择 1/2/3
        this.input.keyboard?.on('keydown-ONE', () => this.selectBlessing(0));
        this.input.keyboard?.on('keydown-TWO', () => this.selectBlessing(1));
        this.input.keyboard?.on('keydown-THREE', () => this.selectBlessing(2));

        // 底部提示
        const hint = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 40, '点击卡牌或按 1/2/3 选择', {
            fontSize: '14px',
            color: '#888888',
        });
        hint.setOrigin(0.5);
        hint.setDepth(DEPTH.BLESSING_OVERLAY + 1);
        hint.setScrollFactor(0);
    }

    private highlightCard(index: number): void {
        this.cards.forEach((card, i) => card.setSelected(i === index));
    }

    private selectBlessing(index: number): void {
        if (!this.isSelecting) return;
        if (index < 0 || index >= this.cards.length) return;

        this.isSelecting = false;
        const selectedBlessing = this.cards[index].getData();

        // 高亮选中的卡牌
        this.highlightCard(index);

        // 选中动画：放大 + 闪光
        this.tweens.add({
            targets: this.cards[index],
            scaleX: 1.15,
            scaleY: 1.15,
            duration: 200,
            ease: 'Power2',
        });

        // 未选中的卡牌淡出
        this.cards.forEach((card, i) => {
            if (i !== index) {
                this.tweens.add({
                    targets: card,
                    alpha: 0,
                    y: card.y + 50,
                    duration: 300,
                    ease: 'Power2',
                });
            }
        });

        // 延迟后应用祝福并关闭
        this.time.delayedCall(500, () => {
            this.applyBlessing(selectedBlessing);
        });
    }

    private applyBlessing(blessing: BlessingData): void {
        this.blessingManager.addBlessing(blessing);
        this.runManager.addBlessing(blessing.id);
        this.closeScene();
    }

    private closeScene(): void {
        // 通知 RunScene 祝福选择完成
        const runScene = this.scene.get(SCENES.RUN);
        if (runScene) {
            runScene.events.emit('blessing-selected');
        }

        // 淡出并关闭
        this.cameras.main.fadeOut(200, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            this.scene.stop();
        });
    }
}
