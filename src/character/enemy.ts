import { Game } from "@/game/game";
import { Character } from "./character";
import {
  ENEMY_ATTACK_NUMBER,
  ENEMY_COOL_DOWN,
  ENEMY_DIE_NUMBER,
  ENEMY_HP,
  ENEMY_IDLE_NUMBER,
  ENEMY_RUN_NUMBER,
  RENDER_IMAGE_NUMBER,
} from "@/constants";
import { HpBar } from "@/value/hp-bar";
import { AttackValue } from "@/value/attack-value";
import { GameTileMap } from "@/game/game_map";

export class Enemy extends Character {
  dieFrame: HTMLImageElement[];
  attack1Frames: HTMLImageElement[];
  frameCount: number;
  defaultHp: number;
  HP: number;
  HPBar: HpBar;
  AttackBar: AttackValue;
  damageValue: number;
  isDead: boolean;
  constructor(game: Game) {
    super(game);
    this.frames = []; // 要渲染的 frames 里面是图片
    this.idleFrame = [];
    this.dieFrame = []; // 死亡的 frame
    this.runFrames = []; // 奔跑时的 frame
    this.attack1Frames = []; // 攻击类型1的 frame
    this.initFrames(game);
    this.initDieFrames(game);
    this.initRunFrame(game);
    this.initAttackFrame(game); // 给 attack1Frames 赋值
    this.texture = this.idleFrame[0]; // 设置第一帧图片
    this.frameCount = 0;
    this.w = this.texture.width; // 图片宽
    this.h = this.texture.height; // 图片高
    this.defaultHp = ENEMY_HP; // 默认设置 100 血
    this.HP = ENEMY_HP; // 当前血量
    this.x = 584;
    this.y = 364;
    this.HPBar = new HpBar(game, this.x, this.y + 20);
    this.AttackBar = new AttackValue(game, this.x, this.y);
    this.HPBar.setCharacter(this);
    this.AttackBar.setCharacter(this);
    this.damageValue = 0; // 受到的攻击伤害
    this.defaultLocation = "right"; // 默认朝向
    this.cooldown = ENEMY_COOL_DOWN;
    this.isDead = false; // 死亡状态
    this.isPlayer = false; // 是否是玩家
    // 添加地图引用，用于碰撞检测
  }

  // 设置地图引用
  setMap(map: GameTileMap) {
    this.map = map;
  }

  initAttackFrame(game: Game) {
    for (let i = 0; i < ENEMY_ATTACK_NUMBER; i++) {
      let name = `eattack${i}`;
      let t = game.textureByName(name);
      for (let j = 0; j < RENDER_IMAGE_NUMBER; j++) {
        this.attack1Frames.push(t as HTMLImageElement);
      }
    }
  }
  initRunFrame(game: Game) {
    for (let i = 0; i < ENEMY_RUN_NUMBER; i++) {
      let name = `ewalk${i}`;
      let t = game.textureByName(name);
      for (let j = 0; j < RENDER_IMAGE_NUMBER; j++) {
        this.runFrames.push(t as HTMLImageElement);
      }
    }
  }
  initFrames(game: Game) {
    for (let i = 0; i < ENEMY_IDLE_NUMBER; i++) {
      let name = `eidle${i}`;
      let t = game.textureByName(name);
      for (let j = 0; j < RENDER_IMAGE_NUMBER; j++) {
        this.idleFrame.push(t as HTMLImageElement);
      }
    }
  }
  initDieFrames(game: Game) {
    for (let i = 0; i < ENEMY_DIE_NUMBER; i++) {
      let name = `edie${i}`;
      let t = game.textureByName(name);
      for (let j = 0; j < RENDER_IMAGE_NUMBER; j++) {
        this.dieFrame.push(t as HTMLImageElement);
      }
    }
  }
  update() {
    // TODO 设置一个敌人挥刀的间隔时间
    if (this.cooldown > 0) {
      // 设置冷却时间
      this.cooldown--;
    }
    this.HPBar.update(this.HP / this.defaultHp);
    this.HPBar.x =
      this.movingDirection === this.defaultLocation
        ? this.x + this.w / 4
        : this.x + this.w / 2 - 5; // 未翻身的情况下
    this.AttackBar.update(Number(this.damageValue));
    this.AttackBar.x = this.x + this.w / 2 + 6;
    // 判断用户没有移动时，置为闲置状态
    if (this.isDead === false) {
      this.frameCount--;
    }
    if (
      this.isDie === false &&
      this.isMoving === false &&
      this.isAttack === false
    ) {
      this.frames = this.idleFrame;
    }

    if (this.frameCount < 0 && this.isDie) {
      // 这里可以删除这个元素了
      this.frameCount = 0;
      this.isDead = true;
      this.HPBar.remove();
    } else if (this.frameCount < 0) {
      this.frameCount = this.frames.length - 1;
    }
    if (!this.frames[this.frameCount]) {
      this.frameCount = this.frames.length - 1;
    }
    this.texture = this.frames[this.frameCount];
  }
  draw() {
    super.draw();
    this.HPBar.draw();
    this.AttackBar.draw();
  }
  // 被攻击到的事件
  killEvent(damageValue: number) {
    // damageValue 是伤害值
    if (this.isDead === false) {
      this.HP -= damageValue; // 掉血
      this.damageValue = damageValue;
      this.AttackBar.setShow(true);
      if (this.HP < 0) {
        // 血条为 0 的时候，死亡
        this.isDie = true;
        this.frames = this.dieFrame;
        this.frameCount = this.frames.length - 1;
      }
    }
  }
  attackEvent() {
    if (this.cooldown === 0 && this.isDie === false) {
      this.cooldown = ENEMY_COOL_DOWN; // 设置冷却为10帧
      this.frames = this.attack1Frames; // 设置攻击的 frame
      this.isAttack = true;
    }
  }

