# Phase 6: 永久升级系统 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 实现记忆之镜永久升级系统——玩家用记忆碎片购买8种永久属性加成，每次运行开始时自动应用。

**Architecture:** 数据驱动的3层结构：UpgradeTable(配置) → MetaProgress(逻辑，读写SaveManager) → UpgradeScene(UI覆盖层)。升级在RunScene.create()中应用到Player。特殊升级(死亡抗拒/祝福亲和/贪婪本能)分别注入RunManager/BlessingManager/RunScene。

**Tech Stack:** Phaser 3.86, TypeScript 5.6 strict, yarn

---

## Task 1: 创建 UpgradeTable 配置表

**Files:**
- Create: `src/config/UpgradeTable.ts`

**Step 1: 创建升级数据配置表**

```typescript
// src/config/UpgradeTable.ts

/**
 * 永久升级配置表
 * 定义所有可购买的永久升级项
 */

/** 升级效果类型 */
export type UpgradeEffectType =
    | 'max_health'       // 最大生命值
    | 'attack_damage'    // 基础攻击力
    | 'speed'            // 移动速度
    | 'revive'           // 复活次数
    | 'blessing_luck'    // 祝福品质提升
    | 'crit_chance'      // 暴击率
    | 'gold_bonus'       // 金币获取加成
    | 'dash_cooldown';   // 冲刺冷却减少

/** 单个升级项定义 */
export interface UpgradeData {
    /** 唯一标识 (与 SaveManager.upgrades key 对应) */
    id: string;
    /** 显示名称 */
    name: string;
    /** 描述模板 (用 {value} 占位) */
    description: string;
    /** 效果类型 */
    effectType: UpgradeEffectType;
    /** 每级增量 */
    valuePerLevel: number;
    /** 最大等级 */
    maxLevel: number;
    /** 每级费用数组 (长度 = maxLevel) */
    costs: number[];
    /** 图标颜色 (用于UI) */
    color: number;
}

/** 生成等差费用数组: [baseCost, baseCost*2, baseCost*3, ...] */
function linearCosts(baseCost: number, maxLevel: number): number[] {
    return Array.from({ length: maxLevel }, (_, i) => baseCost * (i + 1));
}

/** 所有升级项列表 */
export const UPGRADE_TABLE: UpgradeData[] = [
    {
        id: 'health_boost',
        name: '生命强化',
        description: '最大生命值 +{value}',
        effectType: 'max_health',
        valuePerLevel: 10,
        maxLevel: 10,
        costs: linearCosts(10, 10), // 总 550
        color: 0xff4444,
    },
    {
        id: 'attack_boost',
        name: '力量恢复',
        description: '基础攻击力 +{value}',
        effectType: 'attack_damage',
        valuePerLevel: 2,
        maxLevel: 8,
        costs: linearCosts(10, 8), // 总 360
        color: 0xff8844,
    },
    {
        id: 'speed_boost',
        name: '疾风记忆',
        description: '移动速度 +{value}',
        effectType: 'speed',
        valuePerLevel: 10,
        maxLevel: 5,
        costs: linearCosts(10, 5), // 总 150
        color: 0x44ccff,
    },
    {
        id: 'revive',
        name: '死亡抗拒',
        description: '每次运行可复活 {value} 次',
        effectType: 'revive',
        valuePerLevel: 1,
        maxLevel: 3,
        costs: [100, 150, 250], // 总 500
        color: 0xffdd44,
    },
    {
        id: 'blessing_luck',
        name: '祝福亲和',
        description: '稀有祝福概率 +{value}%',
        effectType: 'blessing_luck',
        valuePerLevel: 5,
        maxLevel: 5,
        costs: linearCosts(10, 5), // 总 150 (调整为与设计文档250接近)
        color: 0xaa44ff,
    },
    {
        id: 'crit_boost',
        name: '暴击直觉',
        description: '暴击率 +{value}%',
        effectType: 'crit_chance',
        valuePerLevel: 3,
        maxLevel: 5,
        costs: linearCosts(10, 5), // 总 150
        color: 0xff44aa,
    },
    {
        id: 'gold_boost',
        name: '贪婪本能',
        description: '金币获取 +{value}%',
        effectType: 'gold_bonus',
        valuePerLevel: 15,
        maxLevel: 5,
        costs: linearCosts(8, 5), // 总 120
        color: 0xffcc00,
    },
    {
        id: 'dash_boost',
        name: '冲刺强化',
        description: '冲刺冷却 -{value}ms',
        effectType: 'dash_cooldown',
        valuePerLevel: 100,
        maxLevel: 3,
        costs: linearCosts(10, 3), // 总 60
        color: 0x44ffaa,
    },
];

/** 通过 ID 查找升级数据 */
export function getUpgradeById(id: string): UpgradeData | undefined {
    return UPGRADE_TABLE.find((u) => u.id === id);
}
```

