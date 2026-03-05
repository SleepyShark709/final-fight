# Final Fight V2 — 开发上下文

> 本文件供 Agent 快速理解项目当前状态，避免重复探索。
> 最后更新: 2026-03-05 (Phase 6 完成)

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

### Phase 2: 房间系统 ✅

| 任务 | Commit | 说明 |
|------|--------|------|
| 2.1 RoomConfig | `1de7ce2` | RoomConfig 接口 + 3个石窟房间模板 |
| 2.2 RoomGenerator | `71ce17e` | 动态创建 Phaser 物理对象 |
| 2.3 RunScene | `25d6841` | 替代 GameScene, 基于房间的游戏循环 |

### Phase 3: 据点世界 ✅

| 任务 | Commit | 说明 |
|------|--------|------|
| 3.1 HubScene + DeathScene | `13a3f6d` | NPC 交互区 + 走廊门入口 + 运行结算 |

### Phase 4: 祝福系统 ✅ (未提交, 在工作区)

| 任务 | 说明 |
|------|------|
| 4.3 StatusEffects | tick-based 状态效果系统: 灼烧/减速/连锁闪电, 集成到Enemy基类 |
| 4.1 BlessingConfig + BlessingManager | 12个祝福数据表(火/雷/冰各4), 装饰器模式包装伤害计算 |
| 4.2 BlessingSelectScene + BlessingCard | 3选1卡牌UI, 房间通关后触发, 支持鼠标和键盘1/2/3选择 |

**已通过 TypeScript 编译检查 (`npx tsc --noEmit` 零错误) 和代码审查（4个问题已修复）。**

#### Phase 4 技术细节

**新增文件:**
- `src/combat/StatusEffects.ts` — `StatusEffectProcessor` 静态类: `process()` 每帧处理, `create()` 工厂方法, `addEffect()` 同源同类型刷新而非叠加
- `src/config/BlessingConfig.ts` — 类型定义 (`GodType`, `BlessingRarity`, `BlessingSlot`, `BlessingEffectType`, `BlessingEffect`, `BlessingData`) + `BLESSING_TABLE` 数据
- `src/combat/BlessingManager.ts` — 核心管理器: `applyAttackModifiers()` 返回修饰后伤害+状态效果, `rollBlessings()` 按稀有度权重随机抽取, `getCritBonus()`/`getDamageReduction()`/`getLifestealPercent()`/`getDashDamage()`/`getSpeedBonus()` 查询方法
- `src/ui/BlessingCard.ts` — 220×300 卡牌容器: 神明图标(彩色圆)+名称+稀有度+槽位+描述+键位提示, `setSelected()` 高亮动画
- `src/scenes/BlessingSelectScene.ts` — overlay 场景: 半透明遮罩 + 3张卡牌水平排列 + Back.easeOut 入场动画 + 选中放大/未选淡出动画

**修改文件:**
- `Enemy.ts` — 新增 `statusEffects: StatusEffect[]`, `originalSpeed`, `isSlowed`; 新增 `processStatusEffects()` (在update末尾调用) 和 `addStatusEffect()`; burn/chain回调有isDead守卫
- `Player.ts` — 新增 `heal(amount)` 方法 (clamp到maxHealth, 发送player-health-changed事件)
- `RunScene.ts` — 新增 `blessingManager` 属性; `onRoomCleared()` 改为先 `showBlessingSelect()` 再 `createExit()`; 祝福选择时禁用RunScene键盘防止与武器切换冲突; 所有3条伤害路径 (overlap/距离检测/投射物) 均注入祝福修饰链 (暴击加成→伤害修饰→状态效果→生命偷取); 敌人攻击玩家的3条路径均注入减伤
- `Constants.ts` — 新增 `SCENES.BLESSING`, `DEPTH.BLESSING_OVERLAY: 150`, `BLESSING` 常量对象 (CHOICES_PER_ROOM/ROOM_INTERVAL/RARITY_WEIGHTS/RARITY_COLORS/GOD_COLORS)
- `gameConfig.ts` — 注册 BlessingSelectScene

