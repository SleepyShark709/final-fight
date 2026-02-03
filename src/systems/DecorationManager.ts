import Phaser from 'phaser';
import { ASSETS, DEPTH } from '../utils/Constants';

/**
 * 装饰物定义接口
 */
export interface DecorationConfig {
    width: number; // 宽度（单位：Tile）
    height: number; // 高度（单位：Tile）
    tiles: number[]; // Tile 索引数组（从左到右，从上到下）
    tileSourceSize?: number; // Tile原始像素尺寸 (默认 85)
    targetSize?: number; // 目标整体像素大小 (例如 30)
    scale?: number; // 手动缩放 (如果未设置 targetSize)
}

/**
 * 装饰物定义库
 */
const DEFAULT_TILE_SOURCE_SIZE = 85;

export const DECORATIONS: Record<string, DecorationConfig> = {
    BUSH_1: {
        width: 2,
        height: 2,
        tiles: [1, 2, 13, 14],
        tileSourceSize: 85,
        targetSize: 30,
    },
    BUSH_2: {
        width: 2,
        height: 2,
        tiles: [3, 4, 15, 16],
        tileSourceSize: 85,
        targetSize: 30,
    },
    BUSH_3: {
        width: 2,
        height: 2,
        tiles: [5, 6, 17, 18],
        tileSourceSize: 85,
        targetSize: 30,
    },
    LONG_ROCK_1: {
        width: 4,
        height: 2,
        tiles: [7, 8, 9, 10, 19, 20, 21, 22],
        tileSourceSize: 85,
        targetSize: 60,
    },
    BUSH_4: {
        width: 2,
        height: 2,
        tiles: [25, 26, 37, 38],
        tileSourceSize: 85,
        targetSize: 30,
    },
    BUSH_5: {
        width: 2,
        height: 2,
        tiles: [27, 28, 39, 40],
        tileSourceSize: 85,
        targetSize: 30,
    },
    BUSH_6: {
        width: 2,
        height: 2,
        tiles: [29, 30, 41, 42],
        tileSourceSize: 85,
        targetSize: 30,
    },
};

/**
 * 装饰物管理器
 * 负责创建由多个 Tile 组成的装饰物对象
 */
export class DecorationManager {
    private scene: Phaser.Scene;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
    }

    /**
     * 在指定位置创建装饰物
     * @param x 世界坐标 X (中心点)
     * @param y 世界坐标 Y (底部)
     * @param key 装饰物 Key
     * @param depth 深度 (可选)
     */
    createDecoration(
        x: number,
        y: number,
        key: string,
        depth?: number,
    ): Phaser.GameObjects.Container | null {
        const config = DECORATIONS[key];
        if (!config) {
            console.warn(`[DecorationManager] Unknown decoration key: ${key}`);
            return null;
        }

        const tileSourceSize =
            config.tileSourceSize || DEFAULT_TILE_SOURCE_SIZE;
        let scale = config.scale || 1.0;

        // 如果设置了 targetSize，自动计算缩放比例
        if (config.targetSize) {
            // 假设 targetSize 是指整体宽度或高度的最大值，或者直接指宽度
            // 这里我们以宽度为基准计算 scale
            // 原始宽度 = 宽度Tile数 * 单个Tile源尺寸
            const originalWidth = config.width * tileSourceSize;
            scale = config.targetSize / originalWidth;
        }

        const container = this.scene.add.container(x, y);

        // 计算缩放后的总尺寸
        const totalWidth = config.width * tileSourceSize * scale;
        const totalHeight = config.height * tileSourceSize * scale;

        // 计算中心点偏移，使得(x,y)是底部中心
        // 原始 tiles 是从 (0,0) 开始排列 (左上角)
        // Container原点在 (x,y)。
        // 我们希望 (x,y) 对应整个物体的【底部中心】。
        // 所以，Tile(0,0) 相对于 Container 原点的坐标应该是：
        // X: -totalWidth / 2
        // Y: -totalHeight
        const startX = -totalWidth / 2;
        const startY = -totalHeight;

        config.tiles.forEach((tileIndex, i) => {
            const row = Math.floor(i / config.width);
            const col = i % config.width;

            // Tile 的位置需要考虑 scale
            // 注意：Sprite 设置 scale 后，其 position 是指 Sprite 中心点的位置（Phaser默认origin是0.5,0.5）
            // 如果我们把 Sprite origin 设为 0,0 (左上角)，会好计算一些

            // 使用 Math.round 避免子像素渲染导致的黑线/缝隙
            const tileX = Math.round(startX + col * tileSourceSize * scale);
            const tileY = Math.round(startY + row * tileSourceSize * scale);

            const sprite = this.scene.add.sprite(
                tileX,
                tileY,
                `${ASSETS.ENV_TILE}-${tileIndex}`,
            );

            sprite.setOrigin(0, 0); // 设置原点为左上角，方便拼接
            sprite.setScale(scale);
            container.add(sprite);
        });

        // 默认深度为 BACKGROUND，除非指定
        container.setDepth(depth !== undefined ? depth : DEPTH.BACKGROUND);
        return container;
    }
}
