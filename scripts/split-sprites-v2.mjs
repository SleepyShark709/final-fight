/**
 * 统一精灵切割脚本 V2
 * 切割新生成的规整精灵表（水平排列，等间距）
 */
import sharp from 'sharp';
import { mkdir, copyFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const artifactDir =
    '/Users/shark_kuaishou/.gemini/antigravity/brain/d83e684e-fa25-4fca-b913-3afb26d31fae';

// 定义切割任务
const tasks = [
    // 玩家素材
    {
        name: '玩家待机',
        inputPattern: 'player_idle_sprite_*.png',
        inputFile: `${artifactDir}/player_idle_sprite_1769763969108.png`,
        outputDir: 'assets/player/idle',
        frames: 6,
    },
    {
        name: '玩家跑步',
        inputFile: `${artifactDir}/player_run_sprite_1769763992726.png`,
        outputDir: 'assets/player/run',
        frames: 6,
    },
    {
        name: '玩家跳跃',
        inputFile: `${artifactDir}/player_jump_sprite_1769764014629.png`,
        outputDir: 'assets/player/jump',
        frames: 4,
    },
    {
        name: '玩家攻击',
        inputFile: `${artifactDir}/player_attack_sprite_1769764036681.png`,
        outputDir: 'assets/player/attack',
        frames: 4,
    },
    // 敌人素材
    {
        name: '骷髅待机',
        inputFile: `${artifactDir}/skeleton_idle_sprite_1769764076094.png`,
        outputDir: 'assets/enemy/idle',
        frames: 4,
    },
    {
        name: '骷髅移动',
        inputFile: `${artifactDir}/skeleton_walk_sprite_1769764105133.png`,
        outputDir: 'assets/enemy/walk',
        frames: 4,
    },
];

async function splitSpritesheet(task) {
    console.log(`\n正在处理: ${task.name}`);
    console.log(`  输入: ${task.inputFile}`);

    try {
        await mkdir(task.outputDir, { recursive: true });

        const metadata = await sharp(task.inputFile).metadata();
        const width = metadata.width;
        const height = metadata.height;

        console.log(`  图片尺寸: ${width}x${height}`);

        // 计算每帧宽度（假设水平排列，帧数已知）
        const frameWidth = Math.floor(width / task.frames);
        const frameHeight = height; // 使用完整高度

        console.log(`  帧尺寸: ${frameWidth}x${frameHeight}`);

        for (let i = 0; i < task.frames; i++) {
            const left = i * frameWidth;
            const outputPath = join(task.outputDir, `${i}.png`);

            await sharp(task.inputFile)
                .extract({
                    left,
                    top: 0,
                    width: frameWidth,
                    height: frameHeight,
                })
                .png({ quality: 100 })
                .toFile(outputPath);

            console.log(`  帧 ${i}: ${outputPath}`);
        }

        console.log(`  完成!`);
    } catch (error) {
        console.error(`  错误: ${error.message}`);
    }
}

async function main() {
    console.log('开始切割新素材...\n');

    for (const task of tasks) {
        await splitSpritesheet(task);
    }

    console.log('\n全部完成!');
    console.log('\n注意: 骷髅攻击素材需要单独生成后再切割');
}

main();
