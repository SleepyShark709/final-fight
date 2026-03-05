# Phase 6: 永久升级系统（记忆之镜）设计文档

> 日期: 2026-03-05

## 概述

数据驱动的永久升级系统，3层结构：UpgradeTable(数据) → MetaProgress(逻辑) → UpgradeScene(UI)。玩家在据点与记忆之镜交互，消耗记忆碎片购买永久属性加成，每次运行开始时自动应用。

## 8种升级项

| ID | 名称 | 效果类型 | 每级增量 | 最大等级 | 费用公式 |
|---|---|---|---|---|---|
| `health_boost` | 生命强化 | maxHealth +10 | +10 HP | 10 | 等差: (level+1) × baseCost |
| `attack_boost` | 力量恢复 | attackDamage +2 | +2 DMG | 8 | 等差 |
| `speed_boost` | 疾风记忆 | speed +10 | +10 SPD | 5 | 等差 |
| `revive` | 死亡抗拒 | 每运行可复活1次 | +1次 | 3 | 固定: 100, 150, 250 |
| `blessing_luck` | 祝福亲和 | 稀有/史诗权重提升 | +5% rare, +2% epic | 5 | 等差 |
| `crit_boost` | 暴击直觉 | criticalChance +3% | +0.03 | 5 | 等差 |
| `gold_boost` | 贪婪本能 | 金币获取 +15% | +0.15 | 5 | 等差 |
| `dash_boost` | 冲刺强化 | dashCooldown -100ms | -100ms | 3 | 等差 |

费用总额与设计文档 `2026-03-04-roguelike-arpg-design.md` 一致。

## 数据流

```
记忆之镜交互 → launch UpgradeScene (overlay on HubScene)
  → 显示8个升级卡片(4×2网格) + 记忆碎片余额
  → 玩家选择升级项 → MetaProgress.purchaseUpgrade()
  → SaveManager.spendShards() + setUpgradeLevel()
  → ESC关闭 → resume HubScene

运行开始 → RunScene.create()
  → MetaProgress.getStatBonuses() 返回所有加成
  → 修改Player属性 (maxHealth, attackDamage, speed, criticalChance, dashCooldown)
  → 特殊升级: 死亡抗拒 → RunManager记录可复活次数
  → 特殊升级: 祝福亲和 → BlessingManager调整稀有度权重
  → 特殊升级: 贪婪本能 → 金币掉落倍率
```

## UI 布局

全屏覆盖层（类似 BlessingSelectScene），半透明黑色背景(alpha 0.7)。

```
┌──────────────────────────────────────────────┐
│          ✦ 记 忆 之 镜 ✦                      │
│       记忆碎片: ◆ 1,250                       │
│                                              │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐           │
│  │生命  │ │力量  │ │疾风  │ │死亡  │  (第1行)  │
│  │强化  │ │恢复  │ │记忆  │ │抗拒  │           │
│  │Lv3/10│ │Lv0/8 │ │Lv2/5 │ │Lv0/3 │          │
│  │ 40◆  │ │ 10◆  │ │ 30◆  │ │100◆  │          │
│  └─────┘ └─────┘ └─────┘ └─────┘           │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐           │
│  │祝福  │ │暴击  │ │贪婪  │ │冲刺  │  (第2行)  │
│  │亲和  │ │直觉  │ │本能  │ │强化  │           │
│  │Lv1/5 │ │Lv0/5 │ │Lv0/5 │ │Lv0/3 │          │
│  │ 20◆  │ │ 10◆  │ │ 10◆  │ │ 10◆  │          │
│  └─────┘ └─────┘ └─────┘ └─────┘           │
│                                              │
│  [R] 重置选中    效果预览区域     [ESC] 关闭   │
└──────────────────────────────────────────────┘
```

操作：方向键/WASD 导航，J 购买，R 重置选中项（退还碎片），ESC 关闭。

## 文件清单

| 操作 | 文件 | 说明 |
|---|---|---|
| 新建 | `src/config/UpgradeTable.ts` | 升级数据配置表 |
| 新建 | `src/core/MetaProgress.ts` | 升级逻辑层 |
| 新建 | `src/scenes/UpgradeScene.ts` | 全屏覆盖层UI |
| 修改 | `src/utils/Constants.ts` | 添加 SCENES.UPGRADE, UPGRADE 常量 |
| 修改 | `src/config/gameConfig.ts` | 注册 UpgradeScene |
| 修改 | `src/scenes/HubScene.ts` | 记忆之镜交互 → launch UpgradeScene |
| 修改 | `src/scenes/RunScene.ts` | create() 中应用升级加成 |
| 修改 | `src/entities/Player.ts` | 新增 applyUpgradeBonuses() 方法 |