  // 敌人墙壁碰撞检测
  checkWallCollision(x: number) {
    // 如果没有地图引用，不执行碰撞检测
    if (!this.map) {
      return true; // 允许移动
    }

    // 简化碰撞检测
    let canMove = true;

    if (x < 0) {
      // 向左移动，检查左侧碰撞
      const centerX = Math.floor((this.x + this.w / 2) / this.map.tileSize);
      const leftCheckX = centerX - 1; // 以敌人中心左侧一格为检测点

      // 调整检测点位置，使碰撞区域下移
      // 原来是检测点在高度的20%、50%和80%处
      // 现在改为检测点在高度的50%、70%和90%处，忽略敌人上半部分
      const checkPoints = [
        Math.floor((this.y + this.h * 0.5) / this.map.tileSize),
        Math.floor((this.y + this.h * 0.7) / this.map.tileSize),
        Math.floor((this.y + this.h * 0.9) / this.map.tileSize),
      ];

      // 任一位置有墙壁都不能移动
      canMove = !checkPoints.some((y) => {
        // 使用修改后的墙壁检测逻辑
        const hasTile = this.map.onTheGround(leftCheckX, y);
        const isWall = hasTile && this.map.isTileWall(leftCheckX, y);
        return isWall;
      });
    } else {
      // 向右移动，检查右侧碰撞
      const centerX = Math.floor((this.x + this.w / 2) / this.map.tileSize);
      const rightCheckX = centerX + 1; // 以敌人中心右侧一格为检测点

      // 调整检测点位置，使碰撞区域下移
      const checkPoints = [
        Math.floor((this.y + this.h * 0.5) / this.map.tileSize),
        Math.floor((this.y + this.h * 0.7) / this.map.tileSize),
        Math.floor((this.y + this.h * 0.9) / this.map.tileSize),
      ];

      // 任一位置有墙壁都不能移动
      canMove = !checkPoints.some((y) => {
        // 使用修改后的墙壁检测逻辑
        const hasTile = this.map.onTheGround(rightCheckX, y);
        const isWall = hasTile && this.map.isTileWall(rightCheckX, y);
        return isWall;
      });
    }

    return canMove;
  }

  // 重写移动方法，增加碰撞检测
  move(x: number) {
    if (this.isDie === false) {
      // 检查是否可以移动
      const canMove = this.checkWallCollision(x);

      // 在移动的时候更换动作
      this.isMoving = true;

      // 设置移动方向
      if (x < 0) {
        // 向左移动
        this.movingDirection = "left";
      } else {
        this.movingDirection = "right";
      }

      // 如果可以移动，更新位置
      if (canMove) {
        // 更新坐标位置
        this.x += x;
      }

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
