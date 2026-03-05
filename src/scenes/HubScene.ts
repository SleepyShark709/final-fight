/**
 * 中枢场景（Hub）
 * 肉鸽模式下两次战斗之间的据点，提供 NPC 交互、强化入口和关卡传送门
 * 静态场景，不滚屏，宽度固定 960px
 */
import Phaser from 'phaser';
import {
    SCENES,
    GAME_WIDTH,
    GAME_HEIGHT,
    TILE_SIZE,
    DEPTH,
} from '@/utils/Constants';
import { Player } from '@/entities/Player';
import { InputController } from '@/systems/InputController';

// ===== NPC 配置 =====
interface NpcConfig {
    /** 唯一标识 */
    id: string;
    /** 显示名称（中文） */
    name: string;
    /** 中心 X 坐标 */
    x: number;
    /** 矩形颜色 */
    color: number;
    /** 矩形宽度 */
    width: number;
    /** 矩形高度 */
    height: number;
    /** 对话文本行 */
    dialog: string[];
}

const NPC_LIST: NpcConfig[] = [
    {
        id: 'blacksmith',
        name: '铁匠',
        x: 250,
        color: 0xcc7722, // 橙色
        width: 40,
        height: 56,
        dialog: [
            '铁匠：你的剑刃又卷了……',
            '铁匠：拿点材料来，我帮你锻一锻。',
        ],
    },
    {
        id: 'herbalist',
        name: '药师',
        x: 480,
        color: 0x33aa55, // 绿色
        width: 36,
        height: 52,
        dialog: [
            '药师：闻到你身上的血腥味了。',
            '药师：来一瓶回复药？便宜卖你。',
        ],
    },
    {
        id: 'traveler',
        name: '旅行者',
        x: 700,
        color: 0x3366cc, // 蓝色
        width: 36,
        height: 56,
        dialog: [
            '旅行者：我走过无数世界……',
            '旅行者：你的下一段旅途，也许没有回头路。',
        ],
    },
];

// ===== 交互检测半径 =====
const INTERACT_RADIUS = 50;

export class HubScene extends Phaser.Scene {
    // 核心引用
    private player!: Player;
    private inputController!: InputController;
    private ground!: Phaser.Physics.Arcade.StaticGroup;

    // NPC 相关
    private npcZones: Phaser.GameObjects.Zone[] = [];
    // 记忆之镜
    private mirrorZone!: Phaser.GameObjects.Zone;

    // 回廊之门
    private gateZone!: Phaser.GameObjects.Zone;

    // UI 文字
    private promptText!: Phaser.GameObjects.Text;
    private dialogText!: Phaser.GameObjects.Text;

    // 状态
    private activeNpcIndex: number = -1; // 当前可交互的 NPC 索引，-1 表示无
    private activeMirror: boolean = false; // 是否在记忆之镜范围
    private isShowingDialog: boolean = false;
    private dialogLines: string[] = [];
    private dialogLineIndex: number = 0;
    private isTransitioning: boolean = false; // 正在切场景

    constructor() {
        super({ key: SCENES.HUB });
    }

    // ----------------------------------------------------------------
    // 生命周期
    // ----------------------------------------------------------------

    create(): void {
        // 背景色：深邃洞穴
        this.cameras.main.setBackgroundColor('#1a1025');

        // 世界边界 = 画面大小（不滚屏）
        this.physics.world.setBounds(0, 0, GAME_WIDTH, GAME_HEIGHT);

        // 绘制背景装饰
        this.createBackground();

        // 创建地面
        this.createGround();

        // 创建 NPC
        this.createNpcs();

        // 创建记忆之镜
        this.createMirror();

        // 创建回廊之门（传送门）
        this.createGate();

        // 创建玩家（出生在记忆之镜右侧）
        this.createPlayer();

        // 创建 UI 文本
        this.createUITexts();

        // 初始化输入控制器
        this.inputController = new InputController(this);

        // 入场淡入
        this.cameras.main.fadeIn(500, 26, 16, 37);
    }

