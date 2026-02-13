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
} from '../utils/Constants';

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

        // 加载环境Tiles (1-100)
        for (let i = 1; i <= 100; i++) {
            const filename = i.toString().padStart(4, '0') + '.png';
            this.load.image(
                `${ASSETS.ENV_TILE}-${i}`,
                `assets/environment/tiles/${filename}`,
            );
        }

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
        // 创建所有动画
        this.createAnimations();

        // 短暂延迟后跳转到菜单场景
        this.time.delayedCall(500, () => {
            this.scene.start(SCENES.MENU);
        });
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
    }
}