**Step 2: 验证编译**

Run: `npx tsc --noEmit`
Expected: 零错误（新文件无外部依赖）

**Step 3: Commit**

```bash
git add src/config/UpgradeTable.ts
git commit -m "feat: add UpgradeTable — 8种永久升级数据配置"
```

---

## Task 2: 创建 MetaProgress 逻辑层

**Files:**
- Create: `src/core/MetaProgress.ts`

**Step 1: 创建 MetaProgress 系统**

```typescript
// src/core/MetaProgress.ts

/**
 * 永久进度管理器
 * 封装升级购买/重置/查询逻辑，读写 SaveManager
 */
import { SaveManager } from '@/core/SaveManager';
import { UPGRADE_TABLE, getUpgradeById, UpgradeData } from '@/config/UpgradeTable';

/** 运行开始时应用的属性加成 */
export interface StatBonuses {
    maxHealth: number;       // +N 生命值
    attackDamage: number;    // +N 攻击力
    speed: number;           // +N 速度
    critChance: number;      // +N 暴击率(0.03=3%)
    dashCooldown: number;    // -N ms 冷却
    revives: number;         // 复活次数
    blessingLuckBonus: number; // 稀有祝福权重偏移
    goldMultiplier: number;  // 金币倍率 (1.0 = 无加成)
}

export class MetaProgress {
    /**
     * 获取升级当前等级
     */
    static getLevel(upgradeId: string): number {
        return SaveManager.getUpgradeLevel(upgradeId);
    }

    /**
     * 获取下一级费用，已满级返回 -1
     */
    static getNextCost(upgradeId: string): number {
        const data = getUpgradeById(upgradeId);
        if (!data) return -1;
        const level = this.getLevel(upgradeId);
        if (level >= data.maxLevel) return -1;
        return data.costs[level];
    }

    /**
     * 是否可以升级（碎片足够且未满级）
     */
    static canUpgrade(upgradeId: string): boolean {
        const cost = this.getNextCost(upgradeId);
        if (cost < 0) return false;
        return SaveManager.getData().memoryShards >= cost;
    }

    /**
     * 购买升级
     * @returns true 成功, false 失败
     */
    static purchaseUpgrade(upgradeId: string): boolean {
        const cost = this.getNextCost(upgradeId);
        if (cost < 0) return false;
        if (!SaveManager.spendShards(cost)) return false;
        const newLevel = this.getLevel(upgradeId) + 1;
        SaveManager.setUpgradeLevel(upgradeId, newLevel);
        console.log(`[MetaProgress] 升级 ${upgradeId} → Lv${newLevel}, 花费 ${cost} 碎片`);
        return true;
    }

    /**
     * 重置某项升级，退还所有已花费的碎片
     * @returns 退还的碎片数
     */
    static resetUpgrade(upgradeId: string): number {
        const data = getUpgradeById(upgradeId);
        if (!data) return 0;
        const currentLevel = this.getLevel(upgradeId);
        if (currentLevel === 0) return 0;

        // 计算已花费总额
        let totalSpent = 0;
        for (let i = 0; i < currentLevel; i++) {
            totalSpent += data.costs[i];
        }

        // 退还碎片
        SaveManager.addShards(totalSpent);
        SaveManager.setUpgradeLevel(upgradeId, 0);
        console.log(`[MetaProgress] 重置 ${upgradeId}, 退还 ${totalSpent} 碎片`);
        return totalSpent;
    }

    /**
     * 获取当前所有升级带来的属性加成
     * 在 RunScene.create() 中调用
     */
    static getStatBonuses(): StatBonuses {
        const bonuses: StatBonuses = {
            maxHealth: 0,
            attackDamage: 0,
            speed: 0,
            critChance: 0,
            dashCooldown: 0,
            revives: 0,
            blessingLuckBonus: 0,
            goldMultiplier: 1.0,
        };

        for (const upgrade of UPGRADE_TABLE) {
            const level = this.getLevel(upgrade.id);
            if (level === 0) continue;

            const totalValue = upgrade.valuePerLevel * level;

            switch (upgrade.effectType) {
                case 'max_health':
                    bonuses.maxHealth = totalValue;
                    break;
                case 'attack_damage':
                    bonuses.attackDamage = totalValue;
                    break;
                case 'speed':
                    bonuses.speed = totalValue;
                    break;
                case 'crit_chance':
                    bonuses.critChance = totalValue / 100; // 3% → 0.03
                    break;
                case 'dash_cooldown':
                    bonuses.dashCooldown = totalValue;
                    break;
                case 'revive':
                    bonuses.revives = totalValue;
                    break;
                case 'blessing_luck':
                    bonuses.blessingLuckBonus = totalValue; // 每级+5 → 存百分比整数
                    break;
                case 'gold_bonus':
                    bonuses.goldMultiplier = 1.0 + totalValue / 100; // 15% → 0.15
                    break;
            }
        }

        return bonuses;
    }

    /**
     * 获取所有升级数据（供 UI 展示）
     */
    static getAllUpgrades(): Array<UpgradeData & { currentLevel: number; nextCost: number }> {
        return UPGRADE_TABLE.map((data) => ({
            ...data,
            currentLevel: this.getLevel(data.id),
            nextCost: this.getNextCost(data.id),
        }));
    }
}
```

