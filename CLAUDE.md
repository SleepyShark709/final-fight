# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 开发命令

- `npm run dev` / `npm start` - 启动开发服务器，支持热重载，端口 3000
- `npm run build` - TypeScript 编译后使用 Vite 构建到 dist/目录
- `npm run preview` - 预览构建后的应用
- `npm run editor` - 启动地图编辑器 editor/editor.html
- `npm run lint` - ESLint 代码分析
- `npm run lint:fix` - 自动修复 lint 问题

## 游戏架构

这是一个使用 TypeScript 和自定义游戏引擎构建的 2D 横版格斗游戏。

### 核心游戏循环

游戏遵循标准的游戏循环模式：

1. **资源加载** (`src/main.ts`) - 从 utils/\*-util.ts 文件预加载所有图片
2. **游戏引擎** (`src/game/game.ts`) - 管理主循环、输入处理和场景管理
3. **场景管理** (`src/game/game_scene.ts`) - 所有游戏场景的基类
4. **渲染管线** - Canvas 2D 像素完美渲染 (imageSmoothingEnabled: false)

### 核心系统

**瓦片地图系统** (`src/game/game_map.ts`):

- 32x32 像素瓦片网格 (16 行，动态列数)
- 摄像机跟随系统，200px 水平偏移
- 碰撞检测分为垂直和水平阶段处理
- 视口剔除优化性能

**物理系统**:

- 基于重力的物理引擎，可配置加速度 (constants.ts)
- 分离碰撞检测防止穿墙
- 基于按键时长的变高度跳跃

**动画系统**:

- 基于帧的精灵动画，由 Character 基类管理
- 状态驱动的动画切换 (idle, run, attack, jump, die)
- 所有动画帧数在 constants.ts 中定义

**资源管理**:

- 按类型组织图片: player/, enemy/, grass/, background/
- Utils 文件 (\*-util.ts) 处理资源导入和命名
- Main.ts 将所有图片组装到单一注册表

### 场景结构

**SceneTitle** (`src/scene/title/`): 带背景和控制说明的开始界面
**Scene** (`src/scene/main/`): 主游戏玩法，包含:

- 视差滚动背景系统 (0.5x 倍数)
- GameTileMap 用于碰撞和渲染
- Player 和 Enemy 实体
- DebugModule 用于开发可视化

### 实体系统

**Character** (`src/character/character.ts`): 提供移动、动画和基础碰撞的基类
**Player** (`src/character/player.ts`): 物理驱动的角色，具有连击攻击和血量系统
**Enemy** (`src/character/enemy.ts`): AI 驱动的角色，基于接近度的追踪和攻击行为

### 输入系统

- 在场景设置中使用 `game.registerAction(key, callback)`
- 回调函数接收 "up"/"down" 按键状态
- 调试控制键 (P, Z, X, R) 可用于开发

### 地图编辑器

- 通过 `npm run editor` 访问
- 点击绘制瓦片，双击删除
- JSON 导出用于与 GameTileMap 集成
- 32x16 瓦片网格匹配游戏尺寸

## 开发注意事项

**像素完美渲染**: Canvas 和 CSS 配置禁用图像平滑，防止瓦片间隙

**碰撞系统**: 使用基于瓦片的检测，包含 `onTheGround()` 和 `isTileWall()` 方法。垂直和水平碰撞分别处理以防止卡角。

**摄像机系统**: 玩家位于屏幕宽度 1/3 处，offsetX 约束在 [0, -(mapWidth-canvasWidth)]

**常量配置**: 所有游戏平衡值集中在 `src/constants.ts` 便于调优

**调试可视化**: 按 P 切换碰撞盒、瓦片类型和系统信息覆盖层

## 游戏平衡

- 默认 30 FPS (可通过 UI 滑块调整)
- 玩家: 3 种攻击类型，100 血量，30-50 随机伤害
- 敌人: 100 血量，基于接近度的 AI 带攻击冷却
- 物理: 常量中可配置重力和跳跃高度

## 详细控制说明

### 游戏控制
- **A** - 向左移动
- **D** - 向右移动
- **J** - 攻击 (支持3种攻击类型)
- **K** - 跳跃 (按键时长影响跳跃高度)

### 调试控制
- **P** - 切换调试信息显示
- **Z** - 手动向左滚动地图
- **X** - 手动向右滚动地图
- **R** - 重置玩家位置和地图偏移

### 场景切换
- **R** - 从标题场景进入游戏

## 技术实现细节

