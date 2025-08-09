// ===========================================
// 游戏核心类型定义
// ===========================================

// 键盘按键状态类型
export type KeyStatus = "up" | "down";

// 按键回调函数类型
export type KeyCallback = (keyStatus: KeyStatus) => void;

// 游戏配置接口
export interface GameConfig {
  fps: number;
  images: Record<string, string | HTMLImageElement>;
  callback: (game: IGame) => void;
}

// 游戏核心接口
export interface IGame {
  images: Record<string, HTMLImageElement | string>;
  runCallback: (g: IGame) => void;
  scene: IGameScene | null;
  actions: Record<string, () => void>;
  keydowns: Record<string, boolean>;
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  canvasWidth: number;
  canvasHeight: number;
  keyStatus: KeyStatus;
  frameCount: number;
  
  // 方法
  drawImage(img: IGameImage, width: number, height: number): void;
  update(): void;
  draw(): void;
  deleteImage(element: IGameElement): void;
  registerAction(key: string, callback: KeyCallback): void;
  runLoop(): void;
  textureByName(name: string): HTMLImageElement | string;
  runWithScene(scene: IGameScene): void;
  replaceScene(scene: IGameScene): void;
  init(): void;
}

// 游戏图片接口
export interface IGameImage {
  game: IGame;
  texture: string | HTMLImageElement;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  
  // 方法
  draw(): void;
  update(): void;
}

// 游戏元素基础接口
export interface IGameElement {
  x: number;
  y: number;
  w: number;
  h: number;
  
  // 方法
  draw(): void;
  update(): void;
}

// 游戏场景接口
export interface IGameScene {
  game: IGame;
  elements: IGameElement[];
  
  // 方法
  addElement(img: IGameElement): void;
  popElement(): void;
  deleteElement(element: IGameElement): void;
  draw(): void;
  update(): void;
}

// ===========================================
// 地图系统类型定义
// ===========================================

// 坐标点接口
export interface Position {
  x: number;
  y: number;
}

// 瓦片地图接口
export interface IGameTileMap {
  game: IGame;
  cameraX: number;
  cameraWidth: number;
  cameraHeight: number;
  followPlayer: boolean;
  followOffsetX: number;
  player: IPlayer | null;
  mapWidth: number;
  isBlocked: boolean;
  reachedRightBoundary: boolean;
  reachedLeftBoundary: boolean;
  offsetX: number;
  th: number; // 地图高度（行数）
  tiles: number[];
  tw: number; // 地图宽度（列数）
  tileImages: IGameImage[];
  tileSize: number;
  
  // 方法
  setPlayer(player: IPlayer): void;
  updateCamera(): void;
  update(): void;
  onTheGround(i: number, j: number): boolean;
  isTileWall(i: number, j: number): boolean;
  getTile(i: number, j: number): number | undefined;
  worldToScreen(x: number, y: number): Position;
  screenToWorld(x: number, y: number): Position;
  draw(): void;
}

// ===========================================
// 角色系统类型定义
// ===========================================

// 角色方向类型
export type CharacterDirection = "left" | "right";

// 角色基础接口
export interface ICharacter extends IGameElement {
  game: IGame;
  frames: HTMLImageElement[];
  runFrames: HTMLImageElement[];
  flipX: boolean;
  isJump: boolean;
  isMoving: boolean;
  isDie: boolean;
  defaultLocation: CharacterDirection;
  cooldown: number;
  movingDirection: CharacterDirection;
  isAttack: boolean;
  tileSize: number;
  map: IGameTileMap;
  isBlockOnFrount: boolean;
  idleFrame: HTMLImageElement[];
  texture: HTMLImageElement | null;
  isPlayer?: boolean;
  
  // 方法
  delete(element: IGameImage): void;
  move(x: number): void;
}

// 玩家接口
export interface IPlayer extends ICharacter {
  attack1Frames: HTMLImageElement[];
  attack2Frames: HTMLImageElement[];
  attack3Frames: HTMLImageElement[];
  jumpFrames: HTMLImageElement[];
  frameCount: number;
  attackType: number;
  gy: number; // 重力加速度
  vy: number; // y轴速度
  isOnGround: boolean;
  vx: number; // x轴速度
  mx: number; // x轴摩擦力
  maxSpeed: number;
  maxHP: number;
  currentHP: number;
  isDead: boolean;
  HPBar: IHpBar;
  footOffset: number;
  jumpHitWall: boolean;
  minVerticalDelta: number;
  
  // 方法
  initIdleFrame(game: IGame): void;
  initRunFrame(game: IGame): void;
  initAttackFrame(game: IGame, type: number): void;
  initJumpFrame(game: IGame): void;
  jump(keyStatus: string): void;
  updateGravity(): void;
  checkHorizontalCollision(): boolean;
  attack(enemy: IEnemy): void;
  takeDamage(damage: number): void;
  die(): void;
}

// 敌人接口
export interface IEnemy extends ICharacter {
  dieFrame: HTMLImageElement[];
  attack1Frames: HTMLImageElement[];
  frameCount: number;
  defaultHp: number;
  HP: number;
  HPBar: IHpBar;
  AttackBar: IAttackValue;
  damageValue: number;
  isDead: boolean;
  