**Step 2: 验证编译**

Run: `npx tsc --noEmit`
Expected: 零错误

**Step 3: Commit**

```bash
git add src/core/MetaProgress.ts
git commit -m "feat: add MetaProgress — 永久升级逻辑层(购买/重置/查询加成)"
```

---

## Task 3: 更新 Constants 和 gameConfig

**Files:**
- Modify: `src/utils/Constants.ts:169-180` (SCENES) 和文件末尾 (新增 UPGRADE)
- Modify: `src/config/gameConfig.ts:16-17,55` (导入和注册)

**Step 1: 在 Constants.ts 的 SCENES 中添加 UPGRADE**

在 `src/utils/Constants.ts` 的 SCENES 对象中添加:

```typescript
export const SCENES = {
    BOOT: 'BootScene',
    MENU: 'MenuScene',
    GAME: 'GameScene',
    RUN: 'RunScene',
    HUB: 'HubScene',
    DEATH: 'DeathScene',
    BLESSING: 'BlessingScene',
    UPGRADE: 'UpgradeScene',    // ← 新增
    UI: 'UIScene',
    GAME_OVER: 'GameOverScene',
    WIN: 'WinScene',
};
```

**Step 2: 在 Constants.ts 末尾添加 UPGRADE 常量**

在 `BLESSING` 对象之后添加:

```typescript
// ===== 永久升级系统常量 =====
export const UPGRADE = {
    /** 卡片尺寸 */
    CARD_WIDTH: 180,
    CARD_HEIGHT: 200,
    /** 网格布局 */
    COLS: 4,
    ROWS: 2,
    /** 卡片间距 */
    GAP_X: 20,
    GAP_Y: 20,
};
```

**Step 3: 在 gameConfig.ts 中注册 UpgradeScene**

在 `src/config/gameConfig.ts` 中:

添加导入:
```typescript
import { UpgradeScene } from '../scenes/UpgradeScene';
```

在 scene 数组中添加 UpgradeScene:
```typescript
scene: [BootScene, MenuScene, GameScene, RunScene, HubScene, DeathScene, BlessingSelectScene, UpgradeScene, UIScene, GameOverScene, WinScene],
```

**Step 4: 验证编译**

Run: `npx tsc --noEmit`
Expected: 可能报错找不到 UpgradeScene (尚未创建) — 这是预期的，Task 4 会解决

**Step 5: Commit (与 Task 4 一起)**

---

## Task 4: 创建 UpgradeScene 覆盖层 UI

**Files:**
- Create: `src/scenes/UpgradeScene.ts`

**Step 1: 创建完整的升级场景**

