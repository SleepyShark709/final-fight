/**
 * 运行管理器
 * 管理单次运行(Run)的状态：当前区域、房间进度、祝福列表、临时资源
 */

export interface RunState {
    // 当前进度
    currentBiome: number;       // 0=石窟, 1=熔岩
    currentRoom: number;        // 当前房间序号(从0开始)
    roomsInBiome: number;       // 当前区域总房间数

    // 临时资源（死亡后清零）
    runGold: number;
    runShards: number;

    // 战斗统计
    kills: number;
    damageTaken: number;
    damageDealt: number;
    roomsCleared: number;

    // 祝福
    activeBlessings: string[];

    // 运行状态
    isRunActive: boolean;
    deathDefiances: number;
}

export class RunManager {
    private state: RunState;

    constructor() {
        this.state = this.createFreshRun();
    }

    private createFreshRun(): RunState {
        return {
            currentBiome: 0,
            currentRoom: 0,
            roomsInBiome: 6,
            runGold: 0,
            runShards: 0,
            kills: 0,
            damageTaken: 0,
            damageDealt: 0,
            roomsCleared: 0,
            activeBlessings: [],
            isRunActive: false,
            deathDefiances: 0,
        };
    }

    startRun(deathDefiances: number = 0): void {
        this.state = this.createFreshRun();
        this.state.isRunActive = true;
        this.state.deathDefiances = deathDefiances;
        console.log('[RunManager] Run started');
    }

    advanceRoom(): { isBossRoom: boolean } {
        this.state.currentRoom++;
        this.state.roomsCleared++;
        const isBossRoom = this.state.currentRoom >= this.state.roomsInBiome;
        return { isBossRoom };
    }

    advanceBiome(): boolean {
        this.state.currentBiome++;
        this.state.currentRoom = 0;
        // v1.0只有2个区域(0和1)
        if (this.state.currentBiome > 1) {
            return true; // 通关
        }
        return false;
    }

    recordKill(): void {
        this.state.kills++;
    }

    addGold(amount: number): void {
        this.state.runGold += amount;
    }

    addShards(amount: number): void {
        this.state.runShards += amount;
    }

    addDamageDealt(amount: number): void {
        this.state.damageDealt += amount;
    }

    addDamageTaken(amount: number): void {
        this.state.damageTaken += amount;
    }

    addBlessing(blessingId: string): void {
        this.state.activeBlessings.push(blessingId);
    }

    removeBlessing(blessingId: string): void {
        this.state.activeBlessings = this.state.activeBlessings.filter(id => id !== blessingId);
    }

    hasBlessing(blessingId: string): boolean {
        return this.state.activeBlessings.includes(blessingId);
    }

    useDeathDefiance(): boolean {
        if (this.state.deathDefiances > 0) {
            this.state.deathDefiances--;
            return true;
        }
        return false;
    }

    endRun(): RunState {
        this.state.isRunActive = false;
        return { ...this.state };
    }

    getState(): Readonly<RunState> {
        return this.state;
    }

    getCurrentBiome(): number {
        return this.state.currentBiome;
    }

    getCurrentRoom(): number {
        return this.state.currentRoom;
    }

    isActive(): boolean {
        return this.state.isRunActive;
    }
}
