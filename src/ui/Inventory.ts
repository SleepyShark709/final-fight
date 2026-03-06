/**
 * 背包 UI 组件
 * 按 I 键打开/关闭
 */
import Phaser from 'phaser';
import { ASSETS, GAME_WIDTH, GAME_HEIGHT, DEPTH } from '../utils/Constants';

// 物品接口
export interface InventoryItem {
    id: string;
    name: string;
    description: string;
    icon: string;
    quantity: number;
}

export class Inventory {
    private scene: Phaser.Scene;
    private container: Phaser.GameObjects.Container;
    private isVisible: boolean = false;

    // 物品列表
    private items: InventoryItem[] = [];

    // 格子数量
    private readonly GRID_COLS = 5;
    private readonly GRID_ROWS = 4;
    private readonly SLOT_SIZE = 60;
    private readonly SLOT_PADDING = 10;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.container = scene.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2);
        this.container.setDepth(DEPTH.UI + 5);
        this.container.setVisible(false);

        this.createUI();
    }

    /**
     * 创建背包 UI
     */
    private createUI(): void {
        // 计算背包面板尺寸
        const panelWidth =
            this.GRID_COLS * (this.SLOT_SIZE + this.SLOT_PADDING) +
            this.SLOT_PADDING +
            40;
        const panelHeight =
            this.GRID_ROWS * (this.SLOT_SIZE + this.SLOT_PADDING) +
            this.SLOT_PADDING +
            80;

        // 半透明背景遮罩
        const overlay = this.scene.add.graphics();
        overlay.fillStyle(0x000000, 0.5);
        overlay.fillRect(
            -GAME_WIDTH / 2,
            -GAME_HEIGHT / 2,
            GAME_WIDTH,
            GAME_HEIGHT,
        );

        // 背包面板背景（Ancient 风格 NineSlice 面板）
        const panel = this.scene.add.nineslice(
            0, 0, ASSETS.UI_PANEL_TAN, undefined,
            panelWidth, panelHeight, 8, 8, 8, 8
        );
        panel.setOrigin(0.5);
        panel.setAlpha(0.95);

        // 标题
        const title = this.scene.add.text(0, -panelHeight / 2 + 30, '背包', {
            fontSize: '28px',
            fontFamily: 'Arial',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 2,
        });
        title.setOrigin(0.5);

        // 关闭按钮
        const closeBtn = this.scene.add.text(
            panelWidth / 2 - 30,
            -panelHeight / 2 + 15,
            '✕',
            {
                fontSize: '24px',
                color: '#ffffff',
            },
        );
        closeBtn.setOrigin(0.5);
        closeBtn.setInteractive({ useHandCursor: true });
        closeBtn.on('pointerdown', () => this.hide());
        closeBtn.on('pointerover', () => closeBtn.setColor('#ff6666'));
        closeBtn.on('pointerout', () => closeBtn.setColor('#ffffff'));

        // 创建物品格子
        const gridStartX =
            -((this.GRID_COLS - 1) * (this.SLOT_SIZE + this.SLOT_PADDING)) / 2;
        const gridStartY =
            -((this.GRID_ROWS - 1) * (this.SLOT_SIZE + this.SLOT_PADDING)) / 2 +
            20;

        const slots: Phaser.GameObjects.NineSlice[] = [];

        for (let row = 0; row < this.GRID_ROWS; row++) {
            for (let col = 0; col < this.GRID_COLS; col++) {
                const x =
                    gridStartX + col * (this.SLOT_SIZE + this.SLOT_PADDING);
                const y =
                    gridStartY + row * (this.SLOT_SIZE + this.SLOT_PADDING);

                // 物品格子（Ancient 风格 NineSlice 内嵌面板）
                const slot = this.scene.add.nineslice(
                    x, y, ASSETS.UI_PANEL_BROWN_INLAY, undefined,
                    this.SLOT_SIZE, this.SLOT_SIZE, 8, 8, 8, 8
                );
                slot.setOrigin(0.5);

                slots.push(slot);
            }
        }

        // 提示文字
        const hint = this.scene.add.text(
            0,
            panelHeight / 2 - 30,
            '按 I 关闭背包',
            {
                fontSize: '14px',
                fontFamily: 'Arial',
                color: '#888888',
            },
        );
        hint.setOrigin(0.5);

        // 添加所有元素到容器
        this.container.add([overlay, panel, title, closeBtn, ...slots, hint]);
    }

    /**
     * 显示背包
     */
    public show(): void {
        this.isVisible = true;
        this.container.setVisible(true);

        // 淡入动画
        this.container.setAlpha(0);
        this.scene.tweens.add({
            targets: this.container,
            alpha: 1,
            duration: 200,
        });
    }

    /**
     * 隐藏背包
     */
    public hide(): void {
        this.scene.tweens.add({
            targets: this.container,
            alpha: 0,
            duration: 150,
            onComplete: () => {
                this.isVisible = false;
                this.container.setVisible(false);
            },
        });
    }

    /**
     * 切换显示状态
     */
    public toggle(): void {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }

    /**
     * 添加物品
     */
    public addItem(item: InventoryItem): boolean {
        // 检查是否已有该物品
        const existingItem = this.items.find((i) => i.id === item.id);
        if (existingItem) {
            existingItem.quantity += item.quantity;
            return true;
        }

        // 检查是否有空位
        if (this.items.length >= this.GRID_COLS * this.GRID_ROWS) {
            return false;
        }

        this.items.push(item);
        return true;
    }

    /**
     * 移除物品
     */
    public removeItem(itemId: string, quantity: number = 1): boolean {
        const itemIndex = this.items.findIndex((i) => i.id === itemId);
        if (itemIndex === -1) return false;

        this.items[itemIndex].quantity -= quantity;
        if (this.items[itemIndex].quantity <= 0) {
            this.items.splice(itemIndex, 1);
        }

        return true;
    }

    /**
     * 获取物品列表
     */
    public getItems(): InventoryItem[] {
        return [...this.items];
    }
}
