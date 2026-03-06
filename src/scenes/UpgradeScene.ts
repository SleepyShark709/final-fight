/**
 * 升级场景（覆盖层）
 * 全屏覆盖在 HubScene 之上，展示8种永久升级
 * W/A/S/D 导航，J 购买，R 重置，ESC 关闭
 */
import Phaser from 'phaser';
import {
    SCENES,
    GAME_WIDTH,
    GAME_HEIGHT,
    DEPTH,
    UPGRADE,
} from '@/utils/Constants';
import { MetaProgress } from '@/core/MetaProgress';
import { SaveManager } from '@/core/SaveManager';
import { UpgradeData } from '@/config/UpgradeTable';

/** 单个升级卡片 */
interface UpgradeCard {
    container: Phaser.GameObjects.Container;
    data: UpgradeData;
    levelText: Phaser.GameObjects.Text;
    costText: Phaser.GameObjects.Text;
    descText: Phaser.GameObjects.Text;
    bg: Phaser.GameObjects.Graphics;
    barGfx: Phaser.GameObjects.Graphics;
    index: number;
}

export class UpgradeScene extends Phaser.Scene {
    private cards: UpgradeCard[] = [];
    private selectedIndex: number = 0;
    private shardsText!: Phaser.GameObjects.Text;
    private infoText!: Phaser.GameObjects.Text;

    constructor() {
        super({ key: SCENES.UPGRADE });
    }

    create(): void {
        // 重置状态（Phaser 场景是单例，re-launch 时 create 会在同一实例上调用）
        this.cards = [];
        this.selectedIndex = 0;

        // 半透明背景遮罩
        const overlay = this.add.graphics();
        overlay.fillStyle(0x000000, 0.75);
        overlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        overlay.setDepth(DEPTH.BLESSING_OVERLAY);

        // 标题
        this.add
            .text(GAME_WIDTH / 2, 36, '✦ 记 忆 之 镜 ✦', {
                fontSize: '22px',
                color: '#cc99ff',
                fontFamily: 'monospace',
                stroke: '#000000',
                strokeThickness: 4,
            })
            .setOrigin(0.5)
            .setDepth(DEPTH.BLESSING_OVERLAY + 1);

        // 碎片余额
        this.shardsText = this.add
            .text(GAME_WIDTH / 2, 66, '', {
                fontSize: '16px',
                color: '#ffdd88',
                fontFamily: 'monospace',
                stroke: '#000000',
                strokeThickness: 3,
            })
            .setOrigin(0.5)
            .setDepth(DEPTH.BLESSING_OVERLAY + 1);

        // 创建卡片网格
        this.createCards();

        // 效果预览文本
        this.infoText = this.add
            .text(GAME_WIDTH / 2, GAME_HEIGHT - 70, '', {
                fontSize: '13px',
                color: '#ffffff',
                fontFamily: 'monospace',
                stroke: '#000000',
                strokeThickness: 3,
                align: 'center',
            })
            .setOrigin(0.5)
            .setDepth(DEPTH.BLESSING_OVERLAY + 1);

        // 操作提示
        this.add
            .text(GAME_WIDTH / 2, GAME_HEIGHT - 30, '[W/A/S/D] 选择  [J] 升级  [R] 重置  [ESC] 关闭', {
                fontSize: '12px',
                color: '#888888',
                fontFamily: 'monospace',
                stroke: '#000000',
                strokeThickness: 2,
            })
            .setOrigin(0.5)
            .setDepth(DEPTH.BLESSING_OVERLAY + 1);

        // 绑定键盘
        this.setupInput();

        // 初始状态
        this.updateShardsDisplay();
        this.updateSelection();

        // 入场动画
        this.cameras.main.fadeIn(200, 0, 0, 0);
    }

