/**
 * 永久进度管理器
 * 封装升级购买/重置/查询逻辑，读写 SaveManager
 */
import { SaveManager } from '@/core/SaveManager';
import { UPGRADE_TABLE, getUpgradeById, UpgradeData } from '@/config/UpgradeTable';

/** 运行开始时应用的属性加成 */
export interface StatBonuses {
    maxHealth: number;
    attackDamage: number;
    speed: number;
    critChance: number;
    dashCooldown: number;
    revives: number;
    blessingLuckBonus: number;
    goldMultiplier: number;
}

export class MetaProgress {
    /** 获取升级当前等级 */
    static getLevel(upgradeId: string): number {
        return SaveManager.getUpgradeLevel(upgradeId);
    }

    /** 获取下一级费用，已满级返回 -1 */
    static getNextCost(upgradeId: string): number {
        const data = getUpgradeById(upgradeId);
        if (!data) return -1;
        const level = this.getLevel(upgradeId);
        if (level >= data.maxLevel) return -1;
        return data.costs[level];
    }

    /** 是否可以升级（碎片足够且未满级） */
    static canUpgrade(upgradeId: string): boolean {
        const cost = this.getNextCost(upgradeId);
        if (cost < 0) return false;
        return SaveManager.getData().memoryShards >= cost;
    }

    /** 购买升级 */
    static purchaseUpgrade(upgradeId: string): boolean {
        const cost = this.getNextCost(upgradeId);
        if (cost < 0) return false;
        if (!SaveManager.spendShards(cost)) return false;
        const newLevel = this.getLevel(upgradeId) + 1;
        SaveManager.setUpgradeLevel(upgradeId, newLevel);
        console.log(`[MetaProgress] 升级 ${upgradeId} → Lv${newLevel}, 花费 ${cost} 碎片`);
        return true;
    }

    /** 重置某项升级，退还所有已花费的碎片 */
    static resetUpgrade(upgradeId: string): number {
        const data = getUpgradeById(upgradeId);
        if (!data) return 0;
        const currentLevel = this.getLevel(upgradeId);
        if (currentLevel === 0) return 0;

        let totalSpent = 0;
        for (let i = 0; i < currentLevel; i++) {
            totalSpent += data.costs[i];
        }

        SaveManager.addShards(totalSpent);
        SaveManager.setUpgradeLevel(upgradeId, 0);
        console.log(`[MetaProgress] 重置 ${upgradeId}, 退还 ${totalSpent} 碎片`);
        return totalSpent;
    }

    /** 获取当前所有升级带来的属性加成 */
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
                    bonuses.critChance = totalValue / 100;
                    break;
                case 'dash_cooldown':
                    bonuses.dashCooldown = totalValue;
                    break;
                case 'revive':
                    bonuses.revives = totalValue;
                    break;
                case 'blessing_luck':
                    bonuses.blessingLuckBonus = totalValue;
                    break;
                case 'gold_bonus':
                    bonuses.goldMultiplier = 1.0 + totalValue / 100;
                    break;
            }
        }

        return bonuses;
    }

    /** 获取所有升级数据（供 UI 展示） */
    static getAllUpgrades(): Array<UpgradeData & { currentLevel: number; nextCost: number }> {
        return UPGRADE_TABLE.map((data) => ({
            ...data,
            currentLevel: this.getLevel(data.id),
            nextCost: this.getNextCost(data.id),
        }));
    }
}
