import { ImageResource } from '@/types/index';

// 背景图片资源
import bgImage from "@/assets/background/bg.png";
import startbgImage from "@/assets/background/startbg.png";

// 玩家动画资源
import playerIdle0 from "@/assets/player/idle/adventurer-idle-00.png";
import playerIdle1 from "@/assets/player/idle/adventurer-idle-01.png";
import playerIdle2 from "@/assets/player/idle/adventurer-idle-02.png";

import playerIdleSword0 from "@/assets/player/idle-sword/0.png";
import playerIdleSword1 from "@/assets/player/idle-sword/1.png";
import playerIdleSword2 from "@/assets/player/idle-sword/2.png";
import playerIdleSword3 from "@/assets/player/idle-sword/3.png";
import playerIdleSword4 from "@/assets/player/idle-sword/4.png";
import playerIdleSword5 from "@/assets/player/idle-sword/5.png";

import playerRun0 from "@/assets/player/run/0.png";
import playerRun1 from "@/assets/player/run/1.png";
import playerRun2 from "@/assets/player/run/2.png";
import playerRun3 from "@/assets/player/run/3.png";
import playerRun4 from "@/assets/player/run/4.png";
import playerRun5 from "@/assets/player/run/5.png";

import playerJump0 from "@/assets/player/jump/0.png";
import playerJump1 from "@/assets/player/jump/1.png";
import playerJump2 from "@/assets/player/jump/2.png";
import playerJump3 from "@/assets/player/jump/3.png";

import playerAttack1_0 from "@/assets/player/attack/1-0.png";
import playerAttack1_1 from "@/assets/player/attack/1-1.png";
import playerAttack1_2 from "@/assets/player/attack/1-2.png";
import playerAttack1_3 from "@/assets/player/attack/1-3.png";
import playerAttack1_4 from "@/assets/player/attack/1-4.png";
import playerAttack1_5 from "@/assets/player/attack/1-5.png";

import playerAttack2_0 from "@/assets/player/attack/2-0.png";
import playerAttack2_1 from "@/assets/player/attack/2-1.png";
import playerAttack2_2 from "@/assets/player/attack/2-2.png";
import playerAttack2_3 from "@/assets/player/attack/2-3.png";
import playerAttack2_4 from "@/assets/player/attack/2-4.png";
import playerAttack2_5 from "@/assets/player/attack/2-5.png";

import playerAttack3_0 from "@/assets/player/attack/3-0.png";
import playerAttack3_1 from "@/assets/player/attack/3-1.png";
import playerAttack3_2 from "@/assets/player/attack/3-2.png";
import playerAttack3_3 from "@/assets/player/attack/3-3.png";

// 敌人动画资源
import enemyIdle0 from "@/assets/enemy/idle/0.png";
import enemyIdle1 from "@/assets/enemy/idle/1.png";
import enemyIdle2 from "@/assets/enemy/idle/2.png";
import enemyIdle3 from "@/assets/enemy/idle/3.png";

import enemyWalk0 from "@/assets/enemy/walk/0.png";
import enemyWalk1 from "@/assets/enemy/walk/1.png";
import enemyWalk2 from "@/assets/enemy/walk/2.png";
import enemyWalk3 from "@/assets/enemy/walk/3.png";
import enemyWalk4 from "@/assets/enemy/walk/4.png";
import enemyWalk5 from "@/assets/enemy/walk/5.png";

import enemyAttack0 from "@/assets/enemy/attack/0.png";
import enemyAttack1 from "@/assets/enemy/attack/1.png";
import enemyAttack2 from "@/assets/enemy/attack/2.png";
import enemyAttack3 from "@/assets/enemy/attack/3.png";
import enemyAttack4 from "@/assets/enemy/attack/4.png";
import enemyAttack5 from "@/assets/enemy/attack/5.png";
import enemyAttack6 from "@/assets/enemy/attack/6.png";
import enemyAttack7 from "@/assets/enemy/attack/7.png";

import enemyDie0 from "@/assets/enemy/die/0.png";
import enemyDie1 from "@/assets/enemy/die/1.png";
import enemyDie2 from "@/assets/enemy/die/2.png";
import enemyDie3 from "@/assets/enemy/die/3.png";

// 地图瓦片资源
import tile1 from "@/assets/grass/t1.png";
import tile2 from "@/assets/grass/t2.png";
import tile3 from "@/assets/grass/t3.png";
import tile4 from "@/assets/grass/t4.png";
import tile5 from "@/assets/grass/t5.png";
import tile6 from "@/assets/grass/t6.png";
import tile7 from "@/assets/grass/t7.png";
import tile8 from "@/assets/grass/t8.png";
import tile9 from "@/assets/grass/t9.png";
import tile10 from "@/assets/grass/t10.png";
import tile11 from "@/assets/grass/t11.png";

/**
 * 游戏资源配置
 * 统一管理所有游戏资源的加载
 */
