/**
 * 智能精灵切割脚本
 * 使用固定区域切割敌人精灵表
 */
import sharp from 'sharp';
import { mkdir } from 'fs/promises';
import { join } from 'path';

// 敌人 walk 精灵表：1024x1024，5个骷髅水平分布，中心位置偏下
// 观察发现骷髅大约在 y=350-700 区域，每个宽度约 200 像素
const enemyWalkTask = {
    input: 'assets/enemy/walk/spritesheet.png',
    outputDir: 'assets/enemy/walk',
    // 手动定义每个骷髅的裁剪区域 [left, top, width, height]
    frames: [
        [0, 200, 204, 600], // 第1个骷髅
        [204, 200, 204, 600], // 第2个
        [408, 200, 204, 600], // 第3个
        [612, 200, 204, 600], // 第4个
    ],
};

// 敌人 attack 精灵表：1024x1024，6个骷髅水平分布
const enemyAttackTask = {
    input: 'assets/enemy/attack/spritesheet.png',
    outputDir: 'assets/enemy/attack',
    // 6列，每列约170像素
    frames: [
        [0, 200, 170, 600],
        [170, 200, 170, 600],
        [340, 200, 170, 600],
        [510, 200, 170, 600],
    ],
};

async function splitWithRegions(task) {
    console.log(`\n正在处理: ${task.input}`);

    await mkdir(task.outputDir, { recursive: true });

    for (let i = 0; i < task.frames.length; i++) {
        const [left, top, width, height] = task.frames[i];
        const outputPath = join(task.outputDir, `${i}.png`);

        try {
            await sharp(task.input)
                .extract({ left, top, width, height })
                .png()
                .toFile(outputPath);

            console.log(`  已保存: ${outputPath} (${width}x${height})`);
        } catch (error) {
            console.error(`  错误处理帧 ${i}: ${error.message}`);
        }
    }
}

async function main() {
    console.log('开始智能切割敌人精灵表...\n');

    await splitWithRegions(enemyWalkTask);
    await splitWithRegions(enemyAttackTask);

    console.log('\n全部完成!');
}

main();
