/**
 * 祝福卡牌 UI 组件
 * 在 BlessingSelectScene 中展示一张可选祝福
 */
import Phaser from 'phaser';
import { BlessingData } from '@/config/BlessingConfig';
import { ASSETS, BLESSING } from '@/utils/Constants';

export class BlessingCard extends Phaser.GameObjects.Container {
    private blessing: BlessingData;
    private bg!: Phaser.GameObjects.NineSlice;
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

        // 卡牌背景（Ancient 风格 NineSlice 面板）
        this.bg = this.scene.add.nineslice(
            0, 0, ASSETS.UI_PANEL_BROWN, undefined,
            W, H, 8, 8, 8, 8
        );
        this.bg.setOrigin(0.5);
        this.bg.setAlpha(0.95);
        this.add(this.bg);

        // 稀有度边框
        const border = this.scene.add.graphics();
        border.lineStyle(2, BLESSING.RARITY_COLORS[this.blessing.rarity], 1);
        border.strokeRoundedRect(-W / 2, -H / 2, W, H, 12);
        this.add(border);

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
            wordWrap: { width: W - 30, useAdvancedWrap: true },
            align: 'center',
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

        // 效果描述（自动换行，超长时自动缩小字体避免与键位提示重叠）
        const descY = -H / 2 + 160;
        const maxDescBottom = H / 2 - 45;
        let descFontSize = 13;
        const minDescFontSize = 10;

        const descText = this.scene.add.text(0, descY, this.blessing.description, {
            fontSize: `${descFontSize}px`,
            color: '#cccccc',
            wordWrap: { width: W - 40, useAdvancedWrap: true },
            lineSpacing: 4,
            align: 'center',
        });
        descText.setOrigin(0.5, 0);

        // 逐步缩小字体直到描述不溢出
        while (descText.y + descText.height > maxDescBottom && descFontSize > minDescFontSize) {
            descFontSize--;
            descText.setFontSize(descFontSize);
        }
        this.add(descText);

        // 底部键位提示（确保不与描述重叠）
        const descBottom = descText.y + descText.height;
        const keyY = Math.max(descBottom + 15, H / 2 - 25);
        const keyText = this.scene.add.text(0, keyY, `按 ${this.index + 1} 选择`, {
            fontSize: '14px', color: '#666688',
        });
        keyText.setOrigin(0.5);
        this.add(keyText);
    }

    /** 高亮/取消选中效果 */
    setSelected(selected: boolean): void {
        if (selected) {
            // 选中态：切换为亮色面板 + 放大
            this.bg.setTexture(ASSETS.UI_PANEL_TAN);
            this.setScale(1.05);
        } else {
            // 普通态：切换为暗色面板 + 恢复缩放
            this.bg.setTexture(ASSETS.UI_PANEL_BROWN);
            this.setScale(1.0);
        }
    }

    getData(): BlessingData {
        return this.blessing;
    }
}