    update(time: number, delta: number): void {
        if (this.isTransitioning) return;

        // 更新玩家
        this.player.update(time, delta);

        // 检测 NPC 交互距离
        this.checkNpcProximity();

        // 检测记忆之镜
        this.checkMirrorProximity();

        // 检测回廊之门
        this.checkGateProximity();

        // 处理交互输入（W 键）
        if (Phaser.Input.Keyboard.JustDown(this.inputController.keys.interact)) {
            this.handleInteract();
        }
    }

    // ----------------------------------------------------------------
    // 创建方法
    // ----------------------------------------------------------------

    /** 绘制背景装饰（简易洞穴风格） */
    private createBackground(): void {
        const gfx = this.add.graphics();
        gfx.setDepth(DEPTH.BACKGROUND);

        // 洞顶暗影弧线
        gfx.fillStyle(0x0d0818, 0.6);
        gfx.fillEllipse(GAME_WIDTH / 2, -60, GAME_WIDTH + 200, 300);

        // 远处墙壁色块
        gfx.fillStyle(0x251838, 0.5);
        gfx.fillRect(0, 100, GAME_WIDTH, GAME_HEIGHT - 100);

        // 一些垂直石柱装饰
        const pillarPositions = [80, 400, 560, 920];
        pillarPositions.forEach((px) => {
            gfx.fillStyle(0x1e1230, 0.7);
            gfx.fillRect(px - 8, 60, 16, GAME_HEIGHT - 60 - TILE_SIZE);
        });

        // 地面以上的岩层纹理线
        for (let i = 0; i < 6; i++) {
            const y = 150 + i * 60;
            gfx.lineStyle(1, 0x3a2850, 0.3);
            gfx.beginPath();
            gfx.moveTo(0, y);
            for (let x = 0; x <= GAME_WIDTH; x += 40) {
                gfx.lineTo(x, y + Math.sin(x * 0.05 + i) * 8);
            }
            gfx.strokePath();
        }
    }

    /** 创建地面瓦片行 */
    private createGround(): void {
        this.ground = this.physics.add.staticGroup();

        const groundY = GAME_HEIGHT - TILE_SIZE; // 508
        const tileCount = Math.ceil(GAME_WIDTH / TILE_SIZE);

        const gfx = this.add.graphics();
        gfx.setDepth(DEPTH.TILEMAP);

        for (let i = 0; i < tileCount; i++) {
            const tx = i * TILE_SIZE + TILE_SIZE / 2;
            const ty = groundY + TILE_SIZE / 2;

            // 绘制地砖视觉
            gfx.fillStyle(0x3d2e50);
            gfx.fillRect(i * TILE_SIZE, groundY, TILE_SIZE, TILE_SIZE);
            gfx.lineStyle(1, 0x4e3d66, 0.6);
            gfx.strokeRect(i * TILE_SIZE, groundY, TILE_SIZE, TILE_SIZE);

            // 添加物理碰撞体
            const tile = this.add.zone(tx, ty, TILE_SIZE, TILE_SIZE);
            this.physics.add.existing(tile, true); // true = static
            this.ground.add(tile);
        }
    }

