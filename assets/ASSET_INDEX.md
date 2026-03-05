# 素材资源索引 (Asset Index)

> 本文档记录了 Final Fight V2 项目中所有素材资源的详细信息，包括用途、尺寸、使用状态和集成指南。
> 最后更新: 2026-03-05

---

## 目录

- [1. 当前已使用的素材](#1-当前已使用的素材)
  - [1.1 玩家角色 (player/)](#11-玩家角色-player)
  - [1.2 敌人角色 (enemy/)](#12-敌人角色-enemy)
  - [1.3 背景 (backgrounds/)](#13-背景-backgrounds)
  - [1.4 旧背景 (background/)](#14-旧背景-background)
  - [1.5 环境装饰 (environment/)](#15-环境装饰-environment)
  - [1.6 草地瓦片 (grass/)](#16-草地瓦片-grass)
  - [1.7 物品 (items/)](#17-物品-items)
  - [1.8 UI 素材 (ui/)](#18-ui-素材-ui)
  - [1.9 特效 (vfx/)](#19-特效-vfx)
- [2. 待集成的新素材](#2-待集成的新素材)
  - [2.1 新敌人素材 (ai-enemies/)](#21-新敌人素材-ai-enemies)
  - [2.2 Kenney 瓦片包 (ai-kenney/)](#22-kenney-瓦片包-ai-kenney)
  - [2.3 像素 UI 包 (ai-ui/)](#23-像素-ui-包-ai-ui)
  - [2.4 特效素材 (ai-vfx/)](#24-特效素材-ai-vfx)
- [3. 集成指南](#3-集成指南)
- [4. 许可证信息](#4-许可证信息)

---

## 1. 当前已使用的素材

> 这些素材已在 `BootScene.ts` 中加载，并在游戏中使用。

### 1.1 玩家角色 (player/)

**加载方式**: 逐帧 PNG，在 BootScene 中通过 `ASSETS.PLAYER_*` 常量加载
**帧尺寸**: 100×74 px（idle/attack）, 100×75 px（run/jump）

| 子目录 | 文件 | 尺寸 | 帧数 | 用途 | 资源键 |
|--------|------|------|------|------|--------|
| `idle/` | 0.png ~ 5.png | 100×74 | 6 帧 | 待机动画 | `ASSETS.PLAYER_IDLE` |
| `run/` | 0.png ~ 5.png | 100×75 | 6 帧 | 跑步动画 | `ASSETS.PLAYER_RUN` |
| `jump/` | 0.png ~ 3.png | 100×75 | 4 帧 | 跳跃动画 | `ASSETS.PLAYER_JUMP` |
| `attack/` | 0.png ~ 5.png | 100×74 | 6 帧 | 攻击动画（第1段） | `ASSETS.PLAYER_ATTACK` |
| `attack/` | 2-0.png ~ 2-5.png | 100×74 | 6 帧 | 攻击动画（第2段连击） | `ASSETS.PLAYER_ATTACK` |
| `attack/` | 3-0.png ~ 3-3.png | 100×74 | 4 帧 | 攻击动画（第3段连击） | `ASSETS.PLAYER_ATTACK` |

**使用位置**: `src/entities/Player.ts`
**动画定义**: `src/scenes/BootScene.ts` (preload + create)

---

### 1.2 敌人角色 (enemy/)

**加载方式**: 逐帧 PNG
**帧尺寸**: 100×75 px（统一）

| 子目录 | 文件 | 尺寸 | 帧数 | 用途 | 资源键 |
|--------|------|------|------|------|--------|
| `idle/` | 0.png ~ 3.png | 100×75 | 4 帧 | 敌人待机动画 | `ASSETS.ENEMY_SKELETON_IDLE` |
| `walk/` | 0.png ~ 5.png | 100×75 | 6 帧 | 敌人行走动画 | `ASSETS.ENEMY_SKELETON_WALK` |
| `attack/` | 0.png ~ 7.png | 100×75 | 8 帧 | 敌人攻击动画 | `ASSETS.ENEMY_SKELETON_ATTACK` |
| `die/` | 0.png ~ 3.png | 100×75 | 4 帧 | 敌人死亡动画 | 未加载（使用粒子特效代替） |

**使用位置**: `src/entities/Enemy.ts`, `SkeletonEnemy.ts`, `ArcherEnemy.ts`, `ShieldEnemy.ts`, `FlyingEnemy.ts`
**注意**: 所有敌人类型共用同一套骨骼帧素材，通过 tint（着色）区分：
- 骷髅战士: 白色（默认）
- 弓箭手: 蓝色
- 盾兵: 金色（稍大）
- 飞行敌人: 紫色（稍小）

---

### 1.3 背景 (backgrounds/)

**加载方式**: 单张图片
**用途**: 视差滚动背景层

| 文件 | 尺寸 | 用途 | 资源键 | 深度层 |
|------|------|------|--------|--------|
| `sky_parallax.png` | 1024×1024 | 天空背景（最远层） | `ASSETS.SKY_BACKGROUND` | DEPTH.BACKGROUND (0) |
| `mountains.png` | 640×640 | 山脉中景 | `ASSETS.MOUNTAINS_BACKGROUND` | DEPTH.BACKGROUND (0) |
| `trees.png` | 640×640 | 树木前景 | `ASSETS.TREES_BACKGROUND` | DEPTH.BACKGROUND (0) |

**使用位置**: `src/scenes/GameScene.ts`（视差背景系统）

---

### 1.4 旧背景 (background/)

| 文件 | 尺寸 | 用途 | 状态 |
|------|------|------|------|
| `bg.png` | 480×270 | 旧版游戏背景 | 可能已弃用 |
| `startbg.png` | 629×331 | 开始菜单背景 | MenuScene 使用 |

---

### 1.5 环境装饰 (environment/)

**加载方式**: 按需动态加载，由 `DecorationManager.ts` 根据 `LevelConfig.ts` 中的装饰配置决定

#### 装饰集参考图
| 文件 | 尺寸 | 用途 |
|------|------|------|
| `Decor Set.png` | 1024×1024 | 装饰素材参考总图（含空格文件名） |
| `decor_set.png` | 1024×1024 | 装饰素材参考总图（同上，改名版） |

#### 环境瓦片 (environment/tiles/)
| 文件范围 | 尺寸 | 数量 | 用途 |
|----------|------|------|------|
| `0001.png` ~ `0144.png` | 85×85 px | 144 张 | 环境装饰瓦片（石头、植物、蘑菇、水晶等） |

**资源键模式**: `ASSETS.ENV_TILE` + 编号（如 `env-tile-0001`）
**使用位置**: `src/systems/DecorationManager.ts`
**配置文件**: `src/config/LevelConfig.ts` 中的 `DECORATIONS` 数组

**瓦片内容分类**（按编号大致划分）:
- 0001-0020: 石头、岩石
- 0021-0040: 植物、花朵
- 0041-0060: 蘑菇、真菌
- 0061-0080: 水晶、矿石
- 0081-0100: 树桩、木头
- 0101-0120: 骷髅、骨头装饰
- 0121-0144: 其他装饰物

---

### 1.6 草地瓦片 (grass/)

**帧尺寸**: 16×16 px

| 文件 | 尺寸 | 用途 | 资源键 |
|------|------|------|--------|
| `t1.png` ~ `t11.png` | 16×16 | 草地/地面瓦片 | `ASSETS.TILESET_GRASS` |

**使用位置**: 用于构建地面平台
**注意**: 虽然 16×16 是原始像素尺寸，文件实际约 25KB（含 PNG 元数据），渲染时会放大

---

### 1.7 物品 (items/)

| 文件 | 尺寸 | 用途 | 状态 |
|------|------|------|------|
| `coin_gold.png` | 1024×1024 | 金币精灵图 | 待确认使用状态 |

**注意**: 1024×1024 尺寸偏大，可能是精灵图表(spritesheet)，需要裁切使用

---

### 1.8 UI 素材 (ui/)

**说明**: 较大的精灵图表，需要通过 Phaser 的 spritesheet 或手动裁切来使用

| 文件 | 尺寸 | 用途 |
|------|------|------|
| `panel_bg.png` | 1024×1024 | UI 面板背景素材图 |
| `icons_sheet.png` | 1024×1024 | 图标合集精灵图 |
| `keys_sheet.png` | 1024×1024 | 按键提示精灵图 |

**使用位置**: `src/ui/` 目录下的 UI 组件

---

### 1.9 特效 (vfx/)

| 文件 | 尺寸 | 用途 |
|------|------|------|
| `hit_impact.png` | 1024×1024 | 命中冲击特效精灵图 |

**使用位置**: `src/utils/EffectsManager.ts`

---

## 2. 待集成的新素材

> 以下素材已下载到项目中，但尚未在代码中引用。需要在 `Constants.ts` 添加资源键、在 `BootScene.ts` 中加载后才能使用。

### 2.1 新敌人素材 (ai-enemies/)

#### 骷髅精灵图
| 文件 | 尺寸 | 类型 | 说明 |
|------|------|------|------|
| `skeleton_spritesheet.png` | 320×160 | 精灵图表 | 骷髅敌人动作合集，单帧约 64×80 |
| `skeleton_platformer.png` | 320×640 | 精灵图表 | 骷髅平台跳跃版，包含更多动作状态 |

**集成建议**: 可用来替换当前的 `enemy/` 骷髅素材，提供更丰富的动画。需要使用 `this.load.spritesheet()` 加载并指定帧宽高。

#### 弓箭手精灵图
| 文件 | 尺寸 | 类型 | 说明 |
|------|------|------|------|
| `archer_spritesheet.png` | 1024×1024 | 精灵图表 | 弓箭手敌人完整动作集 |

**集成建议**: 可为 `ArcherEnemy` 提供专属外观，替代当前的蓝色着色骷髅。需要分析帧布局后用 spritesheet 方式加载。

#### 小怪3 (Mon3)
| 文件 | 尺寸 | 类型 | 说明 |
|------|------|------|------|
| `mon3_sprite_base.png` | 512×256 | 精灵图表 | Mon3 基础精灵图，包含所有动作 |
| `mon3_idle.gif` | 64×64 | 参考动画 | 待机动画预览 |
| `mon3_attack.gif` | 64×64 | 参考动画 | 攻击动画预览 |
| `mon3_die.gif` | 64×64 | 参考动画 | 死亡动画预览 |

**集成建议**: 可作为新敌人类型。单帧大约 64×64 px。GIF 仅供参考动画效果，实际游戏中使用 `mon3_sprite_base.png` 精灵图表。

#### 蝙蝠
| 文件 | 尺寸 | 类型 | 说明 |
|------|------|------|------|
| `bat_32x32.gif` | 192×64 | 动画精灵 | 蝙蝠飞行动画，6帧×1行，单帧 32×32 |

**集成建议**: 适合作为 `FlyingEnemy` 的替代外观或新飞行敌人类型。需要从 GIF 提取为 PNG 帧或转为 spritesheet。

#### 冰元素
| 文件 | 尺寸 | 类型 | 说明 |
|------|------|------|------|
| `ice_golem.png` | 100×100 | 静态图片 | 冰元素/冰魔像单帧 |

**集成建议**: 可作为新敌人类型的静态素材，尺寸与当前敌人（100×75）接近。

#### 熔岩魔像 (Lava Golem) ⭐ 推荐优先集成
| 文件 | 尺寸 | 类型 | 说明 |
|------|------|------|------|
| `lava_golem/Frame 1.png` ~ `Frame 12.png` | 200×112 | 逐帧 PNG | 熔岩魔像动画帧（12帧） |
| `lava_golem/cursed_lava_golem_knight_anim_25_05_200x112.gif` | 1000×560 | 预览 GIF | 动画效果预览 |
| `lava_golem/cursed_lava_golem_knight_anim_25_05_200x112_1x1.gif` | 200×112 | 预览 GIF | 1:1 尺寸预览 |
| `lava_golem/cursed_lava_golem_knight_anim_25_05_200x112_specs.gif` | 1000×560 | 规格 GIF | 带规格标注的预览 |
| `lava_golem/cursed_lava_golem_knight_anim_25_05_200x112_steps.gif` | 1000×2086 | 步骤 GIF | 逐帧步骤展示 |

**集成建议**:
- **最适合直接集成**，因为已经是逐帧 PNG 格式（与项目现有模式一致）
- 帧命名需要从 `Frame 1.png` 改为 `0.png` 等数字格式
- 200×112 尺寸是当前敌人（100×75）的约 2 倍，适合作为精英怪或 Boss
- 建议放入 `assets/enemy/lava_golem/` 并创建 `LavaGolemEnemy` 类

---

### 2.2 Kenney 瓦片包 (ai-kenney/)

**来源**: Kenney.nl — Pixel Platformer (1.2)
**许可证**: CC0（完全免费，可商用）

| 文件 | 尺寸 | 瓦片规格 | 说明 |
|------|------|----------|------|
| `tilemap.png` | 379×170 | 18×18 px/格 | 主瓦片图（含间距） |
| `tilemap_packed.png` | 360×162 | 18×18 px/格 | 紧凑版（无间距） |
| `tilemap-characters.png` | 224×74 | 24×24 px/格 | 角色精灵瓦片图 |
| `tilemap-characters_packed.png` | 216×72 | 24×24 px/格 | 角色紧凑版 |
| `tilemap-backgrounds.png` | 199×74 | 24×24 px/格 | 背景元素瓦片图 |
| `tilemap-backgrounds_packed.png` | 192×72 | 24×24 px/格 | 背景紧凑版 |
| `preview.png` | 918×515 | — | 素材预览总览图 |
| `LICENSE-kenney.txt` | — | — | CC0 许可证 |

**集成建议**:
- 使用 `this.load.spritesheet()` 配合 `frameWidth`/`frameHeight` 参数加载
- `_packed` 版本更适合游戏使用（无间距，帧计算更简单）
- 可用于：地形瓦片、背景装饰、NPC 角色
- 风格为可爱像素风，与当前暗色调可能需要调色

---

### 2.3 像素 UI 包 (ai-ui/)

**来源**: Kenney Vleugels (www.kenney.nl) + Lynn Evers
**许可证**: CC0（完全免费，可商用）
**瓦片规格**: 16×16 px，间距 2px（见 `spritesheetInfo.txt`）

#### 完整精灵图表
| 文件 | 尺寸 | 说明 |
|------|------|------|
| `UIpackSheet_transparent.png` | 538×592 | UI 组件合集（透明背景） |
| `UIpackSheet_magenta.png` | 538×592 | UI 组件合集（品红背景，方便裁切） |

#### 面板素材 (panels/)

**Colored 风格** — 彩色实心面板（48×48 px）
| 文件 | 说明 | 适用场景 |
|------|------|----------|
| `blue.png` / `blue_pressed.png` | 蓝色面板/按下态 | 信息面板、选中态 |
| `green.png` / `green_pressed.png` | 绿色面板/按下态 | 确认按钮、生命值 |
| `red.png` / `red_pressed.png` | 红色面板/按下态 | 警告、取消按钮 |
| `yellow.png` / `yellow_pressed.png` | 黄色面板/按下态 | 高亮、提示 |
| `grey.png` / `grey_pressed.png` | 灰色面板/按下态 | 禁用态、背景 |

**Ancient 风格** — 古典/中世纪风格面板
| 文件 | 尺寸 | 说明 |
|------|------|------|
| `tan.png` / `tan_pressed.png` | 48×48 | 棕褐色面板 |
| `brown.png` / `brown_pressed.png` | 48×48 | 深棕色面板 |
| `grey.png` / `grey_pressed.png` | 48×48 | 灰色面板 |
| `white.png` / `white_pressed.png` | 48×48 | 白色面板 |
| `tan_inlay.png` / `grey_inlay.png` / `brown_inlay.png` / `white_inlay.png` | 44×44 | 内嵌面板（用于 9-slice 内容区） |

**Outline 风格** — 描边线框面板（48×48 px）
| 文件 | 说明 |
|------|------|
| `blue.png` / `blue_pressed.png` | 蓝色描边 |
| `green.png` / `green_pressed.png` | 绿色描边 |
| `red.png` / `red_pressed.png` | 红色描边 |
| `yellow.png` / `yellow_pressed.png` | 黄色描边 |

**通用面板**
| 文件 | 尺寸 | 说明 |
|------|------|------|
| `space.png` | 48×48 | 空白间距面板 |
| `space_inlay.png` | 44×44 | 空白内嵌面板 |
| `list.png` | 48×48 | 列表项面板 |

#### 图标素材 (icons/)
| 文件 | 尺寸 | 说明 |
|------|------|------|
| `inventory_icons.png` | 144×144 | 背包物品图标合集（9宫格，每格 48×48） |
| `pixel_armory.png` | 224×448 | 武器装备图标合集（多行多列排列） |

**集成建议**:
- **面板素材**: 使用 Phaser 的 `NineSlice` 功能将 48×48 面板拉伸为任意尺寸
- **Ancient 风格最适合本游戏**（中世纪/暗黑风格匹配）
- **图标**: 用 spritesheet 方式加载，配合 Inventory 系统使用
- **替换目标**: 可替代当前 `src/ui/` 中使用 Graphics API 绘制的 UI 元素
- **使用 inlay 面板**作为内容区背景，外层用普通面板作为边框

---

### 2.4 特效素材 (ai-vfx/)

#### 斩击特效 ⭐ 推荐优先集成
| 文件 | 尺寸 | 说明 |
|------|------|------|
| `vfx_slash1.png` | 738×638 | 斩击特效帧 1 |
| `vfx_slash2.png` | 738×638 | 斩击特效帧 2 |
| `vfx_slash3.png` | 738×638 | 斩击特效帧 3 |
| `vfx_slash4.png` | 738×638 | 斩击特效帧 4 |
| `vfx_slash5.png` | 738×638 | 斩击特效帧 5 |
| `vfx_slash6.png` | 738×638 | 斩击特效帧 6 |
| `vfx_slash7.png` | 738×638 | 斩击特效帧 7 |

**集成建议**:
- 7 帧序列，可组成完整斩击动画
- 738×638 尺寸很大，游戏中需要 `setScale(0.1~0.15)` 缩小到约 70~100 px 显示
- 可替换当前 `EffectsManager.ts` 中用 Graphics API 绘制的斩击线条
- 加载方式: 逐帧 `this.load.image()` 或合并为 spritesheet

#### 爆炸特效
| 文件 | 尺寸 | 说明 |
|------|------|------|
| `explosion.png` | 1152×96 | 爆炸精灵图表（12帧×1行，每帧 96×96） |
| `explosion_animated.png` | 256×32 | 小型爆炸动画（8帧×1行，每帧 32×32） |

**集成建议**:
- `explosion.png`: 用 `this.load.spritesheet('explosion', path, { frameWidth: 96, frameHeight: 96 })` 加载
- `explosion_animated.png`: 用 `this.load.spritesheet('explosion_small', path, { frameWidth: 32, frameHeight: 32 })` 加载
- 适用于: 敌人死亡特效、Boss 技能特效

#### 闪电特效
| 文件 | 尺寸 | 说明 |
|------|------|------|
| `lightning1.png` | 125×600 | 闪电效果 1（垂直方向） |
| `lightning2.png` | 126×600 | 闪电效果 2（垂直方向） |

**集成建议**: 适合 Boss 技能或陷阱特效，两帧可交替播放营造闪烁效果

#### 能量/魔法特效
| 文件 | 尺寸 | 说明 |
|------|------|------|
| `circle_effect.png` | 300×300 | 圆形能量效果 |
| `plasma.png` | 300×117 | 等离子/能量波效果 |
| `boss_effects.png` | 300×300 | Boss 专属特效集 |
| `effects.png` | 876×233 | 通用特效合集精灵图 |

**集成建议**:
- `circle_effect.png`: 适合治疗光环、护盾特效
- `plasma.png`: 适合远程攻击弹道
- `boss_effects.png`: Boss 战专用
- `effects.png`: 需要分析帧布局后用 spritesheet 加载

---

## 3. 集成指南

### 3.1 通用步骤

集成任何新素材到游戏中需要以下步骤：

```
1. Constants.ts  → 在 ASSETS 对象中添加资源键常量
2. Constants.ts  → 在 ANIMATION_FRAMES 中添加帧数配置
3. BootScene.ts  → 在 preload() 中添加加载代码
4. BootScene.ts  → 在 create() 中定义动画
5. Entity/Scene  → 在实体或场景代码中使用
```

### 3.2 逐帧 PNG 加载模式（与现有模式一致）

```typescript
// Constants.ts
export const ASSETS = {
  // ... 已有资源键
  LAVA_GOLEM_IDLE: 'lava-golem-idle',
};

// BootScene.ts - preload()
for (let i = 0; i < 12; i++) {
  this.load.image(
    `${ASSETS.LAVA_GOLEM_IDLE}-${i}`,
    `assets/ai-enemies/lava_golem/Frame ${i + 1}.png`
  );
}

// BootScene.ts - create()
this.anims.create({
  key: 'lava-golem-idle',
  frames: Array.from({ length: 12 }, (_, i) => ({
    key: `${ASSETS.LAVA_GOLEM_IDLE}-${i}`
  })),
  frameRate: 10,
  repeat: -1,
});
```

### 3.3 精灵图表(Spritesheet)加载模式

```typescript
// BootScene.ts - preload()
this.load.spritesheet('explosion', 'assets/ai-vfx/explosion.png', {
  frameWidth: 96,
  frameHeight: 96,
});

// BootScene.ts - create()
this.anims.create({
  key: 'explosion-anim',
  frames: this.anims.generateFrameNumbers('explosion', { start: 0, end: 11 }),
  frameRate: 15,
  repeat: 0,
});
```

### 3.4 NineSlice 面板加载模式

```typescript
// BootScene.ts - preload()
this.load.image('panel-ancient-tan', 'assets/ai-ui/panels/Ancient/tan.png');

// 使用时 (Phaser 3.60+)
const panel = this.add.nineslice(
  x, y,                    // 位置
  'panel-ancient-tan',     // 纹理键
  undefined,               // 帧
  width, height,           // 目标尺寸
  8, 8, 8, 8               // 左、右、上、下边距（不拉伸的边缘区域）
);
```

### 3.5 新敌人类型创建模式

```typescript
// 1. Constants.ts - 添加 ENEMY_CONFIG
export const ENEMY_CONFIG = {
  // ... 已有配置
  lavaGolem: {
    health: 200,
    damage: 30,
    speed: 40,
    detectionRange: 250,
    attackRange: 80,
    attackCooldown: 2000,
    mass: 3,
  },
};

// 2. 创建 src/entities/LavaGolemEnemy.ts
// 继承 Enemy 基类，实现 playAttackAnimation() 和 updateAnimation()
```

---

## 4. 许可证信息

| 素材包 | 来源 | 许可证 | 商用 | 署名要求 |
|--------|------|--------|------|----------|
| Kenney Pixel Platformer | www.kenney.nl | CC0 | ✅ 可商用 | 可选（建议署名） |
| Kenney Pixel UI Pack | www.kenney.nl | CC0 | ✅ 可商用 | 可选（建议署名） |
| Lava Golem | 自制/AI 生成 | — | ✅ | — |
| 其他 ai-enemies | 自制/AI 生成 | — | ✅ | — |
| 其他 ai-vfx | 自制/AI 生成 | — | ✅ | — |
| player/enemy/等原有素材 | 项目原创 | — | ✅ | — |

---

## 5. 集成优先级建议

| 优先级 | 素材 | 原因 |
|--------|------|------|
| ⭐⭐⭐ | `ai-vfx/vfx_slash1~7.png` | 可立即替换程序化斩击特效，视觉提升最大 |
| ⭐⭐⭐ | `ai-enemies/lava_golem/` | 已是逐帧 PNG 格式，最容易集成为新敌人/Boss |
| ⭐⭐ | `ai-ui/panels/Ancient/` | 适合替换 UI 面板背景，提升 UI 质感 |
| ⭐⭐ | `ai-vfx/explosion.png` | 爆炸精灵图表，可用于死亡特效 |
| ⭐ | `ai-enemies/mon3_*` | 需要分析精灵图帧布局 |
| ⭐ | `ai-enemies/archer_spritesheet.png` | 需要分析帧布局，但能让弓箭手有独特外观 |
| ⭐ | `ai-kenney/` | 风格偏可爱，需要评估是否与游戏整体风格匹配 |
