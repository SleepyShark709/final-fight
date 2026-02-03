/**
 * 游戏入口文件
 * 初始化 Phaser 游戏实例
 */
import Phaser from 'phaser';
import { gameConfig } from './config/gameConfig';

// 创建游戏实例
const game = new Phaser.Game(gameConfig);

// 导出 game 实例供其他模块使用（如调试）
export default game;