    /** 创建 NPC 列表 */
    private createNpcs(): void {
        NPC_LIST.forEach((cfg) => {
            const footY = GAME_HEIGHT - TILE_SIZE; // 地面顶部
            const npcY = footY - cfg.height / 2; // 脚踩地面

            // 绘制有色矩形身体
            const gfx = this.add.graphics();
            gfx.setDepth(DEPTH.ENEMIES);
            gfx.fillStyle(cfg.color, 1);
            gfx.fillRoundedRect(
                cfg.x - cfg.width / 2,
                npcY - cfg.height / 2,
                cfg.width,
                cfg.height,
                6,
            );
            // 眼睛装饰
            gfx.fillStyle(0xffffff, 0.9);
            gfx.fillCircle(cfg.x - 6, npcY - cfg.height / 2 + 14, 4);
            gfx.fillCircle(cfg.x + 6, npcY - cfg.height / 2 + 14, 4);
            gfx.fillStyle(0x111111, 1);
            gfx.fillCircle(cfg.x - 5, npcY - cfg.height / 2 + 15, 2);
            gfx.fillCircle(cfg.x + 7, npcY - cfg.height / 2 + 15, 2);

            // 名称标签
            this.add
                .text(cfg.x, npcY - cfg.height / 2 - 12, cfg.name, {
                    fontSize: '13px',
                    color: '#ffffff',
                    fontFamily: 'monospace',
                    stroke: '#000000',
                    strokeThickness: 3,
                })
                .setOrigin(0.5, 1)
                .setDepth(DEPTH.UI);

            // 创建不可见的交互区域（Zone）
            const zone = this.add.zone(cfg.x, npcY, cfg.width + 40, cfg.height + 20);
            this.physics.add.existing(zone, true);
            this.npcZones.push(zone);
        });
    }

    /** 创建记忆之镜（紫色发光体） */
    private createMirror(): void {
        const mx = 150;
        const footY = GAME_HEIGHT - TILE_SIZE;
        const mirrorHeight = 72;
        const mirrorWidth = 40;
        const my = footY - mirrorHeight / 2;

        // 外发光
        const glowGfx = this.add.graphics();
        glowGfx.setDepth(DEPTH.ENEMIES - 1);
        glowGfx.fillStyle(0x9944cc, 0.15);
        glowGfx.fillCircle(mx, my, 50);
        glowGfx.fillStyle(0x9944cc, 0.08);
        glowGfx.fillCircle(mx, my, 70);

        // 呼吸发光动画
        this.tweens.add({
            targets: glowGfx,
            alpha: { from: 0.6, to: 1 },
            duration: 1200,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });

        // 镜体
        const mirrorGfx = this.add.graphics();
        mirrorGfx.setDepth(DEPTH.ENEMIES);
        mirrorGfx.fillStyle(0x7733aa, 1);
        mirrorGfx.fillRoundedRect(
            mx - mirrorWidth / 2,
            my - mirrorHeight / 2,
            mirrorWidth,
            mirrorHeight,
            8,
        );
        // 镜面高光
        mirrorGfx.fillStyle(0xbb88ee, 0.5);
        mirrorGfx.fillRoundedRect(
            mx - mirrorWidth / 2 + 6,
            my - mirrorHeight / 2 + 6,
            mirrorWidth - 12,
            mirrorHeight - 12,
            6,
        );

        // 标签
        this.add
            .text(mx, my - mirrorHeight / 2 - 12, '记忆之镜', {
                fontSize: '12px',
                color: '#cc99ff',
                fontFamily: 'monospace',
                stroke: '#000000',
                strokeThickness: 3,
            })
            .setOrigin(0.5, 1)
            .setDepth(DEPTH.UI);

        // 交互 Zone
        this.mirrorZone = this.add.zone(mx, my, mirrorWidth + 40, mirrorHeight + 20);
        this.physics.add.existing(this.mirrorZone, true);
    }