  // 方法
  setMap(map: IGameTileMap): void;
  initAttackFrame(game: IGame): void;
  initRunFrame(game: IGame): void;
  initFrames(game: IGame): void;
  initDieFrames(game: IGame): void;
  killEvent(damageValue: number): void;
  attackEvent(): void;
  checkWallCollision(x: number): boolean;
}

// ===========================================
// UI 系统类型定义
// ===========================================

// 血条接口
export interface IHpBar {
  game: IGame;
  x: number;
  y: number;
  w: number;
  h: number;
  percentage: number;
  speed: number;
  greenW: number;
  redW: number;
  isRemove: boolean;
  character: ICharacter | null;
  
  // 方法
  setCharacter(character: ICharacter): void;
  remove(): void;
  update(percentage: number): void;
  draw(): void;
}

// 攻击伤害值接口
export interface IAttackValue {
  game: IGame;
  x: number;
  y: number;
  number: number;
  color: string;
  text: string;
  isShow: boolean;
  character: ICharacter | null;
  
  // 方法
  setCharacter(character: ICharacter): void;
  setShow(show: boolean): void;
  update(hurtNum: number): void;
  draw(): void;
}

// ===========================================
// 调试系统类型定义
// ===========================================

// 调试模块接口
export interface IDebugModule {
  game: IGame;
  enabled: boolean;
  
  // 方法
  initToggleButton(): void;
  drawPlayerCollision(player: IPlayer): void;
  drawEnemyCollision(enemy: IEnemy): void;
  drawMapCollision(map: IGameTileMap): void;
  drawCameraDebug(map: IGameTileMap): void;
  drawTerrainLegend(): void;
}

// ===========================================
// 配置和常量类型
// ===========================================

// 角色状态接口
export interface CharacterState {
  idle: boolean;
  running: boolean;
  jumping: boolean;
  attacking: boolean;
  dying: boolean;
}

// 角色配置接口
export interface CharacterConfig {
  x: number;
  y: number;
  w: number;
  h: number;
  speed: number;
  hp: number;
  attackDamage: number;
}

// 场景配置接口
export interface SceneConfig {
  game: IGame;
  elements?: IGameElement[];
}

// 地图配置接口
export interface MapConfig {
  game: IGame;
  x: number;
  y: number;
  w: number;
  h: number;
  image: HTMLImageElement;
}

// 动画配置接口
export interface AnimationConfig {
  frames: number;
  currentFrame: number;
  frameDuration: number;
  lastFrameTime: number;
}

// 攻击配置接口
export interface AttackConfig {
  damage: number;
  range: number;
  cooldown: number;
  lastAttackTime: number;
}

// 物理系统配置接口
export interface PhysicsConfig {
  gravity: number;
  friction: number;
  jumpHeight: number;
  maxSpeed: number;
}

// 碰撞检测结果接口
export interface CollisionResult {
  hasCollision: boolean;
  direction?: "left" | "right" | "up" | "down";
  penetration?: number;
}

// ===========================================
// 工具函数类型定义
// ===========================================

// 图片加载器类型
export type ImageLoader = {
  [key: string]: string;
};

// 资源管理器接口
export interface ResourceManager {
  playerImages: ImageLoader;
  enemyImages: ImageLoader;
  mapImages: ImageLoader;
  backgroundImages: ImageLoader;
}

// ===========================================
// 全局类型扩展
// ===========================================

// 窗口对象扩展
declare global {
  interface Window {
    fps: number;
    game: IGame;
    isMobileTerminal: boolean;
  }
}

// ===========================================
// 场景特定类型定义
// ===========================================

// 标题场景接口
export interface ITitleScene extends IGameScene {
  // 标题场景特有属性和方法
}

// 主游戏场景接口
export interface IMainScene extends IGameScene {
  player: IPlayer;
  enemy: IEnemy;
  map: IGameTileMap;
  debugModule: IDebugModule;
  
  // 主游戏场景特有方法
  setupControls(): void;
  handlePlayerInput(): void;
}

// ===========================================
// 事件系统类型定义
// ===========================================

// 游戏事件类型
export type GameEventType = 
  | "player_move"
  | "player_jump"
  | "player_attack"
  | "enemy_hit"
  | "enemy_die"
  | "game_over"
  | "scene_change";

// 游戏事件接口
export interface GameEvent {
  type: GameEventType;
  data?: Record<string, unknown>;
  timestamp: number;
}

// 事件处理器类型
export type EventHandler = (event: GameEvent) => void;

// ===========================================
// 导出所有类型的联合类型（用于类型检查）
// ===========================================

// 所有游戏对象的联合类型
export type GameObject = 
  | IGame
  | IGameScene
  | IGameElement
  | IGameImage
  | IGameTileMap
  | ICharacter
  | IPlayer
  | IEnemy
  | IHpBar
  | IAttackValue
  | IDebugModule;

// 所有场景的联合类型
export type Scene = ITitleScene | IMainScene;

// 所有UI组件的联合类型
export type UIComponent = IHpBar | IAttackValue;
