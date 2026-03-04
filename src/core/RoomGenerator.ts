/**
 * 房间生成器
 * 读取 RoomConfig，动态创建 Phaser 物理对象（平台、敌人、危险区域）
 * 支持清理（房间切换时销毁所有对象）
 */
import Phaser from 'phaser';
import { RoomConfig, HazardData } from '@/config/RoomConfig';
import { TILE_SIZE, ASSETS, DEPTH } from '@/utils/Constants';
import { SkeletonEnemy } from '@/entities/SkeletonEnemy';
import { ArcherEnemy } from '@/entities/ArcherEnemy';
import { ShieldEnemy } from '@/entities/ShieldEnemy';
import { FlyingEnemy } from '@/entities/FlyingEnemy';
import { Enemy } from '@/entities/Enemy';

export interface RoomObjects {
    platforms: Phaser.Physics.Arcade.StaticGroup;
    enemies: Phaser.Physics.Arcade.Group;
}

export class RoomGenerator {
    private scene: Phaser.Scene;
    private platforms: Phaser.Physics.Arcade.StaticGroup | null = null;
    private enemies: Phaser.Physics.Arcade.Group | null = null;
    private hazards: Phaser.GameObjects.GameObject[] = [];

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
    }

    /**
     * 根据房间配置生成所有物理对象
     */
    generate(config: RoomConfig): RoomObjects {
        this.cleanup();

        // 设置世界边界
        this.scene.physics.world.setBounds(0, 0, config.size.width, config.size.height);

        // 创建平台组
        this.platforms = this.scene.physics.add.staticGroup();
        this.createGround(config);
        config.platforms.forEach(p => this.createPlatform(p.x, p.y, p.tileCount));

        // 创建敌人组
        this.enemies = this.scene.physics.add.group();
        config.spawns.forEach(s => this.spawnEnemy(s.type, s.x, s.y));

        // 创建危险区域
        config.hazards.forEach(h => this.createHazard(h));

        return {
            platforms: this.platforms,
            enemies: this.enemies,
        };
    }

    /**
     * 创建地面
     */
    private createGround(config: RoomConfig): void {
        if (!this.platforms) return;
        const numTiles = Math.ceil(config.size.width / TILE_SIZE);

        for (let i = 0; i < numTiles; i++) {
            const tileIndex = Phaser.Math.Between(1, 11);
            const ground = this.platforms.create(
                i * TILE_SIZE + TILE_SIZE / 2,
                config.groundY + TILE_SIZE / 2,
                `${ASSETS.TILESET_GRASS}-${tileIndex}`,
            ) as Phaser.Physics.Arcade.Sprite;
            ground.setScale(0.5);
            ground.refreshBody();
        }
    }

    /**
     * 创建浮空平台
     */
    private createPlatform(x: number, y: number, tileCount: number): void {
        if (!this.platforms) return;

        for (let i = 0; i < tileCount; i++) {
            const tileIndex = Phaser.Math.Between(1, 11);
            const tile = this.platforms.create(
                x + i * TILE_SIZE * 0.5,
                y,
                `${ASSETS.TILESET_GRASS}-${tileIndex}`,
            ) as Phaser.Physics.Arcade.Sprite;
            tile.setScale(0.5);
            tile.setDepth(DEPTH.TILEMAP);
            tile.refreshBody();
        }
    }

    /**
     * 根据类型字符串生成敌人
     */
    private spawnEnemy(type: string, x: number, y: number): void {
        if (!this.enemies) return;

        let enemy: Enemy;
        switch (type) {
            case 'skeleton':
                enemy = new SkeletonEnemy(this.scene, x, y);
                break;
            case 'archer':
                enemy = new ArcherEnemy(this.scene, x, y);
                break;
            case 'shield':
                enemy = new ShieldEnemy(this.scene, x, y);
                break;
            case 'flying':
                enemy = new FlyingEnemy(this.scene, x, y);
                break;
            default:
                console.warn(`[RoomGenerator] 未知敌人类型: ${type}, 使用骷髅兵替代`);
                enemy = new SkeletonEnemy(this.scene, x, y);
                break;
        }

        enemy.setDepth(DEPTH.ENEMIES);
        this.enemies.add(enemy);
    }

    /**
     * 创建危险区域（尖刺、熔岩等）
     */
    private createHazard(hazard: HazardData): void {
        // 创建可视化危险区域
        const graphics = this.scene.add.graphics();
        let color = 0xff0000;
        if (hazard.type === 'lava') color = 0xff4400;
        else if (hazard.type === 'spikes') color = 0xcccccc;

        graphics.fillStyle(color, 0.5);
        graphics.fillRect(hazard.x, hazard.y, hazard.width, hazard.height);
        graphics.setDepth(DEPTH.TILEMAP);

        this.hazards.push(graphics);
    }

    /**
     * 清理当前房间所有对象
     */
    cleanup(): void {
        if (this.platforms) {
            this.platforms.clear(true, true);
            this.platforms = null;
        }
        if (this.enemies) {
            // 先销毁每个敌人的血条等附属对象
            this.enemies.getChildren().forEach(child => {
                const enemy = child as Enemy;
                if (enemy.destroy) {
                    enemy.destroy();
                }
            });
            this.enemies.clear(true, true);
            this.enemies = null;
        }
        this.hazards.forEach(h => h.destroy());
        this.hazards = [];
    }

    /**
     * 获取当前房间存活敌人数量
     */
    getAliveEnemyCount(): number {
        if (!this.enemies) return 0;
        return this.enemies.getChildren().filter(
            child => !(child as Enemy).isDead
        ).length;
    }
}
