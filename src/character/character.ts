import { COOL_DOWN } from "@/constants";
import { Game } from "@/game/game";
import { GameImage } from "@/game/game_image";
import { GameTileMap } from "@/game/game_map";

// 角色
export class Character {
  game: Game;
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
  map: GameTileMap;
  isBlockOnFrount: boolean;
  idleFrame: HTMLImageElement[];
  texture: any;
  w: number;
  h: number;
  x: number;
  y: number;
  isPlayer?: boolean;
  constructor(game: Game) {
    this.game = game;
    this.frames = []; // 要展示的动画
    this.runFrames = []; // 奔跑时的 frame
    this.flipX = false;
    this.isJump = false;
    this.isMoving = false;
    this.isDie = false; // 是否死亡
    this.defaultLocation = "right"; // 默认朝向
    this.cooldown = COOL_DOWN; // 攻击的冷却时间，不能让用户按住攻击键不松手一直进行攻击
    this.movingDirection = "left"; // 默认前进方向
    this.isAttack = false; // 是否在攻击
    this.tileSize = 32;
    this.map = new GameTileMap(game);
    this.isBlockOnFrount = false; // 前方是否为 tiles
    this.w = 0;
    this.h = 0;
    this.x = 0;
    this.y = 0;
    this.idleFrame = [new Image()];
  }

  static new(game: Game) {
    return new this(game);
  }

  delete(element: GameImage) {
    this.game.deleteImage(element);
  }

  update() {
    // 如果当前没有移动，则更改 frame 为闲置状态
    if (
      this.isMoving === false &&
      this.isAttack === false &&
      this.isJump === false &&
      this.idleFrame
    ) {
      this.frames = this.idleFrame;
    }
    this.isMoving = false;
    this.w = this.texture.width; // 图片宽
    this.h = this.texture.height; // 图片高
  }
  draw() {
    let context = this.game.context;
    context.save();
    let w2 = this.w / 2;
    let h2 = this.h / 2;

    // 获取角色的屏幕坐标（考虑地图偏移）
    let screenX = this.x;
    let screenY = this.y;

    // 如果角色有地图引用且地图有偏移功能，应用地图偏移
    if (this.map && this.map.offsetX !== undefined) {
      screenX = Math.floor(this.x + this.map.offsetX);
    }

    context.translate(screenX + w2, screenY + h2);
    if (this.flipX) {
      context.scale(-1, 1);
    }
    context.translate(-w2, -h2);
    if (this.isPlayer) {
      // 他妈的，因为玩家和敌人的图片大小不一致，玩家图太几小了，所以要放大
      this.texture && context.drawImage(this.texture, 0, 0, 96, 64);
    } else {
      this.texture && context.drawImage(this.texture, 0, 0);
    }
    context.restore();
  }

  move(x: number): void {
    if (this.isDie === false) {
      // 在移动的时候更换动作
      this.isMoving = true;

      // 只设置移动方向，不进行碰撞检测
      if (x < 0) {
        // 向左移动
        this.movingDirection = "left";
      } else {
        this.movingDirection = "right";
      }

      // 更新坐标位置
      this.x += x;

      // 设置角色朝向
      this.flipX =
        this.defaultLocation === "right"
          ? x < 0
          : this.defaultLocation === "left"
          ? x > 0
          : false;

      // 如果没在跳跃或攻击状态，则设置为奔跑动画
      if (this.isJump === false && this.isAttack === false) {
        this.frames = this.runFrames;
      }
    }
  }
}