    /** 创建回廊之门（右侧大型传送门） */
    private createGate(): void {
        const gx = 880;
        const footY = GAME_HEIGHT - TILE_SIZE;
        const gateHeight = 90;
        const gateWidth = 50;
        const gy = footY - gateHeight / 2;

        // 外层光晕
        const outerGlow = this.add.graphics();
        outerGlow.setDepth(DEPTH.ENEMIES - 1);
        outerGlow.fillStyle(0xff4400, 0.1);
        outerGlow.fillCircle(gx, gy, 70);
        outerGlow.fillStyle(0xff6622, 0.06);
        outerGlow.fillCircle(gx, gy, 90);

        this.tweens.add({
            targets: outerGlow,
            alpha: { from: 0.5, to: 1 },
            duration: 800,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });

        // 门框
        const gateGfx = this.add.graphics();
        gateGfx.setDepth(DEPTH.ENEMIES);

        // 外框（暗红）
        gateGfx.fillStyle(0x661100, 1);
        gateGfx.fillRoundedRect(
            gx - gateWidth / 2 - 4,
            gy - gateHeight / 2 - 4,
            gateWidth + 8,
            gateHeight + 8,
            10,
        );
        // 内层（红橙渐变感）
        gateGfx.fillStyle(0xcc3300, 1);
        gateGfx.fillRoundedRect(
            gx - gateWidth / 2,
            gy - gateHeight / 2,
            gateWidth,
            gateHeight,
            8,
        );
        // 内核亮光
        gateGfx.fillStyle(0xff8844, 0.7);
        gateGfx.fillRoundedRect(
            gx - gateWidth / 2 + 8,
            gy - gateHeight / 2 + 8,
            gateWidth - 16,
            gateHeight - 16,
            6,
        );

        // 标签
        this.add
            .text(gx, gy - gateHeight / 2 - 14, '回廊之门', {
                fontSize: '14px',
                color: '#ff8844',
                fontFamily: 'monospace',
                stroke: '#000000',
                strokeThickness: 3,
            })
            .setOrigin(0.5, 1)
            .setDepth(DEPTH.UI);

        // 交互 Zone
        this.gateZone = this.add.zone(gx, gy, gateWidth + 30, gateHeight + 20);
        this.physics.add.existing(this.gateZone, true);
    }

    /** 创建玩家 */
    private createPlayer(): void {
        const spawnX = 200;
        const spawnY = GAME_HEIGHT - TILE_SIZE - 50; // 在地面上方

        this.player = new Player(this, spawnX, spawnY);
        this.player.setDepth(DEPTH.PLAYER);
        this.player.setCollideWorldBounds(true);

        // 与地面碰撞
        this.physics.add.collider(this.player, this.ground);
    }

    /** 创建 UI 文字元素 */
    private createUITexts(): void {
        // 交互提示文字（显示在玩家头顶）
        this.promptText = this.add
            .text(0, 0, '', {
                fontSize: '12px',
                color: '#ffdd88',
                fontFamily: 'monospace',
                stroke: '#000000',
                strokeThickness: 3,
                align: 'center',
            })
            .setOrigin(0.5, 1)
            .setDepth(DEPTH.UI)
            .setVisible(false);

        // 对话文字（底部横幅）
        this.dialogText = this.add
            .text(GAME_WIDTH / 2, GAME_HEIGHT - 70, '', {
                fontSize: '14px',
                color: '#ffffff',
                fontFamily: 'monospace',
                backgroundColor: '#000000aa',
                padding: { x: 16, y: 10 },
                align: 'center',
                wordWrap: { width: GAME_WIDTH - 120 },
            })
            .setOrigin(0.5, 0.5)
            .setDepth(DEPTH.UI + 10)
            .setVisible(false);

        // 场景标题（短暂显示后淡出）
        const title = this.add
            .text(GAME_WIDTH / 2, 60, '— 据 点 —', {
                fontSize: '22px',
                color: '#ccbbdd',
                fontFamily: 'monospace',
                stroke: '#000000',
                strokeThickness: 4,
            })
            .setOrigin(0.5)
            .setDepth(DEPTH.UI)
            .setAlpha(0);

        this.tweens.add({
            targets: title,
            alpha: { from: 0, to: 1 },
            duration: 800,
            hold: 2000,
            yoyo: true,
        });
    }

    // ----------------------------------------------------------------
    // 距离检测
    // ----------------------------------------------------------------

