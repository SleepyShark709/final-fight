import {
  COOL_DOWN,
  GRAVITATIONAL_ACCELERATION,
  GRAVITATIONAL_ACCELERATION_PERCENT,
  JUMP_HEIGHT,
  PLAYER_ATTACK_DAMAGE_VALUE,
  PLAYER_ATTACK_TYPE,
  PLAYER_ATTACK_TYPE_1_OR_2_NUMBER,
  PLAYER_ATTACK_TYPE_3_NUMBER,
  PLAYER_IDLE_IMAGE_NUMBER,
  PLAYER_JUMP_IMAGE_NUMBER,
  PLAYER_RUN_IMAGE_NUMBER,
  RENDER_IMAGE_NUMBER,
} from "@/constants";
import { Character } from "./character";
import { Game } from "@/game/game";
import { GameTileMap } from "@/game/game_map";
import { HpBar } from "@/value/hp-bar";
import { Enemy } from "./enemy";
import { SceneTitle } from "@/scene/title/scene-title";

// 主角角色
export class Player extends Character {
  attack1Frames: HTMLImageElement[];
  attack2Frames: HTMLImageElement[];
  attack3Frames: HTMLImageElement[];
  jumpFrames: HTMLImageElement[];
  frameCount: number;
  attackType: number;
  gy: any;
  vy: number;
  isOnGround: boolean;
  vx: number;
  mx: number;
  maxSpeed: number;
  maxHP: number;
  currentHP: number;
  isDead: boolean;
  HPBar: any;
  footOffset: number;
  jumpHitWall: boolean;
  minVerticalDelta: number;
  constructor(game: Game, map: GameTileMap) {
    super(game);
    this.game = game;
    this.map = map;
    this.tileSize = map.tileSize;
    this.frames = []; // 要渲染的 frames 里面是图片
    this.idleFrame = []; // 闲置时的 frame
    this.runFrames = []; // 奔跑时的 frame
    this.attack1Frames = []; // 攻击类型1的 frame
    this.attack2Frames = []; // 攻击类型2的 frame
    this.attack3Frames = []; // 攻击类型3的 frame
    this.jumpFrames = []; // 跳跃的 frame
    this.initIdleFrame(game); // 给 idleFrame 赋值
    this.initRunFrame(game); // 给 runFrames 赋值
    this.initAttackFrame(game, 1); // 给 attack1Frames 赋值
    this.initAttackFrame(game, 2); // 给 attack2Frames 赋值
    this.initAttackFrame(game, 3); // 给 attack3Frames 赋值
    this.initJumpFrame(game); // 给 jumpFrames 赋值
    this.texture = this.idleFrame[0]; // 设置第一帧图片
    this.frameCount = 0; // 设置 frame 的数量
    this.w = this.texture.width; // 图片宽
    this.h = this.texture.height; // 图片高
    this.flipX = false; // 是否进行 X 轴翻转
    this.isMoving = false; // 是否在进行移动
    this.movingDirection = "right"; // 移动的方向
    this.cooldown = COOL_DOWN; // 攻击的冷却时间，不能让用户按住攻击键不松手一直进行攻击
    this.attackType = 1; // 攻击类型，每次按下攻击会切换攻击类型，一共有3组，为攻击1、攻击2、攻击3
    this.gy = GRAVITATIONAL_ACCELERATION; // 重力加速度
    this.vy = 0; // y轴的速度
    this.isJump = false; // 是否在跳跃
    this.isOnGround = false; // 新增：是否在地面上
    this.isPlayer = true; // 是否是玩家
    this.vx = 0; // x加速度
    this.mx = 0; // x摩擦力
    this.maxSpeed = 2.5;
    // 添加血量相关属性
    this.maxHP = 100;
    this.currentHP = 100;
    this.isDead = false;
    this.HPBar = new HpBar(game, this.x, this.y + 20);
    // 关联血条与角色，便于应用地图偏移
    this.HPBar.setCharacter(this);
    // 和地图相关的数据

    // 脚部位置偏移量，用于调整角色在地面上的视觉效果
    // 修改：减小偏移量以避免角色陷入地面
    this.footOffset = 2; // 从5减小为2，让角色更靠近地面表面但不会陷入

    // 新增：跳跃过程中是否撞墙标志
    this.jumpHitWall = false;

    // 新增：最小垂直位移量，防止角色因浮点数精度问题而抖动
    this.minVerticalDelta = 0.1;
  }
  //@ts-ignore
  static new(...args) {
    //@ts-ignore
    return new this(...args);
  }
  initIdleFrame(game: Game) {
    // 创建闲置时的 frame 数组，里面存放的是图片信息
    for (let i = 0; i < PLAYER_IDLE_IMAGE_NUMBER; i++) {
      let name = `idle${i}`;
      let t = game.textureByName(name);
      for (let j = 0; j < RENDER_IMAGE_NUMBER; j++) {
        this.idleFrame.push(t as HTMLImageElement);
      }
    }
  }
  initRunFrame(game: Game) {
    // 创建奔跑时的 frame 数组，里面存放的是图片信息
    for (let i = 0; i < PLAYER_RUN_IMAGE_NUMBER; i++) {
      let name = `run${i}`;
      let t = game.textureByName(name);
      for (let j = 0; j < RENDER_IMAGE_NUMBER; j++) {
        this.runFrames.push(t as HTMLImageElement);
      }
    }
  }
  initAttackFrame(game: Game, type: number) {
    let ATTACK_MAP: { [key: number]: HTMLImageElement[] } = {
      1: this.attack1Frames,
      2: this.attack2Frames,
      3: this.attack3Frames,
    };
    let index =
      type === 3
        ? PLAYER_ATTACK_TYPE_3_NUMBER
        : PLAYER_ATTACK_TYPE_1_OR_2_NUMBER;
    for (let i = 0; i < index; i++) {
      let name = `attack${type}_${i}`;
      let t = game.textureByName(name);
      for (let j = 0; j < RENDER_IMAGE_NUMBER; j++) {
        ATTACK_MAP[type].push(t as HTMLImageElement);
      }
    }
  }
  initJumpFrame(game: Game) {
    for (let i = 0; i < PLAYER_JUMP_IMAGE_NUMBER; i++) {
      let name = `jump${i}`;
      let t = game.textureByName(name);
      for (let j = 0; j < RENDER_IMAGE_NUMBER; j++) {
        this.jumpFrames.push(t as HTMLImageElement);
      }
    }
  }
  jump(keyStatus: string) {
    // 只有人物在地面的时候才可以跳
    // if (this.y === 385) {
    console.log(
      `尝试跳跃: keyStatus=${keyStatus}, isJump=${this.isJump}, isOnGround=${this.isOnGround}, jumpHitWall=${this.jumpHitWall}`
    );

    if (
      keyStatus === "down" &&
      this.isJump === false &&
      this.isOnGround === true
    ) {
      console.log("跳跃开始");

      this.isJump = true;
      // 重要修复：开始跳跃时重置跳跃碰撞标志
      this.jumpHitWall = false;
      this.frames = this.jumpFrames;

      // 修复：确保角色有足够的初始速度离开地面，防止因为帧率问题导致角色被检测为依然在地面上
      this.vy = -JUMP_HEIGHT;

      // 修复：设置角色不在地面上，防止在下一帧立即重新判断为在地面
      this.isOnGround = false;

      console.log(
        `跳跃状态设置: isJump=${this.isJump}, jumpHitWall=${this.jumpHitWall}, vy=${this.vy}, 当前y=${this.y}, isOnGround=${this.isOnGround}`
      );
    }

    // }
  }
  updateGravity() {
    // 使用角色中心点和底部作为地面检测点
    let footX = Math.floor((this.x + this.w / 2) / this.tileSize);
    let footY = Math.floor((this.y + this.h) / this.tileSize);

    // 检查脚下是否有地面 - 修改为检查脚下中心位置
    let onTheGround = this.map.onTheGround(footX, footY);

    // 记录初始地面检测结果
    console.log(
      `地面检测: 位置(${footX}, ${footY}), 中心点检测=${onTheGround}`
    );

    // 增加：检查左右脚位置，提高站在边缘时的稳定性
    // 当玩家站在砖块边缘时，防止掉落
    if (!onTheGround) {
      // 检查左脚和右脚
      const leftFootX = Math.floor((this.x + this.w * 0.3) / this.tileSize);
      const rightFootX = Math.floor((this.x + this.w * 0.7) / this.tileSize);

      // 如果左脚或右脚下方有砖块，就认为玩家站在地面上
      const leftGroundCheck = this.map.onTheGround(leftFootX, footY);
      const rightGroundCheck = this.map.onTheGround(rightFootX, footY);
      onTheGround = leftGroundCheck || rightGroundCheck;

      // 记录左右脚检测结果
      console.log(
        `左右脚检测: 左脚(${leftFootX}, ${footY})=${leftGroundCheck}, 右脚(${rightFootX}, ${footY})=${rightGroundCheck}`
      );
    }

    // 检测上一帧是否已经在地面上
    let wasOnGround = this.isOnGround;

    // 修复：仅当下落速度为正（下落状态）或接近于零时才认为在地面上
    // 增加一个小的容差值，避免浮点数精度问题
    const velocityThreshold = 0.1;
    this.isOnGround = onTheGround && this.vy >= -velocityThreshold;

    // 记录地面状态变化
    console.log(
      `地面状态: 上一帧=${wasOnGround}, 当前帧=${this.isOnGround}, vy=${this.vy}, jumpHitWall=${this.jumpHitWall}`
    );

    if (this.isOnGround) {
      // 在地面上时，停止下落并重置状态
      if (this.vy > 0) {
        // 只有当正在下落时才调整位置
        // 将角色精确放置在地形上方，不留间隙
        // 使用footOffset调整角色位置，让角色视觉上正好站在地面上
        const oldY = this.y;
        this.y = footY * this.tileSize - this.h + this.footOffset;

        // 修复：强制将垂直速度设为0，防止陷入地面
        this.vy = 0;
        console.log(`落地调整位置: 从${oldY}到${this.y}, vy设为${this.vy}`);
      } else if (Math.abs(this.vy) < velocityThreshold) {
        // 修复：当速度接近0时也重置位置，确保角色正确站在地面上
        const oldY = this.y;
        this.y = footY * this.tileSize - this.h + this.footOffset;
        this.vy = 0;
        console.log(`低速落地调整: 从${oldY}到${this.y}, vy从${this.vy}设为0`);
      }

      // 只有在之前不在地面而现在在地面时才重置跳跃状态
      if (!wasOnGround) {
        const oldJumpState = this.isJump;
        this.isJump = false;

        // 重要修复：落地时重置所有阻碍移动的标志
        this.isBlockOnFrount = false;
        this.jumpHitWall = false;

        console.log(
          `落地重置状态: 从isJump=${oldJumpState}到${this.isJump}, isBlockOnFrount=${this.isBlockOnFrount}, jumpHitWall=${this.jumpHitWall}`
        );

        // 如果是从跳跃状态落地，改变动画
        if (this.frames === this.jumpFrames) {
          this.frames = this.idleFrame;
          console.log(`落地更改动画: 从跳跃帧到闲置帧`);
        }
      }
    } else {
      // 不在地面上，应用重力
      const oldY = this.y;
      const oldVy = this.vy;

      // 修复：应用位移前检查垂直速度是否足够大
      // 如果速度太小，可能导致因浮点数精度问题而导致角色抖动
      if (Math.abs(this.vy) > this.minVerticalDelta) {
        this.y += this.vy;
      } else {
        // 如果速度太小且接近零，直接设为零避免微小位移
        if (Math.abs(this.vy) < this.minVerticalDelta) {
          this.vy = 0;
        }
      }

      // 继续应用重力加速度
      this.vy += this.gy * GRAVITATIONAL_ACCELERATION_PERCENT;
      console.log(
        `空中状态: y位置从${oldY}到${this.y}, 速度从${oldVy}到${this.vy}`
      );

      // 在上升过程中，检查是否已经越过墙壁顶部，如果是，重置jumpHitWall
      if (this.isJump && this.jumpHitWall && this.vy < 0) {
        // 获取玩家当前的y网格位置
        const playerGridY = Math.floor(this.y / this.tileSize);

        // 检查左右两侧是否有墙
        const centerX = Math.floor((this.x + this.w / 2) / this.tileSize);
        const leftWall = this.map.onTheGround(centerX - 1, playerGridY + 1);
        const rightWall = this.map.onTheGround(centerX + 1, playerGridY + 1);

        // 如果已经跳到墙壁顶部上方，取消墙壁碰撞标志
        if (!leftWall && !rightWall) {
          this.jumpHitWall = false;
          console.log(
            `已越过墙壁顶部: 重置jumpHitWall=false, 位置y=${this.y}, 网格y=${playerGridY}`
          );
        }
      }

      // 游戏世界的底部边界检查
      if (this.y > 385) {
        // 应用相同的偏移量保持一致性
        this.y = 385 + this.footOffset;
        this.vy = 0;
        this.isJump = false;
        this.isOnGround = true;

        // 重要修复：碰到世界底部时重置所有阻碍移动的标志
        this.isBlockOnFrount = false;
        this.jumpHitWall = false;

        console.log(
          `碰到世界底部: 重置位置到${this.y}, isJump=${this.isJump}, isOnGround=${this.isOnGround}, isBlockOnFrount=${this.isBlockOnFrount}, jumpHitWall=${this.jumpHitWall}`
        );

        if (this.frames === this.jumpFrames) {
          this.frames = this.idleFrame;
          console.log(`碰到世界底部: 更改动画从跳跃帧到闲置帧`);
        }
      }
    }

    // 检测头顶碰撞
    if (this.vy < 0) {
      // 使用角色顶部中心点检测头顶碰撞
      let headX = Math.floor((this.x + this.w / 2) / this.tileSize);
      let headY = Math.floor(this.y / this.tileSize);
      let headBlock = this.map.onTheGround(headX, headY);

      if (headBlock) {
        // 如果头顶有障碍物，停止上升
        const oldVy = this.vy;
        const oldY = this.y;
        this.vy = 0;
        // 稍微下移角色，防止卡在砖块中
        this.y = (headY + 1) * this.tileSize;
        console.log(
          `头顶碰撞: 位置(${headX}, ${headY}), vy从${oldVy}到${this.vy}, y从${oldY}到${this.y}`
        );
      }
    }
  }

