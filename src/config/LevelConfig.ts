import { DEPTH, GAME_HEIGHT } from '../utils/Constants';

export interface DecorationPlacement {
    x: number;
    y: number;
    type: string;
    scale?: number;
    depth?: number;
    flipX?: boolean;
}

const groundY = GAME_HEIGHT - 32; // TILE_SIZE = 32

export const LEVEL_1_DECORATIONS: DecorationPlacement[] = [
    // 前景装饰 (更靠近屏幕)
    { x: 200, y: groundY + 10, type: 'BUSH_1', depth: DEPTH.ENEMIES + 5 },
    { x: 500, y: groundY + 10, type: 'LONG_ROCK_1', depth: DEPTH.ENEMIES + 5 },
    { x: 800, y: groundY + 10, type: 'BUSH_2', depth: DEPTH.ENEMIES + 5 },
    { x: 1200, y: groundY + 10, type: 'BUSH_3', depth: DEPTH.ENEMIES + 5 },

    // 背景装饰 (在角色后面)
    { x: 350, y: groundY - 10, type: 'BUSH_4', depth: DEPTH.BACKGROUND },
    { x: 650, y: groundY - 10, type: 'BUSH_5', depth: DEPTH.BACKGROUND },
    { x: 950, y: groundY - 10, type: 'BUSH_6', depth: DEPTH.BACKGROUND },
    { x: 1500, y: groundY - 10, type: 'LONG_ROCK_1', depth: DEPTH.BACKGROUND },

    // 更多随机分布
    { x: 1800, y: groundY, type: 'BUSH_1' },
    { x: 2100, y: groundY, type: 'BUSH_2' },
    { x: 2400, y: groundY, type: 'LONG_ROCK_1' },
];
