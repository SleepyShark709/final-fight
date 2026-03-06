/**
 * 启动场景 - 资源加载
 * 负责加载所有游戏资源并显示加载进度
 */
import Phaser from 'phaser';
import {
    SCENES,
    ASSETS,
    ANIMATION_FRAMES,
    PLAYER_ATTACK_TYPES,
    ENEMY_CONFIG,
    VFX_CONFIG,
} from '../utils/Constants';
import { DECORATIONS } from '../systems/DecorationManager';

export class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: SCENES.BOOT });
    }

    /**
     * 预加载所有游戏资源
     */
    preload(): void {
        // 创建加载进度条
        this.createLoadingBar();

        // ===== 加载玩家精灵 =====
        // idle 和 run
        for (let i = 0; i < ANIMATION_FRAMES.player.idle; i++) {
            this.load.image(
                `${ASSETS.PLAYER_IDLE}-${i}`,
                `assets/player/idle/${i}.png`,
            );
        }
        for (let i = 0; i < ANIMATION_FRAMES.player.run; i++) {
            this.load.image(
                `${ASSETS.PLAYER_RUN}-${i}`,
                `assets/player/run/${i}.png`,
            );
        }

        // jump
        for (let i = 0; i < ANIMATION_FRAMES.player.jump; i++) {
            this.load.image(
                `${ASSETS.PLAYER_JUMP}-${i}`,
                `assets/player/jump/${i}.png`,
            );
        }

        // 加载所有攻击类型
        PLAYER_ATTACK_TYPES.forEach((attackType) => {
            for (let i = 0; i < attackType.frames; i++) {
                const filename = attackType.prefix
                    ? `${attackType.prefix}${i}.png`
                    : `${i}.png`;
                this.load.image(
                    `${ASSETS.PLAYER_ATTACK}-${attackType.prefix}${i}`,
                    `assets/player/attack/${filename}`,
                );
            }
        });

        // ===== 加载敌人精灵 =====
        // idle和walk各4帧
        for (let i = 0; i < ANIMATION_FRAMES.enemy.idle; i++) {
            this.load.image(
                `${ASSETS.ENEMY_SKELETON_IDLE}-${i}`,
                `assets/enemy/idle/${i}.png`,
            );
            this.load.image(
                `${ASSETS.ENEMY_SKELETON_WALK}-${i}`,
                `assets/enemy/walk/${i}.png`,
            );
        }
        // attack有8帧
        for (let i = 0; i < ANIMATION_FRAMES.enemy.attack; i++) {
            this.load.image(
                `${ASSETS.ENEMY_SKELETON_ATTACK}-${i}`,
                `assets/enemy/attack/${i}.png`,
            );
        }

        // ===== 加载地形素材 =====
        for (let i = 1; i <= 11; i++) {
            this.load.image(
                `${ASSETS.TILESET_GRASS}-${i}`,
                `assets/grass/t${i}.png`,
            );
        }

        // 加载环境Tiles（只加载装饰物配置中实际用到的索引）
        const usedTileIndices = new Set<number>();
        Object.values(DECORATIONS).forEach((config) => {
            config.tiles.forEach((idx) => usedTileIndices.add(idx));
        });
        for (const i of usedTileIndices) {
            const filename = i.toString().padStart(4, '0') + '.png';
            this.load.image(
                `${ASSETS.ENV_TILE}-${i}`,
                `assets/environment/tiles/${filename}`,
            );
        }

        // ===== 加载斩击VFX（7张逐帧PNG） =====
        for (let i = 1; i <= VFX_CONFIG.slash.frameCount; i++) {
            this.load.image(
                `${ASSETS.VFX_SLASH}-${i}`,
                `assets/ai-vfx/vfx_slash${i}.png`,
            );
        }

        // ===== 加载爆炸VFX（spritesheet） =====
        this.load.spritesheet(
            ASSETS.VFX_EXPLOSION,
            'assets/ai-vfx/explosion.png',
            { frameWidth: VFX_CONFIG.explosion.frameWidth, frameHeight: VFX_CONFIG.explosion.frameHeight },
        );
        this.load.spritesheet(
            ASSETS.VFX_EXPLOSION_SMALL,
            'assets/ai-vfx/explosion_animated.png',
            { frameWidth: VFX_CONFIG.explosionSmall.frameWidth, frameHeight: VFX_CONFIG.explosionSmall.frameHeight },
        );

        // ===== 加载熔岩魔像（12张逐帧PNG） =====
        for (let i = 1; i <= 12; i++) {
            this.load.image(
                `${ASSETS.ENEMY_LAVA_GOLEM}-${i}`,
                `assets/ai-enemies/lava_golem/Frame ${i}.png`,
            );
        }

        // ===== 加载Ancient UI面板 =====
        this.load.image(ASSETS.UI_PANEL_TAN, 'assets/ai-ui/panels/Ancient/tan.png');
        this.load.image(ASSETS.UI_PANEL_BROWN, 'assets/ai-ui/panels/Ancient/brown.png');
        this.load.image(ASSETS.UI_PANEL_GREY, 'assets/ai-ui/panels/Ancient/grey.png');
        this.load.image(ASSETS.UI_PANEL_TAN_INLAY, 'assets/ai-ui/panels/Ancient/tan_inlay.png');
        this.load.image(ASSETS.UI_PANEL_BROWN_INLAY, 'assets/ai-ui/panels/Ancient/brown_inlay.png');

        // 加载天空背景
        this.load.image(
            ASSETS.SKY_BACKGROUND,
            'assets/backgrounds/sky_parallax.png',
        );
        this.load.image(
            ASSETS.MOUNTAINS_BACKGROUND,
            'assets/backgrounds/mountains.png',
        );
        this.load.image(
            ASSETS.TREES_BACKGROUND,
            'assets/backgrounds/trees.png',
        );
    }

    /**
     * 创建加载进度条
     */
    private createLoadingBar(): void {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // 标题文字
        const titleText = this.add.text(
            width / 2,
            height / 2 - 80,
            'Final Fight V2',
            {
                fontSize: '48px',
                fontFamily: 'Arial',
                color: '#ffffff',
            },
        );
        titleText.setOrigin(0.5);

        // 加载文字
        const loadingText = this.add.text(width / 2, height / 2, 'Loading...', {
            fontSize: '24px',
            fontFamily: 'Arial',
            color: '#ffffff',
        });
        loadingText.setOrigin(0.5);

        // 进度条背景
        const progressBarBg = this.add.graphics();
        progressBarBg.fillStyle(0x222222, 0.8);
        progressBarBg.fillRect(width / 4, height / 2 + 40, width / 2, 30);

        // 进度条
        const progressBar = this.add.graphics();

        // 监听加载进度
        this.load.on('progress', (value: number) => {
            progressBar.clear();
            progressBar.fillStyle(0x4a9eff, 1);
            progressBar.fillRect(
                width / 4 + 5,
                height / 2 + 45,
                (width / 2 - 10) * value,
                20,
            );
        });

        // 加载完成
        this.load.on('complete', () => {
            progressBar.destroy();
            progressBarBg.destroy();
            loadingText.destroy();
        });
    }

    /**
     * 资源加载完成后创建动画并跳转
     */
    create(): void {
        // 用代码生成投射物贴图（蓝色子弹/箭矢）
        this.createProceduralTextures();

        // 创建所有动画
        this.createAnimations();

        // 短暂延迟后跳转到菜单场景
        this.time.delayedCall(500, () => {
            this.scene.start(SCENES.MENU);
        });
    }

    /**
     * 用 Graphics 生成运行时贴图（无需外部素材）
     */
    private createProceduralTextures(): void {
        // 投射物贴图：蓝色发光箭矢（12x6 px）
        const g = this.add.graphics();
        g.fillStyle(ENEMY_CONFIG.archer.projectileColor, 1);
        g.fillRoundedRect(0, 0, 14, 6, 2);
        g.fillStyle(0xffffff, 0.6);
        g.fillRoundedRect(2, 1, 6, 2, 1); // 高光
        g.generateTexture(ASSETS.PROJECTILE, 14, 6);
        g.destroy();
    }

    /**
     * 创建游戏动画
     */
    private createAnimations(): void {
        // 通用帧生成函数
        const generateFrames = (key: string, count: number) =>
            Array.from({ length: count }, (_, i) => ({ key: `${key}-${i}` }));

        // ===== 玩家动画 =====
        this.anims.create({
            key: 'player-idle',
            frames: generateFrames(ASSETS.PLAYER_IDLE, 6),
            frameRate: 6,
            repeat: -1,
        });

        this.anims.create({
            key: 'player-run',
            frames: generateFrames(ASSETS.PLAYER_RUN, 6),
            frameRate: 8,
            repeat: -1,
        });

        this.anims.create({
            key: 'player-jump',
            frames: generateFrames(ASSETS.PLAYER_JUMP, 4),
            frameRate: 8,
            repeat: 0,
        });

        // 为每种攻击类型创建动画
        PLAYER_ATTACK_TYPES.forEach((attackType) => {
            const frames = Array.from(
                { length: attackType.frames },
                (_, i) => ({
                    key: `${ASSETS.PLAYER_ATTACK}-${attackType.prefix}${i}`,
                }),
            );
            this.anims.create({
                key: attackType.key,
                frames: frames,
                frameRate: 8, // 降低帧率，延长攻击动画时间
                repeat: 0,
            });
        });

        // ===== 敌人动画 =====
        this.anims.create({
            key: 'skeleton-idle',
            frames: generateFrames(ASSETS.ENEMY_SKELETON_IDLE, 4),
            frameRate: 6,
            repeat: -1,
        });

        this.anims.create({
            key: 'skeleton-walk',
            frames: generateFrames(ASSETS.ENEMY_SKELETON_WALK, 4),
            frameRate: 8,
            repeat: -1,
        });

        this.anims.create({
            key: 'skeleton-attack',
            frames: generateFrames(ASSETS.ENEMY_SKELETON_ATTACK, 8),
            frameRate: 10,
            repeat: 0,
        });

        // ===== 斩击VFX动画 =====
        this.anims.create({
            key: ASSETS.VFX_SLASH,
            frames: Array.from({ length: VFX_CONFIG.slash.frameCount }, (_, i) => ({
                key: `${ASSETS.VFX_SLASH}-${i + 1}`,
            })),
            frameRate: VFX_CONFIG.slash.frameRate,
            repeat: 0,
        });

        // ===== 爆炸VFX动画 =====
        this.anims.create({
            key: ASSETS.VFX_EXPLOSION,
            frames: this.anims.generateFrameNumbers(ASSETS.VFX_EXPLOSION, {
                start: 0,
                end: VFX_CONFIG.explosion.frameCount - 1,
            }),
            frameRate: VFX_CONFIG.explosion.frameRate,
            repeat: 0,
        });
        this.anims.create({
            key: ASSETS.VFX_EXPLOSION_SMALL,
            frames: this.anims.generateFrameNumbers(ASSETS.VFX_EXPLOSION_SMALL, {
                start: 0,
                end: VFX_CONFIG.explosionSmall.frameCount - 1,
            }),
            frameRate: VFX_CONFIG.explosionSmall.frameRate,
            repeat: 0,
        });

        // ===== 熔岩魔像动画 =====
        const golemFrames = Array.from({ length: 12 }, (_, i) => ({
            key: `${ASSETS.ENEMY_LAVA_GOLEM}-${i + 1}`,
        }));
        this.anims.create({
            key: 'lava-golem-idle',
            frames: golemFrames,
            frameRate: 6,
            repeat: -1,
        });
        this.anims.create({
            key: 'lava-golem-walk',
            frames: golemFrames,
            frameRate: 8,
            repeat: -1,
        });
        this.anims.create({
            key: 'lava-golem-attack',
            frames: golemFrames.slice(6, 12), // 帧7-12用于攻击
            frameRate: 10,
            repeat: 0,
        });
    }
}
