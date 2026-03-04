/**
 * 武器工厂
 * 根据武器ID创建对应的武器实例
 */
import Phaser from 'phaser';
import { WeaponBase } from './WeaponBase';
import { SwordWeapon } from './weapons/SwordWeapon';
import { FistsWeapon } from './weapons/FistsWeapon';
import { BowWeapon } from './weapons/BowWeapon';

export class WeaponFactory {
    static create(
        weaponId: string,
        scene: Phaser.Scene,
        owner: Phaser.Physics.Arcade.Sprite,
    ): WeaponBase {
        switch (weaponId) {
            case 'sword':
                return new SwordWeapon(scene, owner);
            case 'fists':
                return new FistsWeapon(scene, owner);
            case 'bow':
                return new BowWeapon(scene, owner);
            default:
                console.warn(`[WeaponFactory] Unknown weapon: ${weaponId}, defaulting to sword`);
                return new SwordWeapon(scene, owner);
        }
    }

    /** 获取所有可用武器ID */
    static getAvailableWeapons(): string[] {
        return ['sword', 'fists', 'bow'];
    }
}
