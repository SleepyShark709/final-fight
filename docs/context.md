# Final Fight V2 — 开发上下文

> 本文件供 Agent 快速理解项目当前状态，避免重复探索。
> 最后更新: 2026-03-04

## 项目目标

将 Final Fight V2 从线性横版动作游戏改造为 **Roguelike ARPG**（类 Hades 风格）。

核心循环: Hub（据点）→ 房间战斗 → Boss → 死亡/通关 → 永久升级 → 再次挑战

## 关键文档

| 文档 | 路径 | 说明 |
|------|------|------|
| 游戏设计文档 | `docs/plans/2026-03-04-roguelike-arpg-design.md` | 完整的世界观、战斗、祝福、敌人、Boss、UI/UX 设计 |
| 实施计划 | `docs/plans/2026-03-04-roguelike-implementation-plan.md` | 11个阶段、30+任务的详细实施计划（含代码片段） |
| 项目规范 | `CLAUDE.md` | 项目架构、代码约定、关键文件说明 |

## 技术栈

- **Phaser 3.86** + **TypeScript 5.6 strict** + **Vite 6** + **Electron 40**
- 包管理: `yarn` (v1.22)
- 存档: `localStorage` (SaveManager)
- 路径别名: `@/` → `src/`
- 代码注释和变量名使用 **中文**

## 当前分支

`feat/v2` (基于 `dev`)

## 已完成的工作

### Phase 0: 基础设施 ✅

| 任务 | Commit | 说明 |
|------|--------|------|
| 0.1 键位修复 | `f01af15` | SKILL→DASH(L), 新增 WEAPON_SKILL(U), MAP(TAB), INTERACT(W) |
| 0.2 SaveManager | `8179b89` | localStorage 永久存档, 记忆碎片/金币/升级/统计 |
| 0.3 RunManager | `2b5bfac` | 单次运行状态机: 区域/房间/祝福/统计 |

### Phase 1: 武器系统 ✅

| 任务 | Commit | 说明 |
|------|--------|------|
| 1.1 WeaponBase + WeaponConfig | `2040092` | 策略模式基类 + 武器数值配置表 |
| 1.2 SwordWeapon | `0e0332f` | 裂空剑: 3段连击 [1.0x, 1.2x, 1.5x], 旋风斩技能 |
| 1.3 Player 重构 | `b07d9a8` | Player 攻击逻辑委托给 WeaponBase |
| 1.4 FistsWeapon | `01aef5e` | 雷霆拳: 5段快速连击, 闪电连击技能 |
| 1.5 BowWeapon | `5a2fe43` | 追影弓: 远程投射物, 箭雨技能(5箭扇形) |
| 1.6 WeaponFactory | `69143d5` | 工厂模式创建武器 + equipWeapon 切换 |

### Bug 修复 (未提交, 在工作区)

以下修复已应用到代码但尚未 commit:

| ID | 严重度 | 修复内容 | 文件 |
|----|--------|----------|------|
| C1-A | Critical | WeaponBase 添加 `update()` 空方法 | `WeaponBase.ts:61` |
| C1-B | Critical | Player.update() 调用 `weapon.update()` | `Player.ts:209` |
| C1-C | Critical | GameScene 添加 `checkPlayerProjectileHits()` | `GameScene.ts:782-832` |
| C2 | Critical | 攻击距离使用 `weapon.getAttackRange()` 替代硬编码 | `GameScene.ts:623` |
| I1 | Important | 武器技能添加 `isSkillReady()` 前置检查 | `Player.ts:311` |
| I2 | Important | Player 使用 `WeaponFactory.create()` 替代直接实例化 | `Player.ts:112` |
| I4 | Important | SaveManager 所有公共方法添加 `ensureLoaded()` | `SaveManager.ts:77-83` |
| I5 | Important | `recordRun()` 添加 `survived` 参数，条件递增 deaths | `SaveManager.ts:138-141` |

**待办: 需要 commit 这些修复并验证 TypeScript 编译通过。**

## 新增文件结构

```
src/
├── combat/
│   ├── WeaponBase.ts          # 武器抽象基类（策略模式）
│   ├── WeaponFactory.ts       # 武器工厂
│   └── weapons/
│       ├── SwordWeapon.ts     # 裂空剑 (默认)
│       ├── FistsWeapon.ts     # 雷霆拳
│       └── BowWeapon.ts       # 追影弓
├── config/
│   └── WeaponConfig.ts        # 武器数值配置表 (WEAPON_TABLE)
├── core/
│   ├── SaveManager.ts         # 永久存档 (localStorage)
│   └── RunManager.ts          # 单次运行状态
```

## 关键设计模式