### 渲染系统
- **像素完美渲染**: Canvas关闭图像平滑 + CSS image-rendering:pixelated，避免瓦片间细线
- **Canvas上下文**: 禁用imageSmoothingEnabled及各浏览器前缀版本
- **坐标系统**: 世界坐标系 -> 屏幕坐标系映射

### 摄像机系统
- **跟随逻辑**: 玩家位于画布中心偏左位置 (followOffsetX: 200)
- **偏移边界**: offsetX限制在 [0, -(mapWidth-canvasWidth)]
- **边界检测**: reachedLeftBoundary/reachedRightBoundary

### 碰撞检测
- **垂直检测**: 检测脚下和左右脚位置的地面瓦片
- **水平检测**: 多高度采样点检测墙体 (isTileWall)
- **分离处理**: 垂直和水平碰撞分离处理，避免卡墙

### 物理系统
- **重力**: 每帧应用重力加速度
- **摩擦**: 地面摩擦力减速
- **跳跃机制**: 按键时长影响跳跃高度

### UI定位
- **世界UI**: HpBar/AttackValue通过worldToScreen适配地图偏移
- **屏幕UI**: 调试信息等固定在屏幕坐标

## 扩展开发指南

### 添加新场景
1. 在 `src/scene/<name>/` 创建 scene.ts，继承 GameScene
2. 实现 update() 和 draw() 方法
3. 通过 game.replaceScene() 切换场景
4. 使用 registerAction 注册按键切换

### 添加新角色
1. 继承 Character 类获得基础功能
2. 实现不同状态的帧动画 (idle/run/attack等)
3. 调用 setMap() 启用碰撞和滚动
4. 在 utils/<name>-util.ts 中管理图片资源

### 添加新地图瓦片
1. 将 32x32 像素图片放入 src/assets/grass/
2. 在 map-util.ts 中 import 并添加到 images 对象
3. 更新 GameTileMap 的 tiles 数组或使用编辑器
4. 配置 isTileWall 方法识别新瓦片类型

### 添加新输入控制
1. 在场景中使用 game.registerAction(key, callback)
2. callback 接收 'up' 或 'down' 状态
3. 在角色类中实现对应的动作方法

### 修改游戏机制
1. 修改 src/constants.ts 中的游戏参数
2. 调整重力、跳跃、摩擦等物理常量
3. 修改攻击力、血量、冷却时间等平衡参数

## 项目结构说明

### 核心文件
- `src/main.ts` - 游戏入口点，资源组装
- `src/game/game.ts` - 游戏引擎核心 (主循环、输入注册、资源预加载、场景切换)
- `src/game/game_scene.ts` - 场景管理基类 (元素管理、update/draw分发)
- `src/game/game_map.ts` - 瓦片地图和摄像机系统
- `src/game/debug_module.ts` - 调试可视化系统

### 场景系统
- `src/scene/title/scene-title.ts` - 标题场景，包含背景和标签
- `src/scene/main/scene.ts` - 主游戏场景，包含地图、玩家、敌人、调试模块

### 实体系统
- `src/character/character.ts` - 角色基类 (基础移动、帧动画管理、屏幕坐标绘制)
- `src/character/player.ts` - 玩家角色 (物理系统、攻击系统、血量系统)
- `src/character/enemy.ts` - 敌人角色 (AI系统、动画帧、血量系统)

### 工具和资源
- `src/utils/player-util.ts` - 玩家图片资源管理
- `src/utils/enemy-utils.ts` - 敌人图片资源管理
- `src/utils/map-util.ts` - 地图图片资源管理
- `src/constants.ts` - 游戏常量配置

## 开发工作流

### 调试工具
- **DebugModule**: 提供可视化调试功能
- **切换键**: P键切换调试信息显示
- **可视化内容**: 玩家/敌人碰撞盒、地面/墙体可视化、摄像机状态、地形图例

### 热重载
- Vite 提供快速热重载开发体验
- 支持直接 import 图片资源，Vite 自动处理

### 地图编辑器工作流
1. 从瓦片面板选择要绘制的瓦片类型
2. 在画布上点击绘制或双击删除
3. 使用JSON导出按钮获取地图数据
4. 将JSON数据复制到GameTileMap的tiles数组中

### 性能优化
- **地图渲染**: 只渲染屏幕可见区域的瓦片
- **资源加载**: 预加载所有图片资源后启动游戏
- **帧管理**: 可调节帧率，默认30FPS
- **碰撞优化**: 使用瓦片网格加速碰撞检测

## Response Language

**除非有特殊说明，请用中文回答。** (Unless otherwise specified, please respond in Chinese.)
