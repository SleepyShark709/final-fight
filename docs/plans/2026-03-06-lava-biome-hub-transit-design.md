# 熔岩区域 + 据点中转机制设计

> 日期: 2026-03-06 | 分支: feat/v2

## 目标

1. 实现 Boss 击败后回到据点（Hub）休整的机制，运行状态保留
2. 新增熔岩区域：8个房间模板、5种敌人、1个Boss

---

## Part 1: 据点中转机制

### 流程

```
石窟(6房间) → 石窟Boss击败 → 回到Hub（运行暂停，玩家满血）
  → Hub中可：升级/换武器/与NPC交互
  → 进入回廊之门 → 熔岩(6房间) → 熔岩Boss击败 → WinScene通关
```

### RunManager 改动

- 新增 `pauseRun()`: 保存当前运行状态到 SaveManager，设 `isPaused = true`
- 新增 `resumeRun()`: 从 SaveManager 恢复运行状态，设 `isPaused = false`
- 新增 `hasPausedRun()` 静态方法: 检查 SaveManager 中是否有暂停的运行
- `startRun()` 不变，仍然创建全新运行

### SaveManager 改动

- 新增 `savePausedRun(state: RunState)` / `loadPausedRun()` / `clearPausedRun()`
- 存储内容: currentBiome, currentRoom, activeBlessings, 统计数据, 金币碎片, deathDefiances

### RunScene 改动

- `handleBossDefeated`: 调用 `advanceBiome()` 后，若未通关则 `pauseRun()` 并跳转 HubScene
- `create()`: 新增逻辑 — 检查是否有暂停运行，有则恢复（跳过 startRun，恢复祝福/统计）
- 区域识别: 根据 `currentBiome` 选择石窟或熔岩房间池

### HubScene 改动

- `create()`: 检测是否有暂停运行，若有则：
  - 回廊之门标签改为"继续探索（熔岩区）"
  - 玩家满血恢复（通过 SaveManager 存储）
- 进入回廊之门时：携带 `resumeRun: true` 数据传递给 RunScene

---

## Part 2: 熔岩区域

### 房间模板

| ID | 类型 | 尺寸 | 特点 |
|----|------|------|------|
| lava-combat-flat-01 | combat | 960x540 | 宽平地形，两侧熔岩坑 |
| lava-combat-flat-02 | combat | 960x540 | 中等宽度，中间熔岩缝隙 |
| lava-combat-platforms-01 | combat | 1200x540 | 多层平台，下层熔岩 |
| lava-combat-platforms-02 | combat | 1200x540 | 阶梯式上升平台 |
| lava-combat-corridor-01 | combat | 1440x540 | 狭长走廊，熔岩陷阱 |
| lava-combat-corridor-02 | combat | 1440x540 | 窄通道+高台弓箭手位 |
| lava-combat-elite-01 | elite | 1200x540 | 大型竞技场 |
| lava-boss-fire-dragon | boss | 1600x540 | 超宽Boss场地，多平台 |

### 敌人

| 类型ID | 名称 | 基类 | 特点 |
|--------|------|------|------|
| lava_golem | 熔岩魔像 | 已有 LavaGolemEnemy | 高血量近战 |
| fire_bat | 火蝠 | FlyingEnemy 变体 | 飞行+火焰弹投射 |
| fire_mage | 火法师 | ArcherEnemy 变体 | 远程火球+地面火圈 |
| lava_slime | 熔岩史莱姆 | Enemy | 死亡分裂为2个小史莱姆 |
| magma_knight | 岩浆骑士 | ShieldEnemy 变体 | 精英级，格挡+冲锋+三段斩 |

### Boss: 烈焰龙 (FireDragonBoss)

- 血量: 800HP
- 3阶段:
  - Phase 1 (100%-60%): 地面移动，火焰吐息(扇形AoE)，尾扫(近身AoE)
  - Phase 2 (60%-30%): 飞到空中，俯冲攻击，召唤 fire_bat (最多2只)
  - Phase 3 (30%-0%): 狂暴交替地面/空中，火雨覆盖全场(需躲避)

### 视觉区分

- 背景色: `#3a1a1a` (暗红) 替代石窟的 `#2a1a3a` (暗紫)
- 地面瓦片: 同一套 tileset，tint 为 `0xff6644` (橙红)
- 熔岩危险区域: 发光脉冲动画
- 视差背景: 复用同一套但 tint 为红色调

---

## 关键设计决策

1. **运行状态持久化**: 通过 SaveManager 存储暂停的运行，防止刷新丢失
2. **Hub 复用**: 不新建场景，通过检测暂停运行状态动态调整 Hub 行为
3. **敌人设计**: 优先复用已有基类（变体 + tint），减少全新实体的工作量
4. **房间模板**: JSON 配置驱动，与石窟区结构一致
