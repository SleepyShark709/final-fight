/**
 * 存档管理器
 * 使用 localStorage 管理永久进度数据
 */

export interface SaveData {
    // 永久货币
    memoryShards: number;    // 记忆碎片
    gold: number;            // 金币

    // 永久升级等级
    upgrades: Record<string, number>;

    // 解锁状态
    unlockedWeapons: string[];
    unlockedBlessings: string[];

    // 统计
    totalRuns: number;
    totalDeaths: number;
    totalKills: number;
    bestRoom: number;
    bossesDefeated: string[];

    // 版本（用于存档迁移）
    version: number;
}

const SAVE_KEY = 'final-fight-v2-save';
const CURRENT_VERSION = 1;

export class SaveManager {
    private static data: SaveData;

    static getDefaultSave(): SaveData {
        return {
            memoryShards: 0,
            gold: 0,
            upgrades: {},
            unlockedWeapons: ['sword'],
            unlockedBlessings: [],
            totalRuns: 0,
            totalDeaths: 0,
            totalKills: 0,
            bestRoom: 0,
            bossesDefeated: [],
            version: CURRENT_VERSION,
        };
    }

    static load(): SaveData {
        try {
            const raw = localStorage.getItem(SAVE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw) as SaveData;
                if (parsed.version < CURRENT_VERSION) {
                    return this.migrate(parsed);
                }
                this.data = parsed;
                return this.data;
            }
        } catch (e) {
            console.warn('[SaveManager] Failed to load save, using default', e);
        }
        this.data = this.getDefaultSave();
        return this.data;
    }

    static save(): void {
        try {
            localStorage.setItem(SAVE_KEY, JSON.stringify(this.data));
        } catch (e) {
            console.error('[SaveManager] Failed to save', e);
        }
    }

    static getData(): SaveData {
        if (!this.data) this.load();
        return this.data;
    }

    static addShards(amount: number): void {
        this.data.memoryShards += amount;
        this.save();
    }

    static addGold(amount: number): void {
        this.data.gold += amount;
        this.save();
    }

    static spendShards(amount: number): boolean {
        if (this.data.memoryShards < amount) return false;
        this.data.memoryShards -= amount;
        this.save();
        return true;
    }

    static spendGold(amount: number): boolean {
        if (this.data.gold < amount) return false;
        this.data.gold -= amount;
        this.save();
        return true;
    }

    static getUpgradeLevel(upgradeId: string): number {
        return this.data.upgrades[upgradeId] || 0;
    }

    static setUpgradeLevel(upgradeId: string, level: number): void {
        this.data.upgrades[upgradeId] = level;
        this.save();
    }

    static isWeaponUnlocked(weaponId: string): boolean {
        return this.data.unlockedWeapons.includes(weaponId);
    }

    static unlockWeapon(weaponId: string): void {
        if (!this.data.unlockedWeapons.includes(weaponId)) {
            this.data.unlockedWeapons.push(weaponId);
            this.save();
        }
    }

    static recordRun(kills: number, roomsCleared: number, shardsEarned: number): void {
        this.data.totalRuns++;
        this.data.totalDeaths++;
        this.data.totalKills += kills;
        this.data.memoryShards += shardsEarned;
        if (roomsCleared > this.data.bestRoom) {
            this.data.bestRoom = roomsCleared;
        }
        this.save();
    }

    static recordBossDefeat(bossId: string): void {
        if (!this.data.bossesDefeated.includes(bossId)) {
            this.data.bossesDefeated.push(bossId);
            this.save();
        }
    }

    static resetSave(): void {
        this.data = this.getDefaultSave();
        this.save();
    }

    private static migrate(oldData: SaveData): SaveData {
        const newData = { ...this.getDefaultSave(), ...oldData, version: CURRENT_VERSION };
        this.data = newData;
        this.save();
        return newData;
    }
}
