/**
 * 房间配置类型定义
 * 用于描述房间模板的数据结构
 */

/** 平台数据 */
export interface PlatformData {
    x: number;
    y: number;
    tileCount: number; // 平台砖块数量
}

/** 敌人生成点 */
export interface SpawnData {
    type: string; // 敌人类型ID（对应 EnemyTable/EnemyFactory 中的 key）
    x: number;
    y: number;
}

/** 环境危险区域 */
export interface HazardData {
    type: 'spikes' | 'lava' | 'falling_rock';
    x: number;
    y: number;
    width: number;
    height: number;
}

/** 出口数据 */
export interface ExitData {
    position: 'left' | 'right' | 'top';
    x: number;
    y: number;
}

/** 房间配置 */
export interface RoomConfig {
    id: string;
    biome: string;
    type: 'combat' | 'elite' | 'shop' | 'rest' | 'event' | 'boss';
    size: { width: number; height: number };
    playerSpawn: { x: number; y: number };
    groundY: number; // 地面Y坐标（砖块顶部）
    platforms: PlatformData[];
    spawns: SpawnData[];
    hazards: HazardData[];
    exits: ExitData[];
}
