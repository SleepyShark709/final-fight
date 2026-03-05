/**
 * 敌人工厂
 * 根据类型字符串创建对应敌人实例
 */
import Phaser from 'phaser';
import { Enemy } from './Enemy';
import { SkeletonEnemy } from './SkeletonEnemy';
import { ArcherEnemy } from './ArcherEnemy';
import { ShieldEnemy } from './ShieldEnemy';
import { FlyingEnemy } from './FlyingEnemy';
import { BombBugEnemy } from './enemies/BombBugEnemy';
import { EliteSkeletonEnemy } from './enemies/EliteSkeletonEnemy';
import { StoneGolemBoss } from './bosses/StoneGolemBoss';

/** 敌人构造函数类型 */
type EnemyConstructor = new (scene: Phaser.Scene, x: number, y: number) => Enemy;

/** 注册表：类型字符串 → 构造函数 */
const ENEMY_REGISTRY: Record<string, EnemyConstructor> = {
    skeleton: SkeletonEnemy,
    archer: ArcherEnemy,
    shield: ShieldEnemy,
    flying: FlyingEnemy,
    bomb_bug: BombBugEnemy,
    elite_skeleton: EliteSkeletonEnemy,
    stone_golem: StoneGolemBoss,
};

export class EnemyFactory {
    /**
     * 创建敌人实例
     * @param type 敌人类型ID（对应 EnemyTable 中的 key）
     * @param scene 所在场景
     * @param x 生成X坐标
     * @param y 生成Y坐标
     * @returns 敌人实例
     */
    static create(type: string, scene: Phaser.Scene, x: number, y: number): Enemy {
        const Constructor = ENEMY_REGISTRY[type];
        if (!Constructor) {
            console.warn(`[EnemyFactory] 未知敌人类型: ${type}，使用骷髅兵替代`);
            return new SkeletonEnemy(scene, x, y);
        }
        return new Constructor(scene, x, y);
    }

    /**
     * 检查类型是否已注册
     */
    static hasType(type: string): boolean {
        return type in ENEMY_REGISTRY;
    }
}
