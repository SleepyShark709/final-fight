// 游戏基础类型
export interface GameConfig {
  fps: number;
  images: Record<string, string>;
  callback: (game: any) => void;
}

export interface GameImage {
  image: HTMLImageElement;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface GameScene {
  game: any;
  elements: GameElement[];
  draw: () => void;
  update: () => void;
  registerAction: (key: string, callback: () => void) => void;
}

export interface GameElement {
  x: number;
  y: number;
  w: number;
  h: number;
  draw: () => void;
  update: () => void;
}

// 角色相关类型
export interface CharacterState {
  idle: boolean;
  running: boolean;
  jumping: boolean;
  attacking: boolean;
  dying: boolean;
}

export interface CharacterConfig {
  x: number;
  y: number;
  w: number;
  h: number;
  speed: number;
  hp: number;
  attackDamage: number;
}

// 场景相关类型
export interface SceneConfig {
  game: any;
  elements?: GameElement[];
}

// 地图相关类型
export interface MapConfig {
  game: any;
  x: number;
  y: number;
  w: number;
  h: number;
  image: HTMLImageElement;
}

// 动画相关类型
export interface AnimationConfig {
  frames: number;
  currentFrame: number;
  frameDuration: number;
  lastFrameTime: number;
}

// 攻击相关类型
export interface AttackConfig {
  damage: number;
  range: number;
  cooldown: number;
  lastAttackTime: number;
}

// 窗口扩展类型
declare global {
  interface Window {
    fps: number;
    game: any;
    isMobileTerminal: boolean;
  }
}
