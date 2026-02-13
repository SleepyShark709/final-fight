/**
 * Phaser 游戏配置
 */
import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, GRAVITY } from '../utils/Constants';
import { BootScene } from '../scenes/BootScene';
import { MenuScene } from '../scenes/MenuScene';
import { GameScene } from '../scenes/GameScene';
import { UIScene } from '../scenes/UIScene';

import { GameOverScene } from '../scenes/GameOverScene';
import { WinScene } from '../scenes/WinScene';

// Phaser 游戏配置对象
export const gameConfig: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,

    // 游戏画布设置
    width: GAME_WIDTH,
    height: GAME_HEIGHT,

    // 父容器
    parent: 'game-container',

    // 背景颜色
    backgroundColor: '#2d2d44',

    // 像素风渲染设置
    pixelArt: true, // 关闭抗锯齿，保持像素清晰
    roundPixels: true, // 像素对齐
    antialias: false, // 禁用抗锯齿

    // 缩放设置 - 适配不同屏幕尺寸
    scale: {
        mode: Phaser.Scale.FIT, // 适应屏幕
        autoCenter: Phaser.Scale.CENTER_BOTH, // 居中
        width: GAME_WIDTH,
        height: GAME_HEIGHT,
    },

    // 物理引擎配置
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { x: 0, y: GRAVITY },
            debug: false, // 开发时可设为 true 查看碰撞框
        },
    },

    // 游戏场景列表
    scene: [BootScene, MenuScene, GameScene, UIScene, GameOverScene, WinScene],

    // 输入设置
    input: {
        keyboard: true,
    },
};