1. **策略模式 (WeaponBase)**: Player 持有 `weapon: WeaponBase`, 攻击/技能委托给具体武器实现
2. **工厂模式 (WeaponFactory)**: `WeaponFactory.create('sword', scene, owner)` 按 ID 创建武器
3. **装饰器模式 (计划中)**: BlessingManager 包装伤害计算函数，添加状态效果
4. **状态机**: Player/Enemy 使用 enum-based 状态机管理行为

## 键位布局

```
左手: A/D 移动, W 交互
右手: J 攻击, K 跳跃, L 冲刺, U 武器技能
其他: I 背包, C 数值面板, TAB 地图, ESC 暂停, P 调试
```

## 武器数据概览

| 武器 | 类型 | 基础伤害 | 连击段数 | 冷却 | 范围 | 技能 |
|------|------|----------|----------|------|------|------|
| 裂空剑 sword | 近战 | 20 | 3段 | 400ms | 50px | 旋风斩 (AOE) |
| 雷霆拳 fists | 近战 | 8 | 5段 | 200ms | 35px | 闪电连击 (3连) |
| 追影弓 bow | 远程 | 30 | 1段 | 800ms | 280px | 箭雨 (5箭) |

---

## 未完成的 TODO

### 紧急: 提交工作区修复

- [ ] `yarn dev` 验证游戏能正常运行
- [ ] TypeScript 编译检查 (`npx tsc --noEmit`)
- [ ] Commit 所有 bug 修复 (C1/C2/I1/I2/I4/I5)

### Phase 2: 房间系统 (v0.3)

- [ ] **Task 2.1**: 创建 `RoomConfig` 接口 + 3个石窟房间模板 JSON
- [ ] **Task 2.2**: 创建 `RoomGenerator` — 动态创建 Phaser 物理对象
- [ ] **Task 2.3**: 创建 `RunScene` — 替代 GameScene, 基于房间的游戏循环

### Phase 3: 据点世界 (v0.3)

- [ ] **Task 3.1**: 创建 `HubScene` — NPC 交互区 + 走廊门入口
- [ ] **Task 3.2**: 创建 `DeathScene` — 运行结算 + 统计展示

### Phase 4: 祝福系统 (v0.4)

- [ ] **Task 4.1**: 创建 `BlessingTable` + `BlessingManager` (装饰器模式)
- [ ] **Task 4.2**: 创建 `BlessingSelectScene` — 3选1卡牌 UI
- [ ] **Task 4.3**: 创建 `StatusEffects` — 灼烧/减速/连锁闪电

### Phase 5: 敌人 & Boss (v0.5)

- [ ] **Task 5.1**: 创建 `EnemyTable` + `EnemyFactory`
- [ ] **Task 5.2**: 新石窟敌人: BombBugEnemy, EliteSkeletonEnemy
- [ ] **Task 5.3**: Boss 1: StoneGolemBoss (3阶段)

### Phase 6: 永久升级 (v0.6)

- [ ] **Task 6.1**: `MetaProgress` + `UpgradeTable` 系统
- [ ] **Task 6.2**: 记忆之镜升级 UI (`UpgradePanel`)

### Phase 7: 熔岩区域 (v0.7)

- [ ] **Task 7.1**: 熔岩房间模板 (15-20个)
- [ ] **Task 7.2**: 5种熔岩敌人 (LavaSlime, FireMage, LavaGolem, FireLizard, RockGolem)
- [ ] **Task 7.3**: Boss 2: Fire Dragon (多阶段空中 Boss)

### Phase 8: 音频 (v0.8)

- [ ] **Task 8.1**: `AudioManager` (BGM 渐变, SFX 管理)
- [ ] **Task 8.2**: jsfxr 生成 ~30 像素风音效
- [ ] **Task 8.3**: 每区域 BGM (据点/石窟/熔岩/Boss)

### Phase 9: 视觉打磨 (v0.8)

- [ ] **Task 9.1**: 着陆灰尘粒子
- [ ] **Task 9.2**: 冲刺残影效果
- [ ] **Task 9.3**: 敌人受击闪白
- [ ] **Task 9.4**: 最后一击慢动作

### Phase 10: UI 打磨 & 平衡 (v0.9)

- [ ] **Task 10.1**: HUD 重新设计 (极简风)
- [ ] **Task 10.2**: 小地图 (TAB 切换)
- [ ] **Task 10.3**: 数值平衡调整

### Phase 11: 最终 (v1.0)

- [ ] **Task 11.1**: 热度系统 (通关后难度修改器)
- [ ] **Task 11.2**: Bug 修复通过
- [ ] **Task 11.3**: Electron 打包发布
