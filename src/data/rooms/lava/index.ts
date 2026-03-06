/**
 * 熔岩区域房间模板索引
 */
import type { RoomConfig } from '@/config/RoomConfig';
import combatFlat01 from './combat-flat-01.json';
import combatFlat02 from './combat-flat-02.json';
import combatPlatforms01 from './combat-platforms-01.json';
import combatPlatforms02 from './combat-platforms-02.json';
import combatCorridor01 from './combat-corridor-01.json';
import combatCorridor02 from './combat-corridor-02.json';
import combatElite01 from './combat-elite-01.json';
import bossFireDragon from './boss-fire-dragon.json';

/** 所有熔岩战斗房间模板 */
export const LAVA_COMBAT_ROOMS: RoomConfig[] = [
    combatFlat01 as RoomConfig,
    combatFlat02 as RoomConfig,
    combatPlatforms01 as RoomConfig,
    combatPlatforms02 as RoomConfig,
    combatCorridor01 as RoomConfig,
    combatCorridor02 as RoomConfig,
];

/** 熔岩精英房间模板 */
export const LAVA_ELITE_ROOMS: RoomConfig[] = [
    combatElite01 as RoomConfig,
];

/** 熔岩 Boss 房间 */
export const LAVA_BOSS_ROOM: RoomConfig = bossFireDragon as RoomConfig;

/** 按 ID 获取熔岩房间模板 */
export function getLavaRoom(id: string): RoomConfig | undefined {
    return LAVA_COMBAT_ROOMS.find(r => r.id === id);
}
