/**
 * 移除棋盘格背景脚本
 * 将棋盘格替换为真正的透明背景
 */
import sharp from 'sharp';
import { readdir, mkdir } from 'fs/promises';
import { join } from 'path';

// 棋盘格的两种颜色 (浅灰和深灰)
const CHECKER_LIGHT = { r: 204, g: 204, b: 204 }; // #CCCCCC
const CHECKER_DARK = { r: 153, g: 153, b: 153 }; // #999999

// 颜色容差
const TOLERANCE = 30;

function isCheckerColor(r, g, b) {
    const isLight =
        Math.abs(r - CHECKER_LIGHT.r) < TOLERANCE &&
        Math.abs(g - CHECKER_LIGHT.g) < TOLERANCE &&
        Math.abs(b - CHECKER_LIGHT.b) < TOLERANCE;

    const isDark =
        Math.abs(r - CHECKER_DARK.r) < TOLERANCE &&
        Math.abs(g - CHECKER_DARK.g) < TOLERANCE &&
        Math.abs(b - CHECKER_DARK.b) < TOLERANCE;

    // 也检测更浅的灰色 (棋盘格可能有不同变体)
    const isGrayish =
        Math.abs(r - g) < 10 && Math.abs(g - b) < 10 && r > 140 && r < 220;

    return isLight || isDark || isGrayish;
}

async function removeCheckerBackground(inputPath, outputPath) {
    const image = sharp(inputPath);
    const { data, info } = await image
        .raw()
        .ensureAlpha()
        .toBuffer({ resolveWithObject: true });

    const newData = Buffer.alloc(data.length);
    let removedPixels = 0;

    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];

        if (isCheckerColor(r, g, b)) {
            // 设置为透明
            newData[i] = 0;
            newData[i + 1] = 0;
            newData[i + 2] = 0;
            newData[i + 3] = 0;
            removedPixels++;
        } else {
            // 保留原色
            newData[i] = r;
            newData[i + 1] = g;
            newData[i + 2] = b;
            newData[i + 3] = a;
        }
    }

    await sharp(newData, {
        raw: {
            width: info.width,
            height: info.height,
            channels: 4,
        },
    })
        .png()
        .toFile(outputPath);

    return removedPixels;
}

async function processDirectory(dir) {
    console.log(`\n处理目录: ${dir}`);

    try {
        const files = await readdir(dir);
        const pngFiles = files.filter((f) => f.endsWith('.png'));

        for (const file of pngFiles) {
            const inputPath = join(dir, file);
            const tempPath = join(dir, `_temp_${file}`);

            const removed = await removeCheckerBackground(inputPath, tempPath);

            // 替换原文件
            const { rename, unlink } = await import('fs/promises');
            await unlink(inputPath);
            await rename(tempPath, inputPath);

            console.log(`  ${file}: 移除 ${removed} 个棋盘格像素`);
        }
    } catch (e) {
        console.error(`  错误: ${e.message}`);
    }
}

async function main() {
    console.log('=== 移除棋盘格背景 ===');

    const dirs = [
        'assets/player/idle',
        'assets/player/run',
        'assets/player/jump',
        'assets/player/attack',
        'assets/enemy/idle',
        'assets/enemy/walk',
        'assets/enemy/attack',
    ];

    for (const dir of dirs) {
        await processDirectory(dir);
    }

    console.log('\n=== 完成 ===');
}

main().catch(console.error);