    /** 检测玩家与 NPC 之间的距离 */
    private checkNpcProximity(): void {
        if (this.isShowingDialog) return; // 对话中不切换

        let closestIndex = -1;
        let closestDist = Infinity;

        NPC_LIST.forEach((cfg, i) => {
            const dist = Math.abs(this.player.x - cfg.x);
            if (dist < INTERACT_RADIUS && dist < closestDist) {
                closestDist = dist;
                closestIndex = i;
            }
        });

        this.activeNpcIndex = closestIndex;

        if (closestIndex >= 0 && !this.isShowingDialog) {
            const cfg = NPC_LIST[closestIndex];
            this.promptText.setText(`按 W 交互`);
            this.promptText.setPosition(cfg.x, GAME_HEIGHT - TILE_SIZE - 80);
            this.promptText.setVisible(true);
        } else if (!this.activeMirror) {
            this.promptText.setVisible(false);
        }
    }

    /** 检测记忆之镜距离 */
    private checkMirrorProximity(): void {
        if (this.isShowingDialog) return;

        const dist = Math.abs(this.player.x - 150);
        this.activeMirror = dist < INTERACT_RADIUS;

        if (this.activeMirror && this.activeNpcIndex < 0) {
            this.promptText.setText('按 W 交互');
            this.promptText.setPosition(150, GAME_HEIGHT - TILE_SIZE - 96);
            this.promptText.setVisible(true);
        }
    }

    /** 检测回廊之门距离 —— 走入即触发 */
    private checkGateProximity(): void {
        const dist = Math.abs(this.player.x - 880);
        if (dist < 35) {
            this.enterGate();
        }
    }

    // ----------------------------------------------------------------
    // 交互处理
    // ----------------------------------------------------------------

    /** W 键被按下 */
    private handleInteract(): void {
        // 如果正在对话，推进到下一行
        if (this.isShowingDialog) {
            this.advanceDialog();
            return;
        }

        // NPC 交互
        if (this.activeNpcIndex >= 0) {
            const cfg = NPC_LIST[this.activeNpcIndex];
            this.startDialog(cfg.dialog);
            return;
        }

        // 记忆之镜交互 → 打开升级面板
        if (this.activeMirror) {
            this.openUpgradePanel();
            return;
        }
    }

    /** 开始一段对话 */
    private startDialog(lines: string[]): void {
        this.isShowingDialog = true;
        this.dialogLines = lines;
        this.dialogLineIndex = 0;
        this.promptText.setVisible(false);

        this.dialogText.setText(this.dialogLines[0]);
        this.dialogText.setVisible(true);
    }

    /** 推进对话到下一行，结束则关闭 */
    private advanceDialog(): void {
        this.dialogLineIndex++;
        if (this.dialogLineIndex >= this.dialogLines.length) {
            // 对话结束
            this.isShowingDialog = false;
            this.dialogText.setVisible(false);
            this.dialogLines = [];
            this.dialogLineIndex = 0;
        } else {
            this.dialogText.setText(this.dialogLines[this.dialogLineIndex]);
        }
    }

    /** 打开升级面板（覆盖层） */
    private openUpgradePanel(): void {
        // 禁用 HubScene 键盘防止冲突
        if (this.input.keyboard) {
            this.input.keyboard.enabled = false;
        }

        // 监听关闭事件
        this.events.once('upgrade-panel-closed', () => {
            if (this.input.keyboard) {
                this.input.keyboard.enabled = true;
            }
        });

        // 启动升级场景覆盖层
        this.scene.launch(SCENES.UPGRADE);
    }

    // ----------------------------------------------------------------
    // 场景切换
    // ----------------------------------------------------------------

    /** 进入回廊之门，切换到 RunScene */
    private enterGate(): void {
        if (this.isTransitioning) return;
        this.isTransitioning = true;

        // 隐藏 UI 文本
        this.promptText.setVisible(false);
        this.dialogText.setVisible(false);

        // 淡出并切换场景
        this.cameras.main.fadeOut(600, 0, 0, 0);
        this.cameras.main.once(
            Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE,
            () => {
                this.scene.start(SCENES.RUN);
            },
        );
    }
}