    private createCards(): void {
        const allUpgrades = MetaProgress.getAllUpgrades();

        // 计算网格起始位置（居中）
        const totalWidth = UPGRADE.COLS * UPGRADE.CARD_WIDTH + (UPGRADE.COLS - 1) * UPGRADE.GAP_X;
        const totalHeight = UPGRADE.ROWS * UPGRADE.CARD_HEIGHT + (UPGRADE.ROWS - 1) * UPGRADE.GAP_Y;
        const startX = (GAME_WIDTH - totalWidth) / 2 + UPGRADE.CARD_WIDTH / 2;
        const startY = (GAME_HEIGHT - totalHeight) / 2 + UPGRADE.CARD_HEIGHT / 2 + 10;

        allUpgrades.forEach((upgradeInfo, i) => {
            const col = i % UPGRADE.COLS;
            const row = Math.floor(i / UPGRADE.COLS);
            const cx = startX + col * (UPGRADE.CARD_WIDTH + UPGRADE.GAP_X);
            const cy = startY + row * (UPGRADE.CARD_HEIGHT + UPGRADE.GAP_Y);

            const container = this.add.container(cx, cy);
            container.setDepth(DEPTH.BLESSING_OVERLAY + 2);

            // 背景卡片
            const bg = this.add.graphics();
            this.drawCardBg(bg, upgradeInfo, false);
            container.add(bg);

            // 图标（彩色圆形）
            const icon = this.add.graphics();
            icon.fillStyle(upgradeInfo.color, 1);
            icon.fillCircle(0, -55, 18);
            icon.fillStyle(0xffffff, 0.3);
            icon.fillCircle(-4, -59, 6);
            container.add(icon);

            // 名称
            const nameText = this.add
                .text(0, -25, upgradeInfo.name, {
                    fontSize: '15px',
                    color: '#ffffff',
                    fontFamily: 'monospace',
                    stroke: '#000000',
                    strokeThickness: 3,
                })
                .setOrigin(0.5);
            container.add(nameText);

            // 描述
            const totalValue = upgradeInfo.valuePerLevel * upgradeInfo.currentLevel;
            const maxValue = upgradeInfo.valuePerLevel * upgradeInfo.maxLevel;
            const descStr = upgradeInfo.description.replace('{value}', `${totalValue}/${maxValue}`);
            const descText = this.add
                .text(0, 0, descStr, {
                    fontSize: '11px',
                    color: '#aaaaaa',
                    fontFamily: 'monospace',
                    stroke: '#000000',
                    strokeThickness: 2,
                    align: 'center',
                    wordWrap: { width: UPGRADE.CARD_WIDTH - 24, useAdvancedWrap: true },
                })
                .setOrigin(0.5);
            container.add(descText);

            // 等级文本
            const levelText = this.add
                .text(0, 30, `Lv ${upgradeInfo.currentLevel}/${upgradeInfo.maxLevel}`, {
                    fontSize: '14px',
                    color: '#ffdd88',
                    fontFamily: 'monospace',
                    stroke: '#000000',
                    strokeThickness: 3,
                })
                .setOrigin(0.5);
            container.add(levelText);

            // 进度条
            const barGfx = this.add.graphics();
            this.drawLevelBar(barGfx, upgradeInfo.currentLevel, upgradeInfo.maxLevel, upgradeInfo.color);
            container.add(barGfx);

            // 费用
            const costStr = upgradeInfo.nextCost < 0 ? '已满级' : `◆ ${upgradeInfo.nextCost}`;
            const costColor = upgradeInfo.nextCost < 0 ? '#66ff66' : '#ffffff';
            const costText = this.add
                .text(0, 72, costStr, {
                    fontSize: '13px',
                    color: costColor,
                    fontFamily: 'monospace',
                    stroke: '#000000',
                    strokeThickness: 3,
                })
                .setOrigin(0.5);
            container.add(costText);

            this.cards.push({
                container,
                data: upgradeInfo,
                levelText,
                costText,
                descText,
                bg,
                barGfx,
                index: i,
            });
        });
    }

    /** 绘制卡片背景 */
    private drawCardBg(gfx: Phaser.GameObjects.Graphics, data: UpgradeData, selected: boolean): void {
        gfx.clear();
        const w = UPGRADE.CARD_WIDTH;
        const h = UPGRADE.CARD_HEIGHT;

        if (selected) {
            gfx.fillStyle(0x443366, 0.95);
            gfx.fillRoundedRect(-w / 2 - 2, -h / 2 - 2, w + 4, h + 4, 10);
            gfx.lineStyle(2, data.color, 1);
            gfx.strokeRoundedRect(-w / 2 - 2, -h / 2 - 2, w + 4, h + 4, 10);
        } else {
            gfx.fillStyle(0x221133, 0.9);
            gfx.fillRoundedRect(-w / 2, -h / 2, w, h, 8);
            gfx.lineStyle(1, 0x554477, 0.6);
            gfx.strokeRoundedRect(-w / 2, -h / 2, w, h, 8);
        }
    }

    /** 绘制等级进度条 */
    private drawLevelBar(
        gfx: Phaser.GameObjects.Graphics,
        level: number,
        maxLevel: number,
        color: number,
    ): void {
        const barWidth = UPGRADE.CARD_WIDTH - 40;
        const barHeight = 6;
        const barY = 48;

        gfx.clear();
        // 底色
        gfx.fillStyle(0x111111, 0.8);
        gfx.fillRoundedRect(-barWidth / 2, barY, barWidth, barHeight, 3);
        // 进度
        if (level > 0) {
            const fillWidth = (barWidth * level) / maxLevel;
            gfx.fillStyle(color, 0.9);
            gfx.fillRoundedRect(-barWidth / 2, barY, fillWidth, barHeight, 3);
        }
    }

