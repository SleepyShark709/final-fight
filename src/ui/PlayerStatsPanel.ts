/**
 * 玩家数值面板
 * 显示玩家的各种属性和状态
 */

import { Player } from '../entities/Player';
import { GAME_WIDTH, GAME_HEIGHT } from '../utils/Constants';

export class PlayerStatsPanel {
    private scene: Phaser.Scene;
    private player: Player;
    private container?: Phaser.GameObjects.Container;
    private isVisible: boolean = false;

    // UI 元素
    private background?: Phaser.GameObjects.Rectangle;
    private titleText?: Phaser.GameObjects.Text;
    private statsText?: Phaser.GameObjects.Text;

    constructor(scene: Phaser.Scene, player: Player) {
        this.scene = scene;
        this.player = player;
        this.createPanel();
    }

    /**
     * 创建面板
     */
    private createPanel(): void {
        // 创建容器
        this.container = this.scene.add.container(0, 0);
        this.container.setDepth(2000); // 确保在最上层
        this.container.setScrollFactor(0); // 固定在屏幕上，不跟随相机

        // 面板尺寸和位置
        const panelWidth = 300;
        const panelHeight = 400;
        const panelX = (GAME_WIDTH - panelWidth) / 2;
        const panelY = (GAME_HEIGHT - panelHeight) / 2;

        // 背景（半透明黑色）
        this.background = this.scene.add.rectangle(
            panelX,
            panelY,
            panelWidth,
            panelHeight,
            0x000000,
            0.85,
        );
        this.background.setStrokeStyle(2, 0x00ff00, 1);

        // 标题
        this.titleText = this.scene.add.text(
            panelX,
            panelY - panelHeight / 2 + 20,
            '玩家属性',
            {
                fontSize: '24px',
                color: '#00ff00',
                fontStyle: 'bold',
            },
        );
        this.titleText.setOrigin(0.5, 0);

        // 数值文本
        this.statsText = this.scene.add.text(
            panelX - panelWidth / 2 + 30,
            panelY - panelHeight / 2 + 60,
            '',
            {
                fontSize: '16px',
                color: '#ffffff',
                lineSpacing: 8,
            },
        );

        // 添加到容器
        this.container.add([this.background, this.titleText, this.statsText]);

        // 默认隐藏
        this.container.setVisible(false);
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

        const stats = [
            `━━━━━━ 基础属性 ━━━━━━`,
            ``,
            `♥ 生命值: ${this.player.health} / ${this.player.maxHealth} (${healthPercent}%)`,
            ``,
            `━━━━━━ 战斗属性 ━━━━━━`,
            ``,
            `⚔ 攻击力: ${this.player.attackDamage}`,
            ``,
            `💥 暴击率: ${critChancePercent}%`,
            ``,
            `✨ 暴击倍率: ${this.player.criticalMultiplier}x`,
            ``,
            `━━━━━━ 状态 ━━━━━━`,
            ``,
            `🛡 无敌: ${this.player.isInvincible ? '是' : '否'}`,
            ``,
            `⚡ 正在攻击: ${this.player.weapon.isAttacking ? '是' : '否'}`,
            ``,
            `━━━━━━━━━━━━━━━━━━`,
            ``,
            `按 C 键关闭面板`,
        ];

        this.statsText.setText(stats.join('\n'));
    }

    /**
     * 切换面板显示/隐藏
     */
    public toggle(): void {
        this.isVisible = !this.isVisible;

        if (this.isVisible) {
            this.updatePanelData(); // 打开时更新数据
        }

        this.container?.setVisible(this.isVisible);

        console.log(
            `[PlayerStatsPanel] Panel ${this.isVisible ? 'opened' : 'closed'}`,
        );
    }

    /**
     * 销毁面板
     */
    public destroy(): void {
        this.container?.destroy();
    }

    /**
     * 获取面板可见状态
     */
    public get visible(): boolean {
        return this.isVisible;
    }
}