**祝福伤害集成流程:**
```
玩家攻击命中 → getCurrentDamage() → blessingManager.applyAttackModifiers(damage, time)
  → 返回 { damage: 修饰后伤害, effects: StatusEffect[] }
  → getCritBonus() 叠加暴击率/倍率
  → 对敌人 takeDamage + addStatusEffect
  → getLifestealPercent() → player.heal()
敌人攻击玩家 → getDamageReduction() → 减伤后 takeDamage
```

**代码审查修复的4个问题:**
1. BlessingSelectScene键盘1/2/3与RunScene武器切换冲突 → 祝福选择时禁用RunScene键盘输入
2. Enemy.processStatusEffects burn/chain回调缺少isDead守卫 → 已添加
3. checkProjectileHits 敌人弓箭投射物未应用祝福减伤 → 已注入getDamageReduction
4. checkPlayerProjectileHits 玩家弓箭投射物未应用祝福修饰 → 已注入完整祝福链

**已知设计取舍 (非bug):**
- `getCritBonus()` 中暴击率vs暴击倍率按 `blessing.id` 硬编码分发 (`thunder_skill`=暴击率, `thunder_passive`=暴击倍率)。若未来新增更多crit_bonus祝福需拆分BlessingEffectType
- 连锁闪电(chain)目前仅对自身造成伤害，未实现向周围敌人扩散。可在后续Phase中扩展

### Phase 5: 敌人 & Boss ✅ (未提交, 在工作区)

| 任务 | 说明 |
|------|------|
| 5.1 EnemyTable + EnemyFactory | 敌人数值配置表(8种) + 工厂模式创建敌人 |
| 5.2 BombBugEnemy + EliteSkeletonEnemy | 爆炸虫(自爆AoE) + 精英骷髅(3连击+闪避) |
| 5.3 StoneGolemBoss | 3阶段Boss: 近战/地震/投石/冲锋, 500HP |

### Phase 6: 永久升级 ✅ (未提交, 在工作区)

| 任务 | 说明 |
|------|------|
| 6.1 UpgradeTable + MetaProgress | 8种升级数据配置 + 购买/重置/查询逻辑层 |
| 6.2 UpgradeScene | 全屏覆盖层UI, 4×2卡片网格, WASD/J/R/ESC操作 |

**已通过 TypeScript 编译检查 (`npx tsc --noEmit` 零错误) 和代码审查（2个问题已修复）。**

#### Phase 6 技术细节

**新增文件:**
- `src/config/UpgradeTable.ts` — 8种升级数据表: UpgradeData接口 + UPGRADE_TABLE + linearCosts费用生成
- `src/core/MetaProgress.ts` — 静态类: purchaseUpgrade()/resetUpgrade()/getStatBonuses()/getAllUpgrades()
- `src/scenes/UpgradeScene.ts` — 覆盖层: 半透明遮罩 + 4×2卡片网格 + 进度条 + 键盘导航

**修改文件:**
- `Constants.ts` — 新增 `SCENES.UPGRADE`, `UPGRADE` 常量(卡片尺寸/网格布局)
- `gameConfig.ts` — 注册 UpgradeScene
- `HubScene.ts` — 记忆之镜交互改为 `openUpgradePanel()` 启动覆盖层, 键盘禁用/恢复
- `RunScene.ts` — create()中调用 `MetaProgress.getStatBonuses()` 应用加成到Player; 死亡抗拒(复活)消耗逻辑; goldMultiplier/blessingLuckBonus 存储
- `Player.ts` — 新增 `moveSpeed`/`dashCooldownTime` 实例属性; `applyUpgradeBonuses()` 方法; handleMovement/handleDash 使用实例属性
- `BlessingManager.ts` — `rollBlessings()` 新增 `luckBonus` 参数, 调整稀有度权重
- `BlessingSelectScene.ts` — 接收并传递 `luckBonus` 到 rollBlessings

**升级系统数据流:**
```
据点记忆之镜 → W交互 → UpgradeScene(overlay)
  → WASD选择 + J购买 → MetaProgress.purchaseUpgrade()
  → SaveManager.spendShards() + setUpgradeLevel()
  → ESC关闭 → HubScene

运行开始 → RunScene.create()
  → MetaProgress.getStatBonuses() → Player.applyUpgradeBonuses()
  → RunManager.startRun(revives) / blessingLuckBonus / goldMultiplier
```