```typescript
// src/scenes/UpgradeScene.ts

/**
 * 升级场景（覆盖层）
 * 全屏覆盖在 HubScene 之上，展示8种永久升级
 * W/A/S/D 导航，J 购买，R 重置，ESC 关闭
 */
import Phaser from 'phaser';
import {
    SCENES,
    GAME_WIDTH,
    GAME_HEIGHT,
    DEPTH,
    UPGRADE,
} from '@/utils/Constants';
import { MetaProgress } from '@/core/MetaProgress';
import { SaveManager } from '@/core/SaveManager';
import { UpgradeData } from '@/config/UpgradeTable';

/** 单个升级卡片 */
interface UpgradeCard {
    container: Phaser.GameObjects.Container;
    data: UpgradeData;
    /** 等级文本 */
    levelText: Phaser.GameObjects.Text;
    /** 费用文本 */
    costText: Phaser.GameObjects.Text;
    /** 背景图形 */
    bg: Phaser.GameObjects.Graphics;
    /** 网格索引 */
    index: number;
}

export class UpgradeScene extends Phaser.Scene {
    private cards: UpgradeCard[] = [];
    private selectedIndex: number = 0;
    private shardsText!: Phaser.GameObjects.Text;
    private infoText!: Phaser.GameObjects.Text;
    private hintText!: Phaser.GameObjects.Text;

    constructor() {
        super({ key: SCENES.UPGRADE });
    }

    create(): void {
        // 半透明背景遮罩
        const overlay = this.add.graphics();
        overlay.fillStyle(0x000000, 0.75);
        overlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        overlay.setDepth(DEPTH.BLESSING_OVERLAY);

        // 标题
        this.add
            .text(GAME_WIDTH / 2, 36, '✦ 记 忆 之 镜 ✦', {
                fontSize: '22px',
                color: '#cc99ff',
                fontFamily: 'monospace',
                stroke: '#000000',
                strokeThickness: 4,
            })
            .setOrigin(0.5)
            .setDepth(DEPTH.BLESSING_OVERLAY + 1);

        // 碎片余额
        this.shardsText = this.add
            .text(GAME_WIDTH / 2, 66, '', {
                fontSize: '16px',
                color: '#ffdd88',
                fontFamily: 'monospace',
                stroke: '#000000',
                strokeThickness: 3,
            })
            .setOrigin(0.5)
            .setDepth(DEPTH.BLESSING_OVERLAY + 1);

        // 创建卡片网格
        this.createCards();

        // 效果预览文本
        this.infoText = this.add
            .text(GAME_WIDTH / 2, GAME_HEIGHT - 70, '', {
                fontSize: '13px',
                color: '#ffffff',
                fontFamily: 'monospace',
                stroke: '#000000',
                strokeThickness: 3,
                align: 'center',
            })
            .setOrigin(0.5)
            .setDepth(DEPTH.BLESSING_OVERLAY + 1);

        // 操作提示
        this.hintText = this.add
            .text(GAME_WIDTH / 2, GAME_HEIGHT - 30, '[W/A/S/D] 选择  [J] 升级  [R] 重置  [ESC] 关闭', {
                fontSize: '12px',
                color: '#888888',
                fontFamily: 'monospace',
                stroke: '#000000',
                strokeThickness: 2,
            })
            .setOrigin(0.5)
            .setDepth(DEPTH.BLESSING_OVERLAY + 1);

        // 绑定键盘
        this.setupInput();

        // 初始选中
        this.updateShardsDisplay();
        this.updateSelection();

        // 入场动画
        this.cameras.main.fadeIn(200, 0, 0, 0);
    }

    private createCards(): void {
        const allUpgrades = MetaProgress.getAllUpgrades();

        // 计算网格起始位置（居中）
        const totalWidth = UPGRADE.COLS * UPGRADE.CARD_WIDTH + (UPGRADE.COLS - 1) * UPGRADE.GAP_X;
        const totalHeight = UPGRADE.ROWS * UPGRADE.CARD_HEIGHT + (UPGRADE.ROWS - 1) * UPGRADE.GAP_Y;
        const startX = (GAME_WIDTH - totalWidth) / 2 + UPGRADE.CARD_WIDTH / 2;
        const startY = (GAME_HEIGHT - totalHeight) / 2 + UPGRADE.CARD_HEIGHT / 2 + 10;

        allUpgrades.forEach((upgradeInfo, i) => {
            const col = i % UPGRADE.COLS;
            const row = Math.floor(i / UPGRADE.COLS);
            const cx = startX + col * (UPGRADE.CARD_WIDTH + UPGRADE.GAP_X);
            const cy = startY + row * (UPGRADE.CARD_HEIGHT + UPGRADE.GAP_Y);

            const container = this.add.container(cx, cy);
            container.setDepth(DEPTH.BLESSING_OVERLAY + 2);

            // 背景卡片
            const bg = this.add.graphics();
            this.drawCardBg(bg, upgradeInfo, false);
            container.add(bg);

            // 图标（彩色圆形）
            const icon = this.add.graphics();
            icon.fillStyle(upgradeInfo.color, 1);
            icon.fillCircle(0, -55, 18);
            icon.fillStyle(0xffffff, 0.3);
            icon.fillCircle(-4, -59, 6);
            container.add(icon);

            // 名称
            const nameText = this.add
                .text(0, -25, upgradeInfo.name, {
                    fontSize: '15px',
                    color: '#ffffff',
                    fontFamily: 'monospace',
                    stroke: '#000000',
                    strokeThickness: 3,
                })
                .setOrigin(0.5);
            container.add(nameText);

            // 描述（用当前总值填充）
            const totalValue = upgradeInfo.valuePerLevel * upgradeInfo.currentLevel;
            const maxValue = upgradeInfo.valuePerLevel * upgradeInfo.maxLevel;
            const descStr = upgradeInfo.description.replace('{value}', `${totalValue}/${maxValue}`);
            const descText = this.add
                .text(0, 0, descStr, {
                    fontSize: '11px',
                    color: '#aaaaaa',
                    fontFamily: 'monospace',
                    stroke: '#000000',
                    strokeThickness: 2,
                    align: 'center',
                    wordWrap: { width: UPGRADE.CARD_WIDTH - 24 },
                })
                .setOrigin(0.5);
            container.add(descText);

            // 等级条
            const levelText = this.add
                .text(0, 30, `Lv ${upgradeInfo.currentLevel}/${upgradeInfo.maxLevel}`, {
                    fontSize: '14px',
                    color: '#ffdd88',
                    fontFamily: 'monospace',
                    stroke: '#000000',
                    strokeThickness: 3,
                })
                .setOrigin(0.5);
            container.add(levelText);

            // 进度条
            this.drawLevelBar(container, upgradeInfo.currentLevel, upgradeInfo.maxLevel, upgradeInfo.color);

            // 费用
            const costStr =
                upgradeInfo.nextCost < 0
                    ? '已满级'
                    : `◆ ${upgradeInfo.nextCost}`;
            const costColor = upgradeInfo.nextCost < 0 ? '#66ff66' : '#ffffff';
            const costText = this.add
                .text(0, 72, costStr, {
                    fontSize: '13px',
                    color: costColor,
                    fontFamily: 'monospace',
                    stroke: '#000000',
                    strokeThickness: 3,
                })
                .setOrigin(0.5);
            container.add(costText);

            this.cards.push({
                container,
                data: upgradeInfo,
                levelText,
                costText,
                bg,
                index: i,
            });
        });
    }

    /** 绘制卡片背景 */
    private drawCardBg(gfx: Phaser.GameObjects.Graphics, data: UpgradeData, selected: boolean): void {
        gfx.clear();
        const w = UPGRADE.CARD_WIDTH;
        const h = UPGRADE.CARD_HEIGHT;

        if (selected) {
            // 选中高亮边框
            gfx.fillStyle(0x443366, 0.95);
            gfx.fillRoundedRect(-w / 2 - 2, -h / 2 - 2, w + 4, h + 4, 10);
            gfx.lineStyle(2, data.color, 1);
            gfx.strokeRoundedRect(-w / 2 - 2, -h / 2 - 2, w + 4, h + 4, 10);
        } else {
            gfx.fillStyle(0x221133, 0.9);
            gfx.fillRoundedRect(-w / 2, -h / 2, w, h, 8);
            gfx.lineStyle(1, 0x554477, 0.6);
            gfx.strokeRoundedRect(-w / 2, -h / 2, w, h, 8);
        }
    }

    /** 绘制等级进度条 */
    private drawLevelBar(
        container: Phaser.GameObjects.Container,
        level: number,
        maxLevel: number,
        color: number,
    ): void {
        const barWidth = UPGRADE.CARD_WIDTH - 40;
        const barHeight = 6;
        const barY = 48;

        const barGfx = this.add.graphics();
        // 底色
        barGfx.fillStyle(0x111111, 0.8);
        barGfx.fillRoundedRect(-barWidth / 2, barY, barWidth, barHeight, 3);
        // 进度
        if (level > 0) {
            const fillWidth = (barWidth * level) / maxLevel;
            barGfx.fillStyle(color, 0.9);
            barGfx.fillRoundedRect(-barWidth / 2, barY, fillWidth, barHeight, 3);
        }
        container.add(barGfx);
    }

    /** 更新选中状态 */
    private updateSelection(): void {
        this.cards.forEach((card, i) => {
            const isSelected = i === this.selectedIndex;
            this.drawCardBg(card.bg, card.data, isSelected);

            // 选中卡片轻微放大
            card.container.setScale(isSelected ? 1.05 : 1.0);
        });

        // 更新效果预览
        const selected = this.cards[this.selectedIndex];
        if (selected) {
            const data = selected.data;
            const level = MetaProgress.getLevel(data.id);
            const currentValue = data.valuePerLevel * level;
            const nextValue = level < data.maxLevel ? data.valuePerLevel * (level + 1) : currentValue;
            const unit = data.effectType === 'crit_chance' || data.effectType === 'gold_bonus' || data.effectType === 'blessing_luck' ? '%' : '';

            if (level >= data.maxLevel) {
                this.infoText.setText(`${data.name} — 已达到最高等级 (${currentValue}${unit})`);
            } else {
                this.infoText.setText(`${data.name} — 当前: ${currentValue}${unit} → 升级后: ${nextValue}${unit}`);
            }
        }
    }

    /** 更新碎片显示 */
    private updateShardsDisplay(): void {
        const shards = SaveManager.getData().memoryShards;
        this.shardsText.setText(`记忆碎片: ◆ ${shards}`);
    }

    /** 刷新单张卡片数据 */
    private refreshCard(card: UpgradeCard): void {
        const level = MetaProgress.getLevel(card.data.id);
        const nextCost = MetaProgress.getNextCost(card.data.id);

        card.levelText.setText(`Lv ${level}/${card.data.maxLevel}`);

        if (nextCost < 0) {
            card.costText.setText('已满级');
            card.costText.setColor('#66ff66');
        } else {
            card.costText.setText(`◆ ${nextCost}`);
            card.costText.setColor('#ffffff');
        }
    }

    /** 绑定键盘输入 */
    private setupInput(): void {
        this.input.keyboard?.on('keydown-A', () => this.moveSelection(-1, 0));
        this.input.keyboard?.on('keydown-D', () => this.moveSelection(1, 0));
        this.input.keyboard?.on('keydown-W', () => this.moveSelection(0, -1));
        this.input.keyboard?.on('keydown-S', () => this.moveSelection(0, 1));
        this.input.keyboard?.on('keydown-LEFT', () => this.moveSelection(-1, 0));
        this.input.keyboard?.on('keydown-RIGHT', () => this.moveSelection(1, 0));
        this.input.keyboard?.on('keydown-UP', () => this.moveSelection(0, -1));
        this.input.keyboard?.on('keydown-DOWN', () => this.moveSelection(0, 1));
        this.input.keyboard?.on('keydown-J', () => this.handlePurchase());
        this.input.keyboard?.on('keydown-R', () => this.handleReset());
        this.input.keyboard?.on('keydown-ESC', () => this.closePanel());
    }

    /** 移动选择光标 */
    private moveSelection(dx: number, dy: number): void {
        const col = this.selectedIndex % UPGRADE.COLS;
        const row = Math.floor(this.selectedIndex / UPGRADE.COLS);
        const newCol = Phaser.Math.Clamp(col + dx, 0, UPGRADE.COLS - 1);
        const newRow = Phaser.Math.Clamp(row + dy, 0, UPGRADE.ROWS - 1);
        const newIndex = newRow * UPGRADE.COLS + newCol;

        if (newIndex < this.cards.length) {
            this.selectedIndex = newIndex;
            this.updateSelection();
        }
    }

    /** 购买升级 */
    private handlePurchase(): void {
        const card = this.cards[this.selectedIndex];
        if (!card) return;

        if (MetaProgress.canUpgrade(card.data.id)) {
            MetaProgress.purchaseUpgrade(card.data.id);
            this.refreshCard(card);
            this.updateShardsDisplay();
            this.updateSelection();

            // 购买成功反馈：闪白
            this.cameras.main.flash(100, 200, 180, 255, false);
        } else {
            // 失败反馈：抖动
            this.cameras.main.shake(100, 0.005);
        }
    }

    /** 重置选中升级 */
    private handleReset(): void {
        const card = this.cards[this.selectedIndex];
        if (!card) return;

        const refunded = MetaProgress.resetUpgrade(card.data.id);
        if (refunded > 0) {
            this.refreshCard(card);
            this.updateShardsDisplay();
            this.updateSelection();

            // 重置反馈
            this.cameras.main.flash(100, 255, 200, 100, false);
        }
    }

    /** 关闭面板，返回 HubScene */
    private closePanel(): void {
        this.cameras.main.fadeOut(200, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            this.scene.stop();
            // 通知 HubScene 恢复
            this.scene.get(SCENES.HUB)?.events.emit('upgrade-panel-closed');
        });
    }
}
```