    /** 更新选中状态 */
    private updateSelection(): void {
        this.cards.forEach((card, i) => {
            const isSelected = i === this.selectedIndex;
            this.drawCardBg(card.bg, card.data, isSelected);
            card.container.setScale(isSelected ? 1.05 : 1.0);
        });

        // 更新效果预览
        const selected = this.cards[this.selectedIndex];
        if (selected) {
            const data = selected.data;
            const level = MetaProgress.getLevel(data.id);
            const currentValue = data.valuePerLevel * level;
            const nextValue = level < data.maxLevel ? data.valuePerLevel * (level + 1) : currentValue;
            const unit = data.effectType === 'crit_chance' || data.effectType === 'gold_bonus' || data.effectType === 'blessing_luck' ? '%' : '';

            if (level >= data.maxLevel) {
                this.infoText.setText(`${data.name} — 已达到最高等级 (${currentValue}${unit})`);
            } else {
                this.infoText.setText(`${data.name} — 当前: ${currentValue}${unit} → 升级后: ${nextValue}${unit}`);
            }
        }
    }

    /** 更新碎片显示 */
    private updateShardsDisplay(): void {
        const shards = SaveManager.getData().memoryShards;
        this.shardsText.setText(`记忆碎片: ◆ ${shards}`);
    }

    /** 刷新单张卡片数据 */
    private refreshCard(card: UpgradeCard): void {
        const level = MetaProgress.getLevel(card.data.id);
        const nextCost = MetaProgress.getNextCost(card.data.id);

        card.levelText.setText(`Lv ${level}/${card.data.maxLevel}`);

        // 刷新描述
        const totalValue = card.data.valuePerLevel * level;
        const maxValue = card.data.valuePerLevel * card.data.maxLevel;
        card.descText.setText(card.data.description.replace('{value}', `${totalValue}/${maxValue}`));

        // 刷新进度条
        this.drawLevelBar(card.barGfx, level, card.data.maxLevel, card.data.color);

        if (nextCost < 0) {
            card.costText.setText('已满级');
            card.costText.setColor('#66ff66');
        } else {
            card.costText.setText(`◆ ${nextCost}`);
            card.costText.setColor('#ffffff');
        }
    }

    /** 绑定键盘输入 */
    private setupInput(): void {
        this.input.keyboard?.on('keydown-A', () => this.moveSelection(-1, 0));
        this.input.keyboard?.on('keydown-D', () => this.moveSelection(1, 0));
        this.input.keyboard?.on('keydown-W', () => this.moveSelection(0, -1));
        this.input.keyboard?.on('keydown-S', () => this.moveSelection(0, 1));
        this.input.keyboard?.on('keydown-LEFT', () => this.moveSelection(-1, 0));
        this.input.keyboard?.on('keydown-RIGHT', () => this.moveSelection(1, 0));
        this.input.keyboard?.on('keydown-UP', () => this.moveSelection(0, -1));
        this.input.keyboard?.on('keydown-DOWN', () => this.moveSelection(0, 1));
        this.input.keyboard?.on('keydown-J', () => this.handlePurchase());
        this.input.keyboard?.on('keydown-R', () => this.handleReset());
        this.input.keyboard?.on('keydown-ESC', () => this.closePanel());
    }

    /** 移动选择光标 */
    private moveSelection(dx: number, dy: number): void {
        const col = this.selectedIndex % UPGRADE.COLS;
        const row = Math.floor(this.selectedIndex / UPGRADE.COLS);
        const newCol = Phaser.Math.Clamp(col + dx, 0, UPGRADE.COLS - 1);
        const newRow = Phaser.Math.Clamp(row + dy, 0, UPGRADE.ROWS - 1);
        const newIndex = newRow * UPGRADE.COLS + newCol;

        if (newIndex < this.cards.length) {
            this.selectedIndex = newIndex;
            this.updateSelection();
        }
    }

    /** 购买升级 */
    private handlePurchase(): void {
        const card = this.cards[this.selectedIndex];
        if (!card) return;

        if (MetaProgress.canUpgrade(card.data.id)) {
            MetaProgress.purchaseUpgrade(card.data.id);
            this.refreshCard(card);
            this.updateShardsDisplay();
            this.updateSelection();
            this.cameras.main.flash(100, 200, 180, 255, false);
        } else {
            this.cameras.main.shake(100, 0.005);
        }
    }

    /** 重置选中升级 */
    private handleReset(): void {
        const card = this.cards[this.selectedIndex];
        if (!card) return;

        const refunded = MetaProgress.resetUpgrade(card.data.id);
        if (refunded > 0) {
            this.refreshCard(card);
            this.updateShardsDisplay();
            this.updateSelection();
            this.cameras.main.flash(100, 255, 200, 100, false);
        }
    }

    /** 关闭面板，返回 HubScene */
    private closePanel(): void {
        this.cameras.main.fadeOut(200, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            this.scene.stop();
            this.scene.get(SCENES.HUB)?.events.emit('upgrade-panel-closed');
        });
    }
}
