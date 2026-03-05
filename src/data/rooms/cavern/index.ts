/**
 * 石窟区域房间模板索引
 */
import type { RoomConfig } from '@/config/RoomConfig';
import combatFlat01 from './combat-flat-01.json';
import combatPlatforms01 from './combat-platforms-01.json';
import combatCorridor01 from './combat-corridor-01.json';
import bossStoneGolem from './boss-stone-golem.json';

/** 所有石窟战斗房间模板 */
export const CAVERN_COMBAT_ROOMS: RoomConfig[] = [
    combatFlat01 as RoomConfig,
    combatPlatforms01 as RoomConfig,
    combatCorridor01 as RoomConfig,
];

/** 石窟 Boss 房间 */
export const CAVERN_BOSS_ROOM: RoomConfig = bossStoneGolem as RoomConfig;

/** 按 ID 获取房间模板 */
export function getCavernRoom(id: string): RoomConfig | undefined {
    return CAVERN_COMBAT_ROOMS.find(r => r.id === id);
}