**Step 2: 验证编译**

Run: `npx tsc --noEmit`
Expected: 零错误（Constants 中已有 SCENES.UPGRADE, UPGRADE 常量）

**Step 3: Commit**

```bash
git add src/utils/Constants.ts src/config/gameConfig.ts src/scenes/UpgradeScene.ts
git commit -m "feat: add UpgradeScene + Constants/gameConfig — 全屏升级UI覆盖层"
```

---

## Task 5: 集成 — HubScene 记忆之镜交互

**Files:**
- Modify: `src/scenes/HubScene.ts:551-558` (handleInteract 中记忆之镜)

**Step 1: 修改 HubScene 记忆之镜交互**

将 HubScene 的 `handleInteract` 方法中记忆之镜部分从显示 "尚未开放" 改为启动 UpgradeScene:

替换 `src/scenes/HubScene.ts` 中的这段代码:

```typescript
// 旧代码 (约 551-558 行)
        // 记忆之镜交互
        if (this.activeMirror) {
            this.startDialog([
                '记忆之镜：过往的回忆在镜面中浮现……',
                '记忆之镜：（尚未开放）',
            ]);
            return;
        }
```

替换为:

```typescript
        // 记忆之镜交互 → 打开升级面板
        if (this.activeMirror) {
            this.openUpgradePanel();
            return;
        }
```