export const GAME_RESOURCES: ImageResource[] = [
  // 背景资源 (高优先级预加载)
  { name: "bg", url: bgImage, preload: true },
  { name: "startbg", url: startbgImage, preload: true },
  
  // 玩家闲置动画
  { name: "idle0", url: playerIdle0, preload: true },
  { name: "idle1", url: playerIdle1, preload: true },
  { name: "idle2", url: playerIdle2, preload: true },
  
  // 玩家持剑闲置动画  
  { name: "idle_sword0", url: playerIdleSword0, preload: true },
  { name: "idle_sword1", url: playerIdleSword1, preload: true },
  { name: "idle_sword2", url: playerIdleSword2, preload: true },
  { name: "idle_sword3", url: playerIdleSword3, preload: true },
  { name: "idle_sword4", url: playerIdleSword4, preload: true },
  { name: "idle_sword5", url: playerIdleSword5, preload: true },
  
  // 玩家跑步动画
  { name: "run0", url: playerRun0, preload: true },
  { name: "run1", url: playerRun1, preload: true },
  { name: "run2", url: playerRun2, preload: true },
  { name: "run3", url: playerRun3, preload: true },
  { name: "run4", url: playerRun4, preload: true },
  { name: "run5", url: playerRun5, preload: true },
  
  // 玩家跳跃动画
  { name: "jump0", url: playerJump0, preload: true },
  { name: "jump1", url: playerJump1, preload: true },
  { name: "jump2", url: playerJump2, preload: true },
  { name: "jump3", url: playerJump3, preload: true },
  
  // 玩家攻击动画 - 第1套
  { name: "1-0", url: playerAttack1_0 },
  { name: "1-1", url: playerAttack1_1 },
  { name: "1-2", url: playerAttack1_2 },
  { name: "1-3", url: playerAttack1_3 },
  { name: "1-4", url: playerAttack1_4 },
  { name: "1-5", url: playerAttack1_5 },
  
  // 玩家攻击动画 - 第2套
  { name: "2-0", url: playerAttack2_0 },
  { name: "2-1", url: playerAttack2_1 },
  { name: "2-2", url: playerAttack2_2 },
  { name: "2-3", url: playerAttack2_3 },
  { name: "2-4", url: playerAttack2_4 },
  { name: "2-5", url: playerAttack2_5 },
  
  // 玩家攻击动画 - 第3套  
  { name: "3-0", url: playerAttack3_0 },
  { name: "3-1", url: playerAttack3_1 },
  { name: "3-2", url: playerAttack3_2 },
  { name: "3-3", url: playerAttack3_3 },
  
  // 敌人闲置动画
  { name: "eidle0", url: enemyIdle0, preload: true },
  { name: "eidle1", url: enemyIdle1, preload: true },
  { name: "eidle2", url: enemyIdle2, preload: true },
  { name: "eidle3", url: enemyIdle3, preload: true },
  
  // 敌人行走动画
  { name: "ewalk0", url: enemyWalk0 },
  { name: "ewalk1", url: enemyWalk1 },
  { name: "ewalk2", url: enemyWalk2 },
  { name: "ewalk3", url: enemyWalk3 },
  { name: "ewalk4", url: enemyWalk4 },
  { name: "ewalk5", url: enemyWalk5 },
  
  // 敌人攻击动画
  { name: "eattack0", url: enemyAttack0 },
  { name: "eattack1", url: enemyAttack1 },
  { name: "eattack2", url: enemyAttack2 },
  { name: "eattack3", url: enemyAttack3 },
  { name: "eattack4", url: enemyAttack4 },
  { name: "eattack5", url: enemyAttack5 },
  { name: "eattack6", url: enemyAttack6 },
  { name: "eattack7", url: enemyAttack7 },
  
  // 敌人死亡动画
  { name: "edie0", url: enemyDie0 },
  { name: "edie1", url: enemyDie1 },
  { name: "edie2", url: enemyDie2 },
  { name: "edie3", url: enemyDie3 },
  
  // 地图瓦片资源
  { name: "t1", url: tile1, preload: true },
  { name: "t2", url: tile2, preload: true },
  { name: "t3", url: tile3, preload: true },
  { name: "t4", url: tile4, preload: true },
  { name: "t5", url: tile5, preload: true },
  { name: "t6", url: tile6, preload: true },
  { name: "t7", url: tile7, preload: true },
  { name: "t8", url: tile8, preload: true },
  { name: "t9", url: tile9, preload: true },
  { name: "t10", url: tile10, preload: true },
  { name: "t11", url: tile11, preload: true },
];

/**
 * 获取预加载资源列表
 */
export function getPreloadResources(): ImageResource[] {
  return GAME_RESOURCES.filter(resource => resource.preload);
}

/**
 * 获取所有资源列表
 */
export function getAllResources(): ImageResource[] {
  return GAME_RESOURCES;
}

/**
 * 按类型获取资源
 */
export function getResourcesByType(type: 'player' | 'enemy' | 'background' | 'tiles'): ImageResource[] {
  switch (type) {
    case 'player':
      return GAME_RESOURCES.filter(r => 
        r.name.includes('idle') || 
        r.name.includes('run') || 
        r.name.includes('jump') || 
        r.name.includes('-')
      );
    case 'enemy':
      return GAME_RESOURCES.filter(r => r.name.startsWith('e'));
    case 'background':
      return GAME_RESOURCES.filter(r => r.name.includes('bg'));
    case 'tiles':
      return GAME_RESOURCES.filter(r => r.name.startsWith('t'));
    default:
      return [];
  }
}