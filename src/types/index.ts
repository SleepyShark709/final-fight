// ===========================================
// 游戏核心类型定义
// ===========================================

// 键盘按键状态类型
export type KeyStatus = "up" | "down";

// 按键回调函数类型
export type KeyCallback = (keyStatus: KeyStatus) => void;

// 游戏运行回调函数类型
// 使用any来避免循环依赖问题，实际传入的是Game实例
export type GameRunCallback = (game: any) => void;

// 游戏配置接口
export interface GameConfig {
  fps: number;
  images: Record<string, string | HTMLImageElement>;
  callback: (game: IGame) => void;
}

// 游戏核心接口
export interface IGame {
  images: Record<string, HTMLImageElement | string>;
  runCallback: GameRunCallback;
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
  deleteImage(element: IGameImage): void;
  registerAction(key: string, callback: KeyCallback): void;
  runLoop(): void;
  textureByName(name: string): HTMLImageElement | string;
  runWithScene(scene: IGameScene): void;
  replaceScene(scene: IGameScene): void;
  init(): void;
  __start(): void;
}

// 游戏元素基础接口
export interface IGameElement {
  x: number;
  y: number;
  w: number;
  h: number;
  scene?: IGameScene;
  
  // 方法
  draw(): void;
  update(): void;
}

// 游戏图片接口 - 继承自 IGameElement
export interface IGameImage extends IGameElement {
  game: IGame;
  texture: string | HTMLImageElement;
}

// 游戏场景接口
export interface IGameScene {
  game: IGame;
  elements: IGameElement[];
  enemy?: IEnemy; // 可选的敌人属性，用于调试模块
  
  // 方法
  addElement(img: IGameElement): void;
  popElement(): void;
  deleteElement(element: IGameElement | IGameImage): void;
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
  player: any;
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
  setPlayer(player: any): void;
  updateCamera(): void;
  update(): void;
  draw(): void;
  onTheGround(i: number, j: number): boolean;
  isTileWall(i: number, j: number): boolean;
  getTile(i: number, j: number): number | undefined;
  worldToScreen(x: number, y: number): Position;
  screenToWorld(x: number, y: number): Position;
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
  defaultLocation: string;
  cooldown: number;
  movingDirection: string;
  isAttack: boolean;
  tileSize: number;
  map: IGameTileMap;
  isBlockOnFrount: boolean;
  idleFrame: HTMLImageElement[];
  texture?: HTMLImageElement | null;
  isPlayer?: boolean;
  
  // 方法
  delete(element: any): void;
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
  HPBar: any;
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
  attack(enemy: any): void;
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
  HPBar: any;
  AttackBar: any;
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

// 游戏标签接口
export interface IGameLabel extends IGameElement {
  game: IGame;
  text: string;
  font: string;
  color: string;
}

// 血条接口
export interface IHpBar extends Omit<IGameElement, 'update'> {
  game: IGame;
  percentage: number;
  speed: number;
  greenW: number;
  redW: number;
  isRemove: boolean;
  character: any;
  
  // 方法
  draw(): void;
  update(percentage: number): void;
  setCharacter(character: any): void;
  remove(): void;
}

// 攻击伤害值接口
export interface IAttackValue extends Omit<IGameElement, 'update'> {
  game: IGame;
  number: number;
  color: string;
  text: string;
  isShow: boolean;
  character: any;
  
  // 方法
  draw(): void;
  update(hurtNum: number): void;
  setCharacter(character: any): void;
  setShow(show: boolean): void;
}

// ===========================================
// 调试系统类型定义
// ===========================================

// 调试模块接口
export interface IDebugModule extends IGameElement {
  game: IGame;
  enabled: boolean;
  
  // 方法
  initToggleButton(): void;
  drawPlayerCollision(player: any): void;
  drawEnemyCollision(enemy: any): void;
  drawMapCollision(map: any): void;
  drawCameraDebug(map: any): void;
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
  player: any;
  enemy: any;
  map: any;
  debugModule: any;
  
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

// ===========================================
// 资源管理系统类型定义
// ===========================================

// 图片资源接口
export interface ImageResource {
  name: string;
  url: string;
  preload?: boolean; // 是否预加载
}

// 加载进度接口
export interface LoadProgress {
  loaded: number;    // 已加载数量
  total: number;     // 总数量
  progress: number;  // 进度百分比 0-1
}

// 资源管理器接口
export interface IResourceManager {
  // 加载单个图片
  loadImage(name: string, url: string): Promise<HTMLImageElement>;
  
  // 批量加载图片
  loadImages(resources: ImageResource[]): Promise<Map<string, HTMLImageElement>>;
  
  // 预加载图片
  preloadImages(resources: ImageResource[]): Promise<void>;
  
  // 获取图片
  getImage(name: string): HTMLImageElement | null;
  
  // 检查是否已加载
  isImageLoaded(name: string): boolean;
  
  // 获取加载进度
  getLoadProgress(): LoadProgress;
  
  // 清理资源
  cleanup(): void;
  
  // 移除指定资源
  removeImage(name: string): void;
  
  // 获取所有资源名称
  getAllImageNames(): string[];
  
  // 获取内存使用情况
  getMemoryUsage(): { imageCount: number; estimatedSize: string };
  
  // 进度更新回调
  onProgressUpdate?: (progress: LoadProgress, resourceName: string) => void;
  
  // 错误处理回调
  onError?: (error: Error, resourceName: string) => void;
}
