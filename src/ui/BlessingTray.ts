/**
 * 祝福托盘 UI — 显示当前激活的所有祝福
 *
 * 一行最多 N 个祝福，每个祝福为小圆形图标（按神明着色）
 * 新加入祝福时会播放弹出动画
 * 位置：右上角（或可配置）
 */
import Phaser from 'phaser';
import { BlessingManager } from '../combat/BlessingManager';
import { BlessingData } from '../config/BlessingConfig';

interface BlessingIconNode {
    id: string;
    container: Phaser.GameObjects.Container;
    icon: Phaser.GameObjects.Graphics;
    label: Phaser.GameObjects.Text;
}

export class BlessingTray {
    private scene: Phaser.Scene;
    private rootContainer: Phaser.GameObjects.Container;
    private nodes: BlessingIconNode[] = [];
    private blessingManager?: BlessingManager;

    private iconSize: number = 28;
    private iconGap: number = 6;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        this.scene = scene;
        this.rootContainer = scene.add.container(x, y);
        this.rootContainer.setDepth(100);

        // 标签
        const label = scene.add.text(0, -22, '祝福', {
            fontSize: '11px',
            fontFamily: 'Arial',
            color: '#8898a8',
        });
        label.setOrigin(0, 0.5);
        this.rootContainer.add(label);
    }

    public setBlessingManager(manager: BlessingManager): void {
        this.blessingManager = manager;
        this.refresh();
    }

    /** 刷新所有祝福（对比当前与显示，增删 icon） */
    public refresh(): void {
        if (!this.blessingManager) return;
        const current = this.blessingManager.getActiveBlessings();
        const currentIds = new Set(current.map(b => b.id));

        // 移除已不在的祝福
        this.nodes = this.nodes.filter(node => {
            if (!currentIds.has(node.id)) {
                this.scene.tweens.add({
                    targets: node.container,
                    alpha: 0,
                    scale: 0.3,
                    duration: 150,
                    onComplete: () => node.container.destroy(),
                });
                return false;
            }
            return true;
        });

        // 加入新的祝福
        current.forEach(b => {
            if (!this.nodes.find(n => n.id === b.id)) {
                this.nodes.push(this.createIconNode(b));
            }
        });

        this.layout();
    }

    private createIconNode(blessing: BlessingData): BlessingIconNode {
        const container = this.scene.add.container(0, 0);
        const g = this.scene.add.graphics();

        // 外圆环（神明颜色）
        const size = this.iconSize;
        const halfSize = size / 2;

        g.fillStyle(0x0a0a12, 0.9);
        g.fillCircle(halfSize, halfSize, halfSize);
        g.lineStyle(2, blessing.iconColor, 1);
        g.strokeCircle(halfSize, halfSize, halfSize - 1);
        // 内核
        g.fillStyle(blessing.iconColor, 0.6);
        g.fillCircle(halfSize, halfSize, halfSize - 5);
        // 高光
        g.fillStyle(0xffffff, 0.3);
        g.fillCircle(halfSize - 3, halfSize - 3, 3);

        // 神明首字符作为简易图标（火/雷/冰）
        const godChar = this.getGodIcon(blessing.god);
        const label = this.scene.add.text(halfSize, halfSize, godChar, {
            fontSize: '14px',
            fontFamily: 'Arial Black, Arial',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 2,
        });
        label.setOrigin(0.5);

        container.add([g, label]);
        this.rootContainer.add(container);

        // 弹入动画
        container.setScale(0.1);
        this.scene.tweens.add({
            targets: container,
            scale: 1,
            duration: 260,
            ease: 'Back.Out',
        });

        return { id: blessing.id, container, icon: g, label };
    }

    private getGodIcon(god: string): string {
        switch (god) {
            case 'fire': return '火';
            case 'thunder': return '雷';
            case 'ice': return '冰';
            default: return '?';
        }
    }

    private layout(): void {
        const step = this.iconSize + this.iconGap;
        this.nodes.forEach((node, i) => {
            const targetX = i * step;
            this.scene.tweens.add({
                targets: node.container,
                x: targetX,
                duration: 180,
                ease: 'Cubic.easeOut',
            });
        });
    }

    public setPosition(x: number, y: number): void {
        this.rootContainer.setPosition(x, y);
    }

    public destroy(): void {
        this.rootContainer.destroy();
    }
}