  // 简化水平碰撞检测
  checkHorizontalCollision() {
    // 使用角色中心点的X坐标作为碰撞检测基准
    const centerX = Math.floor((this.x + this.w / 2) / this.tileSize);

    // 计算左右检测点，向左右各偏移一格
    const leftCheckX = centerX - 1;
    const rightCheckX = centerX + 1;

    // 调整检测点位置，主要检测角色上半部分，避免误判地面
    const checkPoints = [
      Math.floor((this.y + this.h * 0.3) / this.tileSize), // 上部位置
      Math.floor((this.y + this.h * 0.4) / this.tileSize), // 中部偏上位置
    ];

    // 如果不在地面上，也检测脚部位置
    if (!this.isOnGround) {
      checkPoints.push(Math.floor((this.y + this.h * 0.7) / this.tileSize)); // 下部位置
    }

    console.log(
      `水平碰撞检测点: [${checkPoints.join(", ")}], isOnGround=${
        this.isOnGround
      }`
    );

    // 检查左右是否有墙壁（任一高度位置）
    const leftWall = checkPoints.some((y) => {
      const hasTile = this.map.onTheGround(leftCheckX, y);
      const isWall = hasTile && this.map.isTileWall(leftCheckX, y);
      if (isWall) {
        console.log(
          `水平碰撞检测 - 左侧墙壁: 位置(${leftCheckX}, ${y}), isJump=${this.isJump}`
        );
      }
      return isWall;
    });

    const rightWall = checkPoints.some((y) => {
      const hasTile = this.map.onTheGround(rightCheckX, y);
      const isWall = hasTile && this.map.isTileWall(rightCheckX, y);
      if (isWall) {
        console.log(
          `水平碰撞检测 - 右侧墙壁: 位置(${rightCheckX}, ${y}), isJump=${this.isJump}`
        );
      }
      return isWall;
    });

    // 碰撞状态标志 - 只在真正碰到墙壁时设置
    let hasHorizontalCollision = false;

    // 检查玩家在跳跃过程中是否可以越过墙壁
    let canJumpOver = false;

    if (this.isJump && this.vy < 0) {
      // 如果正在向上跳跃
      // 检查墙壁顶部位置
      const wallTopY = Math.floor(this.y / this.tileSize) - 1; // 检查角色上方一格

      if (leftWall && this.vx < 0) {
        // 检查左侧墙壁顶部是否有空间
        canJumpOver = !this.map.onTheGround(leftCheckX, wallTopY);
        console.log(
          `检查左侧墙壁顶部: 位置(${leftCheckX}, ${wallTopY}), 可越过=${canJumpOver}`
        );
      }

      if (rightWall && this.vx > 0) {
        // 检查右侧墙壁顶部是否有空间
        canJumpOver = !this.map.onTheGround(rightCheckX, wallTopY);
        console.log(
          `检查右侧墙壁顶部: 位置(${rightCheckX}, ${wallTopY}), 可越过=${canJumpOver}`
        );
      }
    }

    // 应用碰撞响应 - 不再改变玩家位置，只停止水平速度
    if (rightWall && this.vx > 0) {
      // 不再重新计算玩家位置，只重置速度
      this.vx = 0;
      this.mx = 0;
      hasHorizontalCollision = true;
      console.log(
        `右侧碰撞响应: 停止移动, vx=${this.vx}, isJump=${this.isJump}, canJumpOver=${canJumpOver}`
      );
    }

    if (leftWall && this.vx < 0) {
      // 不再重新计算玩家位置，只重置速度
      this.vx = 0;
      this.mx = 0;
      hasHorizontalCollision = true;
      console.log(
        `左侧碰撞响应: 停止移动, vx=${this.vx}, isJump=${this.isJump}, canJumpOver=${canJumpOver}`
      );
    }

    // 跳跃状态下的碰撞处理
    if (this.isJump) {
      if (hasHorizontalCollision && !canJumpOver) {
        this.jumpHitWall = true;
        console.log(
          `跳跃中碰撞: 设置jumpHitWall=true, canJumpOver=${canJumpOver}`
        );
      } else if (canJumpOver) {
        // 如果可以越过墙壁顶部，不设置碰撞标志
        this.jumpHitWall = false;
        console.log(`跳跃可越过墙壁: 设置jumpHitWall=false`);
      }
    } else if (!this.isJump && !hasHorizontalCollision) {
      this.jumpHitWall = false;
    }

    return hasHorizontalCollision;
  }

