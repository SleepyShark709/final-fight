/**
 * 玩家数值面板
 * 显示玩家属性、祝福列表，支持滚轮滚动和 Mask 裁剪
 */

import { Player } from '../entities/Player';
import { BlessingManager } from '@/combat/BlessingManager';
import { BlessingData } from '@/config/BlessingConfig';
import { ASSETS, GAME_WIDTH, GAME_HEIGHT, STATS_PANEL } from '../utils/Constants';

/** 神名映射 */
const GOD_NAME_MAP: Record<string, string> = {
    fire: '火',
    thunder: '雷',
    ice: '冰',
};

/** 槽位映射 */
const SLOT_NAME_MAP: Record<string, string> = {
    attack: '攻击',
    skill: '技能',
    dash: '冲刺',
    passive: '被动',
};

export class PlayerStatsPanel {
    private scene: Phaser.Scene;
    private player: Player;
    private blessingManager?: BlessingManager;
    private container?: Phaser.GameObjects.Container;
    private isVisible: boolean = false;

    // UI 元素
    private background?: Phaser.GameObjects.NineSlice;
    private titleText?: Phaser.GameObjects.Text;
    private statsText?: Phaser.GameObjects.Text;
    private hintText?: Phaser.GameObjects.Text;
    private maskGraphics?: Phaser.GameObjects.Graphics;

    // 滚动状态
    private scrollY: number = 0;
    private maxScrollY: number = 0;
    private contentStartY: number = 0;

    // 滚轮事件回调引用（用于注销）
    private wheelHandler?: (pointer: Phaser.Input.Pointer, gameObjects: any[], deltaX: number, deltaY: number) => void;

    constructor(scene: Phaser.Scene, player: Player, blessingManager?: BlessingManager) {
        this.scene = scene;
        this.player = player;
        this.blessingManager = blessingManager;
        this.createPanel();
    }

    /**
     * 创建面板
     */
    private createPanel(): void {
        const panelWidth = STATS_PANEL.WIDTH;
        const panelHeight = STATS_PANEL.HEIGHT;
        const panelX = GAME_WIDTH / 2;
        const panelY = GAME_HEIGHT / 2;

        // 创建容器
        this.container = this.scene.add.container(0, 0);
        this.container.setDepth(2000);
        this.container.setScrollFactor(0);

        // 背景
        this.background = this.scene.add.nineslice(
            panelX, panelY, ASSETS.UI_PANEL_GREY, undefined,
            panelWidth, panelHeight, 8, 8, 8, 8,
        );
        this.background.setAlpha(0.9);

        // 标题
        this.titleText = this.scene.add.text(
            panelX,
            panelY - panelHeight / 2 + 16,
            '玩家属性',
            {
                fontSize: '18px',
                color: '#00ff00',
                fontStyle: 'bold',
            },
        );
        this.titleText.setOrigin(0.5, 0);

        // 内容区域起始 Y
        this.contentStartY = panelY - panelHeight / 2 + STATS_PANEL.PADDING_TOP;

        // 数值文本
        this.statsText = this.scene.add.text(
            panelX - panelWidth / 2 + STATS_PANEL.PADDING_LEFT,
            this.contentStartY,
            '',
            {
                fontSize: `${STATS_PANEL.FONT_SIZE}px`,
                color: '#ffffff',
                lineSpacing: STATS_PANEL.LINE_SPACING,
            },
        );

        // 底部提示文字
        this.hintText = this.scene.add.text(
            panelX,
            panelY + panelHeight / 2 - 18,
            '按 C 关闭 | 滚轮翻页',
            {
                fontSize: '12px',
                color: '#888888',
            },
        );
        this.hintText.setOrigin(0.5, 0.5);

        // 创建 Mask（裁剪内容区域，不遮挡标题和底部提示）
        this.maskGraphics = this.scene.add.graphics();
        this.maskGraphics.fillStyle(0xffffff);
        const maskTop = this.contentStartY;
        const maskBottom = panelY + panelHeight / 2 - STATS_PANEL.PADDING_BOTTOM;
        this.maskGraphics.fillRect(
            panelX - panelWidth / 2,
            maskTop,
            panelWidth,
            maskBottom - maskTop,
        );
        this.maskGraphics.setScrollFactor(0);
        const mask = new Phaser.Display.Masks.GeometryMask(this.scene, this.maskGraphics);
        this.statsText.setMask(mask);

        // 添加到容器
        this.container.add([this.background, this.titleText, this.statsText, this.hintText]);

        // 默认隐藏
        this.container.setVisible(false);
        this.maskGraphics.setVisible(false);
    }