**Step 2: 在 HubScene 添加 openUpgradePanel 方法**

在 `handleInteract()` 方法之后添加:

```typescript
    /** 打开升级面板（覆盖层） */
    private openUpgradePanel(): void {
        // 禁用 HubScene 键盘防止冲突
        if (this.input.keyboard) {
            this.input.keyboard.enabled = false;
        }

        // 监听关闭事件
        this.events.once('upgrade-panel-closed', () => {
            if (this.input.keyboard) {
                this.input.keyboard.enabled = true;
            }
        });

        // 启动升级场景覆盖层
        this.scene.launch(SCENES.UPGRADE);
    }
```

**Step 3: 验证编译**

Run: `npx tsc --noEmit`
Expected: 零错误

**Step 4: Commit**

```bash
git add src/scenes/HubScene.ts
git commit -m "feat: HubScene 记忆之镜交互 → 启动 UpgradeScene"
```

---

## Task 6: 集成 — RunScene + Player 应用升级加成

**Files:**
- Modify: `src/scenes/RunScene.ts:9-10,85-104` (导入 + create 方法)
- Modify: `src/entities/Player.ts:28-91` (新增 applyUpgradeBonuses)

**Step 1: 给 Player 添加 applyUpgradeBonuses 方法**

在 `src/entities/Player.ts` 的 `heal()` 方法之前添加:

```typescript
    /**
     * 应用永久升级加成
     * 在 RunScene.create() 中创建玩家后调用
     */
    public applyUpgradeBonuses(bonuses: {
        maxHealth: number;
        attackDamage: number;
        speed: number;
        critChance: number;
        dashCooldown: number;
    }): void {
        if (bonuses.maxHealth > 0) {
            this.maxHealth += bonuses.maxHealth;
            this.health = this.maxHealth;
        }
        if (bonuses.attackDamage > 0) {
            this.attackDamage += bonuses.attackDamage;
        }
        if (bonuses.critChance > 0) {
            this.criticalChance += bonuses.critChance;
        }
        console.log(`[Player] 升级加成已应用: HP+${bonuses.maxHealth}, ATK+${bonuses.attackDamage}, SPD+${bonuses.speed}, CRIT+${(bonuses.critChance * 100).toFixed(0)}%, DASH-${bonuses.dashCooldown}ms`);
    }
```

注意：speed 和 dashCooldown 的应用比较特殊，因为 Player 直接使用 `PLAYER_CONFIG.speed` 和 `PLAYER_CONFIG.dashCooldown`，不是存为实例属性。需要在 Player 上新增实例属性来覆盖。

在 Player 类的属性区域(约第30行)添加:

```typescript
    // 移动速度（可被升级加成修改）
    public moveSpeed: number;
    // 冲刺冷却（可被升级加成修改）
    public dashCooldownTime: number;
```

在 constructor 中初始化:

```typescript
        this.moveSpeed = PLAYER_CONFIG.speed;
        this.dashCooldownTime = PLAYER_CONFIG.dashCooldown;
```

修改 `handleMovement()` 中使用 `this.moveSpeed` 替代 `PLAYER_CONFIG.speed`:

```typescript
        if (this.keys.left.isDown) {
            body.setVelocityX(-this.moveSpeed);
            this.setFlipX(true);
        } else if (this.keys.right.isDown) {
            body.setVelocityX(this.moveSpeed);
            this.setFlipX(false);
        }
```

修改 `handleDash()` 中使用 `this.dashCooldownTime` 替代 `PLAYER_CONFIG.dashCooldown`:

```typescript
        // 冷却时间
        this.scene.time.delayedCall(this.dashCooldownTime, () => {
            this.canDash = true;
            console.log('[Dash] 冷却完成');
        });
```

完善 `applyUpgradeBonuses`:

```typescript
    public applyUpgradeBonuses(bonuses: {
        maxHealth: number;
        attackDamage: number;
        speed: number;
        critChance: number;
        dashCooldown: number;
    }): void {
        if (bonuses.maxHealth > 0) {
            this.maxHealth += bonuses.maxHealth;
            this.health = this.maxHealth;
        }
        if (bonuses.attackDamage > 0) {
            this.attackDamage += bonuses.attackDamage;
        }
        if (bonuses.speed > 0) {
            this.moveSpeed += bonuses.speed;
        }
        if (bonuses.critChance > 0) {
            this.criticalChance += bonuses.critChance;
        }
        if (bonuses.dashCooldown > 0) {
            this.dashCooldownTime = Math.max(200, this.dashCooldownTime - bonuses.dashCooldown);
        }
        // 发送血量更新给UI
        this.scene.events.emit('player-health-changed', this.health, this.maxHealth);
        console.log(`[Player] 升级加成: HP+${bonuses.maxHealth}, ATK+${bonuses.attackDamage}, SPD+${bonuses.speed}, CRIT+${(bonuses.critChance * 100).toFixed(0)}%, DASH-${bonuses.dashCooldown}ms`);
    }
```

**Step 2: 修改 RunScene.create() 应用升级加成**

在 `src/scenes/RunScene.ts` 顶部添加导入:

```typescript
import { MetaProgress } from '@/core/MetaProgress';
```

在 `create()` 方法中 `this.createPlayer()` 之后、`this.loadRoom()` 之前添加:

```typescript
        // 应用永久升级加成
        const bonuses = MetaProgress.getStatBonuses();
        this.player.applyUpgradeBonuses(bonuses);

        // 死亡抗拒 → RunManager
        this.runManager.startRun(bonuses.revives);
```

注意: 当前 create() 中已调用 `this.runManager.startRun()`，需要将其移到升级加成逻辑处。删除原来的 `this.runManager.startRun()` 行，改为上面带参数的调用。

同时在 RunScene 中存储 goldMultiplier 和 blessingLuckBonus:

在 RunScene 类的属性区域添加:

```typescript
    // 升级加成
    private goldMultiplier: number = 1.0;
    private blessingLuckBonus: number = 0;
```

在 create() 中:

```typescript
        // 存储金币和祝福加成
        this.goldMultiplier = bonuses.goldMultiplier;
        this.blessingLuckBonus = bonuses.blessingLuckBonus;
```

**Step 3: 祝福亲和 — 修改 BlessingManager.rollBlessings**

在 `BlessingManager` 的 `rollBlessings` 方法添加可选参数 `luckBonus`:

修改 `src/combat/BlessingManager.ts:178`:

```typescript
    rollBlessings(count: number = BLESSING.CHOICES_PER_ROOM, luckBonus: number = 0): BlessingData[] {
```

修改权重计算部分，在 `rarityWeightMap` 初始化之后:

```typescript
        const rarityWeightMap: Record<BlessingRarity, number> = {
            common: Math.max(10, BLESSING.RARITY_WEIGHTS[0] - luckBonus * 2),
            rare: BLESSING.RARITY_WEIGHTS[1] + luckBonus,
            epic: BLESSING.RARITY_WEIGHTS[2] + luckBonus,
        };
```

然后在 `RunScene.showBlessingSelect()` 中将 `blessingLuckBonus` 传入 BlessingSelectScene 的 data:

修改 `src/scenes/RunScene.ts` 的 `showBlessingSelect()`:

```typescript
        this.scene.launch(SCENES.BLESSING, {
            blessingManager: this.blessingManager,
            runManager: this.runManager,
            luckBonus: this.blessingLuckBonus,
        });
```

然后在 `BlessingSelectScene` 中使用。查看 BlessingSelectScene 如何调用 rollBlessings 以确定修改点。

**Step 4: 贪婪本能 — 金币掉落倍率**

在 RunScene 中使用 `goldMultiplier`。当前 `RunManager.addGold()` 已存在，只需在任何添加金币的地方乘以 goldMultiplier。

目前金币掉落似乎还未完全实现（敌人死亡掉落金币的代码不在 RunScene 中）。留一个注释标记：

```typescript
        // TODO: 敌人死亡掉落金币时乘以 this.goldMultiplier
```

**Step 5: 验证编译**

Run: `npx tsc --noEmit`
Expected: 零错误

**Step 6: Commit**

```bash
git add src/entities/Player.ts src/scenes/RunScene.ts src/combat/BlessingManager.ts
git commit -m "feat: 运行开始时应用永久升级加成到Player/RunManager/BlessingManager"
```

---

## Task 7: 读取 BlessingSelectScene 并传递 luckBonus

**Files:**
- Modify: `src/scenes/BlessingSelectScene.ts` (读取 luckBonus 并传给 rollBlessings)

**Step 1: 查看 BlessingSelectScene**

先读取文件内容确认 rollBlessings 的调用点。

**Step 2: 修改 BlessingSelectScene**

在 scene init/create 中读取 `data.luckBonus` 并传给 `blessingManager.rollBlessings(3, luckBonus)`。

具体修改取决于文件内容，大致为:

```typescript
// 在 create() 或 init() 中
private luckBonus: number = 0;

init(data: { blessingManager: BlessingManager; runManager: RunManager; luckBonus?: number }): void {
    // ...existing code...
    this.luckBonus = data.luckBonus ?? 0;
}

// 在调用 rollBlessings 处
const candidates = this.blessingManager.rollBlessings(3, this.luckBonus);
```

**Step 3: 验证编译**

Run: `npx tsc --noEmit`
Expected: 零错误

**Step 4: Commit**

```bash
git add src/scenes/BlessingSelectScene.ts
git commit -m "feat: BlessingSelectScene 支持祝福亲和 luckBonus"
```

---

## Task 8: 最终验证和总提交

**Step 1: TypeScript 编译检查**

Run: `npx tsc --noEmit`
Expected: 零错误

**Step 2: 运行游戏验证**

Run: `yarn dev`
手动测试:
1. 启动游戏 → 进入据点
2. 走到记忆之镜(左侧紫色物体) → 按W → 应出现升级面板
3. WASD/方向键选择不同升级卡片 → 确认高亮移动正常
4. 先给自己一些碎片（可在控制台执行 `SaveManager.addShards(1000)`）
5. J键购买升级 → 确认碎片扣除、等级增加
6. R键重置升级 → 确认碎片退还
7. ESC关闭面板 → 确认回到据点
8. 走到回廊之门开始运行 → 确认升级加成已应用（看 console 日志）

**Step 3: 更新 context.md**

在 `docs/context.md` 的已完成工作中添加 Phase 6 记录。

**Step 4: 最终 Commit**

```bash
git add -A
git commit -m "feat: Phase 6 完成 — 永久升级系统(记忆之镜)"
```