  update() {
    // 更新血条位置
    this.HPBar.update(this.currentHP / this.maxHP);
    this.HPBar.x = this.x + this.w / 4;
    this.HPBar.y = this.y - 20;

    // 记录更新开始时的状态
    console.log(
      `更新开始: isJump=${this.isJump}, isOnGround=${this.isOnGround}, isMoving=${this.isMoving}`
    );

    // 摩擦力系统
    // 更新 x 加速和受力
    this.vx += this.mx;
    if (Math.abs(this.vx) >= this.maxSpeed) {
      this.vx = this.maxSpeed;
    }
    // 说明摩擦力已经把速度降至 0 以下，停止摩擦
    if (this.vx * this.mx > 0) {
      this.vx = 0;
      this.mx = 0;
    } else {
      // 先检测水平碰撞
      const hasCollision = this.checkHorizontalCollision();

      // 只有在没有碰撞的情况下才应用水平速度
      if (!hasCollision && this.vx !== 0) {
        this.x += this.vx;
      }
    }

    // 应用重力和垂直碰撞检测
    this.updateGravity();

    // 当角色x位置超出地图，将其限制在地图范围内
    // 只检查左边界，不再限制右边界，允许玩家无限向右移动
    if (this.x < 0) {
      this.x = 0;
    }

    if (this.cooldown > 0) {
      // 设置冷却时间
      this.cooldown--;
    }
    // 如果当前没有移动，则更改 frame 为闲置状态
    if (
      this.isMoving === false &&
      this.isAttack === false &&
      this.isJump === false
    ) {
      this.frames = this.idleFrame;
    }
    // 判断用户没有移动时，置为闲置状态
    this.frameCount--;
    if (this.frameCount < 0) {
      if (this.isAttack === true) {
        this.frames = this.idleFrame;
        this.isAttack = false;
      }
      this.frameCount = this.frames.length - 1;
    }
    // 这里出现「this.frames[this.frameCount] === undefined」报错的问题是，在这一瞬间，调用了 move 函数修改了 this.frame，导致获取到的数组长度不一致了
    // 这里想到简单的 hack 办法是，将所有动作的帧数都保持一致
    if (this.frameCount > this.frames.length) {
      // 解决由于 frame 的长度和 frameCount 对应不上的问题，强制设置当前的 count 为最后一帧，解决画面闪动消失的问题
      this.frameCount = this.frames.length - 1;
    }
    this.texture = this.frames[this.frameCount];

    // 设置当前为非移动状态
    const oldMovingState = this.isMoving;
    this.isMoving = false;

    // 记录更新结束时的状态
    console.log(
      `更新结束: isJump=${this.isJump}, isOnGround=${this.isOnGround}, isMoving从${oldMovingState}变为${this.isMoving}`
    );
  }
  attack(enemy: Enemy) {
    let ATTACK_FRAMES_MAP: { [key: number]: HTMLImageElement[] } = {
      1: this.attack1Frames,
      2: this.attack2Frames,
      3: this.attack3Frames,
    };
    if (this.cooldown === 0) {
      this.cooldown = COOL_DOWN; // 设置冷却为10帧
      if (this.attackType > PLAYER_ATTACK_TYPE) {
        // 当攻击的枚举值超过当前枚举数量时，重置攻击枚举值
        this.attackType = 1;
      }
      if (this.isMoving === true) {
        this.attackType = 3; // 当移动时攻击使用第三种攻击方式
      }
      this.frames = ATTACK_FRAMES_MAP[this.attackType]; // 设置奔跑的 frame
      this.frameCount = PLAYER_ATTACK_TYPE_1_OR_2_NUMBER * RENDER_IMAGE_NUMBER;
      this.isAttack = true;
      this.attackType += 1; // 攻击枚举值 + 1
      // 判断人物与敌人是否碰撞
      // this.x > enemy.x - 15 - this.w // 当玩家在敌人左侧 15 个像素点
      // enemy.x + enemy.w + 15 > this.x // 当玩家在敌人右侧 15 个像素点
      // console.log('当玩家在敌人左侧 15 个像素点', this.x > enemy.x - 5 - this.w)
      // console.log('当玩家在敌人右侧 15 个像素点', this.x < enemy.x + enemy.w + 5)
      // 逻辑是敌人和玩家的图片解除到的时候，其实肉眼看是没有接触到的（因为有空白部分），所以要让图片负接触一些，才是肉眼可见的打击到了
      if (this.x > enemy.x + 30 - this.w && this.x < enemy.x + enemy.w - 30) {
        console.log("开始攻击");
        // 开始攻击, 删除敌人 TODO 这里应该在攻击动画播放结束的时候删除敌人,现在定时器是一种 hack 的方案。不应该这么做
        setTimeout(() => {
          // 暂时设置伤害值是 30-50 间的随机数
          let damageValue = Math.round(PLAYER_ATTACK_DAMAGE_VALUE);
          enemy.killEvent(damageValue);
        }, 500);
      }
    }
  }