    /**
     * 更新面板数据
     */
    private updatePanelData(): void {
        if (!this.statsText) return;

        const healthPercent = Math.round(
            (this.player.health / this.player.maxHealth) * 100,
        );
        const critChancePercent = Math.round(this.player.criticalChance * 100);

        const lines: string[] = [
            '━━━ 基础属性 ━━━',
            `生命值: ${this.player.health}/${this.player.maxHealth} (${healthPercent}%)`,
            '',
            '━━━ 战斗属性 ━━━',
            `攻击力: ${this.player.attackDamage}`,
            `暴击率: ${critChancePercent}%`,
            `暴击倍率: ${this.player.criticalMultiplier}x`,
        ];

        // 祝福列表
        if (this.blessingManager) {
            const blessings: BlessingData[] = this.blessingManager.getActiveBlessings();
            lines.push('');
            lines.push(`━━━ 祝福 (${blessings.length}) ━━━`);
            if (blessings.length === 0) {
                lines.push('暂无祝福');
            } else {
                for (const b of blessings) {
                    const godName = GOD_NAME_MAP[b.god] || b.god;
                    const slotName = SLOT_NAME_MAP[b.slot] || b.slot;
                    lines.push(`[${godName}·${slotName}] ${b.name}`);
                    lines.push(`  ${b.description}`);
                }
            }
        }

        lines.push('');
        lines.push('━━━━━━━━━━━━');

        this.statsText.setText(lines.join('\n'));

        // 重置滚动位置
        this.scrollY = 0;
        this.statsText.setY(this.contentStartY);

        // 计算最大滚动量
        const panelHeight = STATS_PANEL.HEIGHT;
        const visibleHeight = panelHeight - STATS_PANEL.PADDING_TOP - STATS_PANEL.PADDING_BOTTOM;
        const contentHeight = this.statsText.height;
        this.maxScrollY = Math.max(0, contentHeight - visibleHeight);
    }

    /**
     * 注册滚轮事件
     */
    private registerWheel(): void {
        this.wheelHandler = (_pointer: Phaser.Input.Pointer, _gameObjects: any[], _deltaX: number, deltaY: number) => {
            if (!this.isVisible || !this.statsText) return;

            this.scrollY += deltaY > 0 ? STATS_PANEL.SCROLL_SPEED : -STATS_PANEL.SCROLL_SPEED;
            this.scrollY = Phaser.Math.Clamp(this.scrollY, 0, this.maxScrollY);
            this.statsText.setY(this.contentStartY - this.scrollY);
        };
        this.scene.input.on('wheel', this.wheelHandler);
    }

    /**
     * 注销滚轮事件
     */
    private unregisterWheel(): void {
        if (this.wheelHandler) {
            this.scene.input.off('wheel', this.wheelHandler);
            this.wheelHandler = undefined;
        }
    }

    /**
     * 切换面板显示/隐藏
     */
    public toggle(): void {
        this.isVisible = !this.isVisible;

        if (this.isVisible) {
            this.updatePanelData();
            this.registerWheel();
        } else {
            this.unregisterWheel();
        }

        this.container?.setVisible(this.isVisible);
        this.maskGraphics?.setVisible(this.isVisible);
    }

    /**
     * 销毁面板
     */
    public destroy(): void {
        this.unregisterWheel();
        this.maskGraphics?.destroy();
        this.container?.destroy();
    }

    /**
     * 获取面板可见状态
     */
    public get visible(): boolean {
        return this.isVisible;
    }
}
