/**
 * 游戏入口文件
 * 初始化 Phaser 游戏实例
 */
import Phaser from 'phaser';
import { gameConfig } from './config/gameConfig';
import { Audio } from './systems/AudioManager';

// 创建游戏实例
const game = new Phaser.Game(gameConfig);

// 音频系统：注册自动解锁（浏览器策略要求首次交互后才能播放）
Audio.attachAutoUnlock();

// 开发模式：暴露到 window，便于 DevTools 调试 / 测试脚本
// eslint-disable-next-line @typescript-eslint/no-explicit-any
if ((import.meta as any).env?.DEV) (window as any).game = game;

// 导出 game 实例供其他模块使用（如调试）
export default game;
