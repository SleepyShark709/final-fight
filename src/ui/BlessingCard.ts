/**
 * 祝福卡牌 UI 组件
 * 在 BlessingSelectScene 中展示一张可选祝福
 */
import Phaser from 'phaser';
import { BlessingData } from '@/config/BlessingConfig';
import { BLESSING } from '@/utils/Constants';

export class BlessingCard extends Phaser.GameObjects.Container {
    private blessing: BlessingData;
    private bg!: Phaser.GameObjects.Graphics;
    private index: number;

    static readonly CARD_WIDTH = 220;
    static readonly CARD_HEIGHT = 300;

    constructor(scene: Phaser.Scene, x: number, y: number, blessing: BlessingData, index: number) {
        super(scene, x, y);
        this.blessing = blessing;
        this.index = index;

        this.createCard();
        this.setSize(BlessingCard.CARD_WIDTH, BlessingCard.CARD_HEIGHT);
        this.setInteractive();

        scene.add.existing(this);
    }

    private createCard(): void {
        const W = BlessingCard.CARD_WIDTH;
        const H = BlessingCard.CARD_HEIGHT;

        // 卡牌背景
        this.bg = this.scene.add.graphics();
        this.bg.fillStyle(0x1a1a2e, 0.95);
        this.bg.fillRoundedRect(-W / 2, -H / 2, W, H, 12);
        // 边框
        this.bg.lineStyle(2, BLESSING.RARITY_COLORS[this.blessing.rarity], 1);
        this.bg.strokeRoundedRect(-W / 2, -H / 2, W, H, 12);
        this.add(this.bg);

        // 神明图标圆形
        const godColor = BLESSING.GOD_COLORS[this.blessing.god];
        const iconGraphics = this.scene.add.graphics();
        iconGraphics.fillStyle(godColor, 1);
        iconGraphics.fillCircle(0, -H / 2 + 50, 22);
        iconGraphics.lineStyle(2, 0xffffff, 0.6);
        iconGraphics.strokeCircle(0, -H / 2 + 50, 22);
        this.add(iconGraphics);

        // 神明名称映射
        const godNames: Record<string, string> = { fire: '火', thunder: '雷', ice: '冰' };
        const godLabel = this.scene.add.text(0, -H / 2 + 45, godNames[this.blessing.god], {
            fontSize: '18px', color: '#ffffff', fontStyle: 'bold',
        });
        godLabel.setOrigin(0.5);
        this.add(godLabel);

        // 祝福名称
        const nameText = this.scene.add.text(0, -H / 2 + 85, this.blessing.name, {
            fontSize: '16px', color: '#ffffff', fontStyle: 'bold',
        });
        nameText.setOrigin(0.5);
        this.add(nameText);

        // 稀有度
        const rarityNames: Record<string, string> = { common: '普通', rare: '稀有', epic: '史诗' };
        const rarityColor = BLESSING.RARITY_COLORS[this.blessing.rarity];
        const rarityText = this.scene.add.text(0, -H / 2 + 108, rarityNames[this.blessing.rarity], {
            fontSize: '12px', color: `#${rarityColor.toString(16).padStart(6, '0')}`,
        });
        rarityText.setOrigin(0.5);
        this.add(rarityText);

        // 槽位
        const slotNames: Record<string, string> = { attack: '攻击', skill: '技能', dash: '冲刺', passive: '被动' };
        const slotText = this.scene.add.text(0, -H / 2 + 128, `[${slotNames[this.blessing.slot]}]`, {
            fontSize: '12px', color: '#888888',
        });
        slotText.setOrigin(0.5);
        this.add(slotText);

        // 分隔线
        const line = this.scene.add.graphics();
        line.lineStyle(1, 0x444466, 0.6);
        line.lineBetween(-W / 2 + 20, -H / 2 + 145, W / 2 - 20, -H / 2 + 145);
        this.add(line);

        // 效果描述（自动换行）
        const descText = this.scene.add.text(0, -H / 2 + 160, this.blessing.description, {
            fontSize: '13px',
            color: '#cccccc',
            wordWrap: { width: W - 40 },
            lineSpacing: 4,
            align: 'center',
        });
        descText.setOrigin(0.5, 0);
        this.add(descText);

        // 底部键位提示
        const keyText = this.scene.add.text(0, H / 2 - 25, `按 ${this.index + 1} 选择`, {
            fontSize: '14px', color: '#666688',
        });
        keyText.setOrigin(0.5);
        this.add(keyText);
    }

    /** 高亮/取消选中效果 */
    setSelected(selected: boolean): void {
        if (selected) {
            this.bg.clear();
            const W = BlessingCard.CARD_WIDTH;
            const H = BlessingCard.CARD_HEIGHT;
            this.bg.fillStyle(0x2a2a4e, 0.98);
            this.bg.fillRoundedRect(-W / 2, -H / 2, W, H, 12);
            this.bg.lineStyle(3, BLESSING.GOD_COLORS[this.blessing.god], 1);
            this.bg.strokeRoundedRect(-W / 2, -H / 2, W, H, 12);
            this.setScale(1.05);
        } else {
            this.bg.clear();
            const W = BlessingCard.CARD_WIDTH;
            const H = BlessingCard.CARD_HEIGHT;
            this.bg.fillStyle(0x1a1a2e, 0.95);
            this.bg.fillRoundedRect(-W / 2, -H / 2, W, H, 12);
            this.bg.lineStyle(2, BLESSING.RARITY_COLORS[this.blessing.rarity], 1);
            this.bg.strokeRoundedRect(-W / 2, -H / 2, W, H, 12);
            this.setScale(1.0);
        }
    }

    getData(): BlessingData {
        return this.blessing;
    }
}
