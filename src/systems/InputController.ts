/**
 * 输入控制器
 * 封装键盘输入，提供统一的输入接口
 */
import Phaser from 'phaser';
import { CONTROLS } from '../utils/Constants';

export class InputController {
    // private scene: Phaser.Scene; // Unused

    // 按键引用
    public keys: {
        left: Phaser.Input.Keyboard.Key;
        right: Phaser.Input.Keyboard.Key;
        jump: Phaser.Input.Keyboard.Key;
        attack: Phaser.Input.Keyboard.Key;
        skill: Phaser.Input.Keyboard.Key;
        inventory: Phaser.Input.Keyboard.Key;
        pause: Phaser.Input.Keyboard.Key;
    };

    constructor(scene: Phaser.Scene) {
        // this.scene = scene; // Unused

        const keyboard = scene.input.keyboard;
        if (!keyboard) {
            throw new Error('Keyboard input not available');
        }

        // 初始化按键
        this.keys = {
            left: keyboard.addKey(CONTROLS.LEFT),
            right: keyboard.addKey(CONTROLS.RIGHT),
            jump: keyboard.addKey(CONTROLS.JUMP),
            attack: keyboard.addKey(CONTROLS.ATTACK),
            skill: keyboard.addKey(CONTROLS.SKILL),
            inventory: keyboard.addKey(CONTROLS.INVENTORY),
            pause: keyboard.addKey(CONTROLS.PAUSE),
        };
    }

    /**
     * 检查是否按下左键
     */
    public isLeftPressed(): boolean {
        return this.keys.left.isDown;
    }

    /**
     * 检查是否按下右键
     */
    public isRightPressed(): boolean {
        return this.keys.right.isDown;
    }

    /**
     * 检查跳跃键是否刚按下
     */
    public isJumpJustPressed(): boolean {
        return Phaser.Input.Keyboard.JustDown(this.keys.jump);
    }

    /**
     * 检查攻击键是否刚按下
     */
    public isAttackJustPressed(): boolean {
        return Phaser.Input.Keyboard.JustDown(this.keys.attack);
    }

    /**
     * 检查技能键是否刚按下
     */
    public isSkillJustPressed(): boolean {
        return Phaser.Input.Keyboard.JustDown(this.keys.skill);
    }

    /**
     * 获取水平移动输入 (-1, 0, 1)
     */
    public getHorizontalInput(): number {
        if (this.keys.left.isDown) return -1;
        if (this.keys.right.isDown) return 1;
        return 0;
    }
}