## 新增文件结构

```
src/
├── combat/
│   ├── WeaponBase.ts          # 武器抽象基类（策略模式）
│   ├── WeaponFactory.ts       # 武器工厂
│   ├── BlessingManager.ts     # 祝福管理器（装饰器模式）
│   ├── StatusEffects.ts       # 状态效果系统 (burn/slow/chain)
│   └── weapons/
│       ├── SwordWeapon.ts     # 裂空剑 (默认)
│       ├── FistsWeapon.ts     # 雷霆拳
│       └── BowWeapon.ts       # 追影弓
├── config/
│   ├── WeaponConfig.ts        # 武器数值配置表 (WEAPON_TABLE)
│   ├── BlessingConfig.ts      # 祝福数据表 (12个祝福, 3神明)
│   ├── EnemyTable.ts          # 敌人数值配置表
│   └── UpgradeTable.ts        # 永久升级配置表 (8种升级)
├── core/
│   ├── SaveManager.ts         # 永久存档 (localStorage)
│   ├── RunManager.ts          # 单次运行状态
│   ├── RoomGenerator.ts       # 房间模板加载/实例化
│   └── MetaProgress.ts        # 永久进度管理器
├── entities/
│   ├── EnemyFactory.ts        # 敌人工厂
│   ├── enemies/
│   │   ├── BombBugEnemy.ts    # 爆炸虫
│   │   └── EliteSkeletonEnemy.ts # 精英骷髅
│   └── bosses/
│       └── StoneGolemBoss.ts  # 岩石巨像Boss
├── scenes/
│   ├── BlessingSelectScene.ts # 祝福选择覆盖层场景
│   └── UpgradeScene.ts        # 升级UI覆盖层场景
├── ui/
│   └── BlessingCard.ts        # 祝福卡牌UI组件
```

## 关键设计模式

1. **策略模式 (WeaponBase)**: Player 持有 `weapon: WeaponBase`, 攻击/技能委托给具体武器实现
2. **工厂模式 (WeaponFactory)**: `WeaponFactory.create('sword', scene, owner)` 按 ID 创建武器
3. **装饰器模式 (BlessingManager)**: 包装伤害计算函数，注入暴击加成/伤害修饰/状态效果/生命偷取/减伤
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

## 祝福数据概览

| 神明 | 槽位 | ID | 名称 | 稀有度 | 效果 |
|------|------|----|------|--------|------|
| 火 | 攻击 | fire_attack | 烈焰之击 | 普通 | 灼烧 5dps/3s |
| 火 | 技能 | fire_skill | 焚天怒焰 | 稀有 | 技能伤害+40% |
| 火 | 冲刺 | fire_dash | 炎爆冲刺 | 稀有 | 冲刺路径15点火伤 |
| 火 | 被动 | fire_passive | 灼热之躯 | 史诗 | 攻击力+15% |
| 雷 | 攻击 | thunder_attack | 雷霆一击 | 普通 | 连锁闪电8伤害 |
| 雷 | 技能 | thunder_skill | 闪电风暴 | 稀有 | 暴击率+15% |
| 雷 | 冲刺 | thunder_dash | 雷光疾步 | 普通 | 速度+30% |
| 雷 | 被动 | thunder_passive | 感电体质 | 史诗 | 暴击倍率+0.5x |
| 冰 | 攻击 | ice_attack | 霜冻之触 | 普通 | 减速40%/2s |
| 冰 | 技能 | ice_skill | 冰晶护盾 | 稀有 | 减伤20% |
| 冰 | 冲刺 | ice_dash | 寒冰之路 | 稀有 | 减速50%/3s |
| 冰 | 被动 | ice_passive | 生命汲取 | 史诗 | 吸血10% |

稀有度权重: 普通60% / 稀有30% / 史诗10%

---

## 未完成的 TODO

### 紧急: 提交工作区改动

- [ ] `yarn dev` 验证游戏能正常运行
- [ ] Commit Phase 4-6 所有文件

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