  move(x: number) {
    // 简化移动碰撞检测
    let canMove = true;

    // 添加日志，记录移动开始前的状态
    console.log(
      `移动前状态: isJump=${this.isJump}, isOnGround=${this.isOnGround}, isMoving=${this.isMoving}, isBlockOnFrount=${this.isBlockOnFrount}, jumpHitWall=${this.jumpHitWall}, x=${this.x}, y=${this.y}`
    );

    // 重要修复：如果玩家在地面上，确保isBlockOnFrount和jumpHitWall标志不会错误地阻止移动
    if (this.isOnGround && !this.isJump) {
      this.isBlockOnFrount = false;
      this.jumpHitWall = false;
    }

    // 检查玩家是否正在跳跃且接近墙壁顶部
    let nearWallTop = false;
    if (this.isJump && this.vy < 0) {
      // 如果正在向上跳跃
      const centerX = Math.floor((this.x + this.w / 2) / this.tileSize);
      const playerTopY = Math.floor(this.y / this.tileSize);

      // 检查墙壁顶部位置
      if (x < 0) {
        // 向左移动
        const leftCheckX = centerX - 1;
        // 检查当前高度是否有墙，下一格是否有墙
        const hasWallCurrent = this.map.onTheGround(leftCheckX, playerTopY);
        const hasWallBelow = this.map.onTheGround(leftCheckX, playerTopY + 1);

        // 如果当前位置没有墙但下方有墙，说明可能正好在墙壁顶部
        nearWallTop = !hasWallCurrent && hasWallBelow;
        if (nearWallTop) {
          console.log(
            `检测到左侧墙壁顶部: 位置(${leftCheckX}, ${playerTopY}), 当前=${hasWallCurrent}, 下方=${hasWallBelow}`
          );
        }
      } else {
        // 向右移动
        const rightCheckX = centerX + 1;
        // 检查当前高度是否有墙，下一格是否有墙
        const hasWallCurrent = this.map.onTheGround(rightCheckX, playerTopY);
        const hasWallBelow = this.map.onTheGround(rightCheckX, playerTopY + 1);

        // 如果当前位置没有墙但下方有墙，说明可能正好在墙壁顶部
        nearWallTop = !hasWallCurrent && hasWallBelow;
        if (nearWallTop) {
          console.log(
            `检测到右侧墙壁顶部: 位置(${rightCheckX}, ${playerTopY}), 当前=${hasWallCurrent}, 下方=${hasWallBelow}`
          );
        }
      }
    }

    if (x < 0) {
      // 向左移动，检查左侧碰撞
      const centerX = Math.floor((this.x + this.w / 2) / this.tileSize);
      const leftCheckX = centerX - 1; // 以角色中心左侧一格为检测点

      // 修改检测点为主要在角色上半部分，避免误将地面识别为墙壁
      const checkPoints = [
        Math.floor((this.y + this.h * 0.2) / this.tileSize), // 上部位置
        Math.floor((this.y + this.h * 0.5) / this.tileSize), // 中部位置
      ];

      // 如果不在地面上，也检测脚部位置
      if (!this.isOnGround) {
        checkPoints.push(Math.floor((this.y + this.h * 0.8) / this.tileSize)); // 下部位置
      }

      // 任一位置有墙壁都不能移动
      canMove = !checkPoints.some((y) => {
        // 使用修改后的墙壁检测逻辑
        const hasTile = this.map.onTheGround(leftCheckX, y);
        const isWall = hasTile && this.map.isTileWall(leftCheckX, y);
        // 记录碰撞检测结果
        if (isWall) {
          console.log(
            `左侧墙壁碰撞: 位置(${leftCheckX}, ${y}), hasTile=${hasTile}, isWall=${isWall}`
          );
        }
        return isWall;
      });

      this.movingDirection = "left";
    } else {
      // 向右移动，检查右侧碰撞
      const centerX = Math.floor((this.x + this.w / 2) / this.tileSize);
      const rightCheckX = centerX + 1; // 以角色中心右侧一格为检测点

      // 修改检测点为主要在角色上半部分，避免误将地面识别为墙壁
      const checkPoints = [
        Math.floor((this.y + this.h * 0.2) / this.tileSize), // 上部位置
        Math.floor((this.y + this.h * 0.5) / this.tileSize), // 中部位置
      ];

      // 如果不在地面上，也检测脚部位置
      if (!this.isOnGround) {
        checkPoints.push(Math.floor((this.y + this.h * 0.8) / this.tileSize)); // 下部位置
      }

      // 任一位置有墙壁都不能移动
      canMove = !checkPoints.some((y) => {
        // 使用修改后的墙壁检测逻辑
        const hasTile = this.map.onTheGround(rightCheckX, y);
        const isWall = hasTile && this.map.isTileWall(rightCheckX, y);
        // 记录碰撞检测结果
        if (isWall) {
          console.log(
            `右侧墙壁碰撞: 位置(${rightCheckX}, ${y}), hasTile=${hasTile}, isWall=${isWall}`
          );
        }
        return isWall;
      });

      this.movingDirection = "right";
    }

    console.log(
      `移动检测结果: canMove=${canMove}, isBlockOnFrount=${this.isBlockOnFrount}, jumpHitWall=${this.jumpHitWall}, nearWallTop=${nearWallTop}`
    );

    // 设置方向 - 始终更新方向，无论是否碰墙
    this.flipX =
      this.defaultLocation === "right"
        ? x < 0
        : this.defaultLocation === "left"
        ? x > 0
        : false;
    this.isMoving = true;

    // 如果玩家正在向上跳跃接近墙壁顶部，或者没有碰到墙，就允许移动
    if (
      (canMove && !this.isBlockOnFrount && !this.jumpHitWall) ||
      nearWallTop
    ) {
      console.log("执行移动");
      super.move(x);
      // 摩擦力系统
      let speed = 0.3 * x;
      this.vx += speed;
      this.mx = -speed / 2;

      // 如果正在接近墙壁顶部，重置碰撞标志
      if (nearWallTop) {
        this.isBlockOnFrount = false;
        this.jumpHitWall = false;
        console.log(
          `靠近墙壁顶部: 重置碰撞标志 isBlockOnFrount=false, jumpHitWall=false`
        );
      }
    } else {
      console.log(
        `无法移动: 原因=${
          !canMove
            ? "当前碰墙"
            : this.isBlockOnFrount
            ? "前方有障碍"
            : "跳跃中碰墙"
        }`
      );
      // 即使不能移动，也设置奔跑动画
      if (this.isJump === false && this.isAttack === false) {
        this.frames = this.runFrames;
      }

      // 只在确实碰到墙壁时才设置isBlockOnFrount
      if (!canMove) {
        this.isBlockOnFrount = true;
      }
    }

    // 记录移动后的状态
    console.log(
      `移动后状态: isJump=${this.isJump}, isOnGround=${this.isOnGround}, isMoving=${this.isMoving}, isBlockOnFrount=${this.isBlockOnFrount}, jumpHitWall=${this.jumpHitWall}, canMove=${canMove}`
    );

    // 返回是否成功移动
    return (
      (canMove && !this.isBlockOnFrount && !this.jumpHitWall) || nearWallTop
    );
  }
  draw() {
    // 调用原始绘制方法
    super.draw();
    this.HPBar.draw();
  }

  // 受伤方法
  takeDamage(damage: number) {
    if (!this.isDead) {
      this.currentHP -= damage;
      if (this.currentHP <= 0) {
        this.currentHP = 0;
        this.die();
      }
    }
  }

  // 死亡方法
  die() {
    this.isDead = true;
    // 移除血条
    this.HPBar.remove();
    // 停止所有动画和更新
    this.frames = [];
    this.texture = null;
    // 停止场景更新

    // 切换到游戏结束场景
    let s = SceneTitle.new(this.game);
    this.game.replaceScene(s);
  }
}
