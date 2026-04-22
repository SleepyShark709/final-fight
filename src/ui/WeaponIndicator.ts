/**
 * 武器指示器 UI
 *
 * 显示当前武器 + 技能冷却指示（U键技能可用时高亮，冷却中显示进度）
 * 位置：左下角
 */
import Phaser from 'phaser';
import { Player } from '../entities/Player';

export class WeaponIndicator {
    private container: Phaser.GameObjects.Container;
    private weaponIcon: Phaser.GameObjects.Graphics;
    private weaponLabel: Phaser.GameObjects.Text;
    private weaponNameText: Phaser.GameObjects.Text;
    private skillIcon: Phaser.GameObjects.Graphics;
    private skillKeyLabel: Phaser.GameObjects.Text;

    private player?: Player;

    private skillCooldownPct: number = 0; // 0 = 就绪, 1 = 满冷却

    // 武器图标颜色
    private static readonly WEAPON_COLORS: Record<string, number> = {
        sword: 0xd4d8e0,
        fists: 0xffdd44,
        bow: 0x66ddaa,
    };

    constructor(scene: Phaser.Scene, x: number, y: number) {
        this.container = scene.add.container(x, y);

        // 武器槽底框
        const frame = scene.add.graphics();
        frame.fillStyle(0x0a0a12, 0.85);
        frame.fillRoundedRect(-56, -36, 112, 72, 8);
        frame.lineStyle(2, 0x444c5a, 1);
        frame.strokeRoundedRect(-56, -36, 112, 72, 8);

        // 武器图标（圆形）
        this.weaponIcon = scene.add.graphics();
        this.drawWeaponIcon('sword');
        this.weaponIcon.setPosition(-30, 0);

        // "武器" 小标签
        this.weaponLabel = scene.add.text(-30, -27, 'WPN', {
            fontSize: '9px',
            fontFamily: 'Arial',
            color: '#8898a8',
        });
        this.weaponLabel.setOrigin(0.5);

        // 武器名
        this.weaponNameText = scene.add.text(18, -8, '裂空剑', {
            fontSize: '14px',
            fontFamily: 'Arial Black, Arial',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 2,
        });
        this.weaponNameText.setOrigin(0.5);

        // 技能冷却圆（小）
        this.skillIcon = scene.add.graphics();
        this.skillIcon.setPosition(18, 14);
        this.drawSkillIcon(0);

        // 技能键位标签
        this.skillKeyLabel = scene.add.text(18, 14, 'U', {
            fontSize: '10px',
            fontFamily: 'Arial Black, Arial',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 2,
        });
        this.skillKeyLabel.setOrigin(0.5);

        this.container.add([frame, this.weaponIcon, this.weaponLabel, this.weaponNameText, this.skillIcon, this.skillKeyLabel]);
        this.container.setDepth(100);
    }

    private drawWeaponIcon(weaponId: string): void {
        const g = this.weaponIcon;
        g.clear();
        const color = WeaponIndicator.WEAPON_COLORS[weaponId] ?? 0xffffff;
        // 外环
        g.lineStyle(2, 0xdddddd, 0.8);
        g.strokeCircle(0, 0, 16);
        // 内填充
        g.fillStyle(color, 1);
        g.fillCircle(0, 0, 14);
        // 光斑
        g.fillStyle(0xffffff, 0.35);
        g.fillCircle(-4, -4, 4);

        // 武器符号（简化图案）
        g.lineStyle(2.5, 0x222222, 1);
        if (weaponId === 'sword') {
            // 剑：竖线 + 横线（十字）
            g.lineBetween(0, -9, 0, 9);
            g.lineBetween(-5, -4, 5, -4);
        } else if (weaponId === 'fists') {
            // 拳：闪电
            g.beginPath();
            g.moveTo(-3, -8);
            g.lineTo(2, -2);
            g.lineTo(-2, 2);
            g.lineTo(3, 8);
            g.strokePath();
        } else if (weaponId === 'bow') {
            // 弓：弧 + 箭
            g.beginPath();
            g.arc(-4, 0, 9, -Math.PI / 2.5, Math.PI / 2.5, false);
            g.strokePath();
            g.lineBetween(-3, 0, 8, 0);
        }
    }

    private drawSkillIcon(cooldownPct: number): void {
        const g = this.skillIcon;
        g.clear();
        const r = 11;

        // 底圆
        g.fillStyle(0x101418, 1);
        g.fillCircle(0, 0, r);

        if (cooldownPct <= 0.001) {
            // 就绪：发光外环
            g.lineStyle(2, 0x88ddff, 1);
            g.strokeCircle(0, 0, r);
            g.fillStyle(0x224e66, 0.8);
            g.fillCircle(0, 0, r - 2);
        } else {
            // 冷却：灰色 + 扇形指示
            g.fillStyle(0x333333, 1);
            g.fillCircle(0, 0, r - 1);
            // 逆时针填充剩余冷却（未恢复部分为暗色）
            const angle = -Math.PI / 2;
            const sweep = (1 - cooldownPct) * Math.PI * 2;
            g.fillStyle(0x448899, 1);
            g.beginPath();
            g.moveTo(0, 0);
            g.arc(0, 0, r - 1, angle, angle + sweep, false);
            g.closePath();
            g.fillPath();
            g.lineStyle(1.5, 0x666666, 1);
            g.strokeCircle(0, 0, r);
        }
    }

    public setPlayer(player: Player): void {
        this.player = player;
    }

    public update(): void {
        if (!this.player) return;
        const weapon = this.player.weapon;
        if (!weapon) return;
        const stats = weapon.getStats();
        // 更新武器名与图标（如切换武器）
        if (this.weaponNameText.text !== stats.name) {
            this.weaponNameText.setText(stats.name);
            this.drawWeaponIcon(stats.id);
        }

        // 计算技能冷却百分比
        // weapon 没有直接暴露冷却进度字段，这里用 isSkillReady 近似
        const ready = weapon.isSkillReady();
        const targetPct = ready ? 0 : (this.skillCooldownPct === 0 ? 1 : this.skillCooldownPct);
        // 自然衰减：每帧往 0 方向衰减（简化，冷却可视化）
        if (!ready && this.skillCooldownPct === 0) {
            // 刚刚进入冷却
            this.skillCooldownPct = 1;
        }
        if (ready) {
            this.skillCooldownPct = 0;
        } else {
            // 按武器 skillCooldown 推算剩余时间
            this.skillCooldownPct = Math.max(0, this.skillCooldownPct - (1 / (stats.skillCooldown / 16.7)));
        }
        void targetPct;
        this.drawSkillIcon(this.skillCooldownPct);
    }

    public destroy(): void {
        this.container.destroy();
    }
}
