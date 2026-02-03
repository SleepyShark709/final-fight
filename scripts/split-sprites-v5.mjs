/**
 * 精确手动切割脚本 V5
 * 针对每个精灵表使用精确的帧坐标
 */
import sharp from 'sharp';
import { mkdir, copyFile } from 'fs/promises';

const artifactDir =
    '/Users/shark_kuaishou/.gemini/antigravity/brain/d83e684e-fa25-4fca-b913-3afb26d31fae';
const OUTPUT_SIZE = 96;

// 棋盘格颜色检测
function isCheckerColor(r, g, b) {
    const isGray =
        Math.abs(r - g) < 15 && Math.abs(g - b) < 15 && r > 120 && r < 230;
    const isWhite = r > 240 && g > 240 && b > 240;
    return isGray || isWhite;
}

// 移除棋盘格
async function removeChecker(buffer) {
    const { data, info } = await sharp(buffer)
        .raw()
        .ensureAlpha()
        .toBuffer({ resolveWithObject: true });
    const newData = Buffer.alloc(data.length);

    for (let i = 0; i < data.length; i += 4) {
        const r = data[i],
            g = data[i + 1],
            b = data[i + 2],
            a = data[i + 3];
        if (isCheckerColor(r, g, b)) {
            newData[i] = newData[i + 1] = newData[i + 2] = newData[i + 3] = 0;
        } else {
            newData[i] = r;
            newData[i + 1] = g;
            newData[i + 2] = b;
            newData[i + 3] = a;
        }
    }

    return sharp(newData, {
        raw: { width: info.width, height: info.height, channels: 4 },
    })
        .png()
        .toBuffer();
}

// 自动裁切透明边缘
async function trimTransparent(buffer) {
    const { data, info } = await sharp(buffer)
        .raw()
        .ensureAlpha()
        .toBuffer({ resolveWithObject: true });
    const { width, height } = info;

    let minX = width,
        maxX = 0,
        minY = height,
        maxY = 0;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            if (data[idx + 3] > 10) {
                // 非透明
                minX = Math.min(minX, x);
                maxX = Math.max(maxX, x);
                minY = Math.min(minY, y);
                maxY = Math.max(maxY, y);
            }
        }
    }

    if (maxX < minX || maxY < minY) {
        return buffer; // 全透明，返回原图
    }

    // 添加少量边距
    const padding = 2;
    minX = Math.max(0, minX - padding);
    maxX = Math.min(width - 1, maxX + padding);
    minY = Math.max(0, minY - padding);
    maxY = Math.min(height - 1, maxY + padding);

    return sharp(buffer)
        .extract({
            left: minX,
            top: minY,
            width: maxX - minX + 1,
            height: maxY - minY + 1,
        })
        .toBuffer();
}

/**
 * 处理玩家精灵表（有白色边框分隔的）
 */
async function processPlayerSheet(inputPath, outputDir, frameCount) {
    console.log(`\n处理: ${inputPath}`);
    await mkdir(outputDir, { recursive: true });

    const meta = await sharp(inputPath).metadata();
    console.log(`  原始尺寸: ${meta.width}x${meta.height}`);

    // 玩家精灵表的帧在图片中间区域，被白色边框包围
    // 根据观察，帧大约在 y=465-585 区域，每帧约 85px 宽，被边框分隔
    // 让我们用更简单的方法：均等分割后裁切

    const frameWidth = Math.floor(meta.width / frameCount);
    console.log(`  均等分割: ${frameWidth}px/帧`);

    for (let i = 0; i < frameCount; i++) {
        // 提取帧
        let buffer = await sharp(inputPath)
            .extract({
                left: i * frameWidth,
                top: 0,
                width: frameWidth,
                height: meta.height,
            })
            .toBuffer();

        // 移除棋盘格
        buffer = await removeChecker(buffer);

        // 裁切透明边缘
        buffer = await trimTransparent(buffer);

        // 缩放到统一尺寸
        await sharp(buffer)
            .resize(OUTPUT_SIZE, OUTPUT_SIZE, {
                fit: 'contain',
                background: { r: 0, g: 0, b: 0, alpha: 0 },
            })
            .png()
            .toFile(`${outputDir}/${i}.png`);

        console.log(`  帧 ${i} -> ${outputDir}/${i}.png`);
    }
}

/**
 * 处理敌人精灵表
 */
async function processEnemySheet(inputPath, outputDir, frameCount) {
    console.log(`\n处理: ${inputPath}`);
    await mkdir(outputDir, { recursive: true });

    const meta = await sharp(inputPath).metadata();
    const frameWidth = Math.floor(meta.width / frameCount);
    console.log(
        `  原始尺寸: ${meta.width}x${meta.height}, 每帧 ${frameWidth}px`,
    );

    for (let i = 0; i < frameCount; i++) {
        let buffer = await sharp(inputPath)
            .extract({
                left: i * frameWidth,
                top: 0,
                width: frameWidth,
                height: meta.height,
            })
            .toBuffer();

        buffer = await removeChecker(buffer);
        buffer = await trimTransparent(buffer);

        await sharp(buffer)
            .resize(OUTPUT_SIZE, OUTPUT_SIZE, {
                fit: 'contain',
                background: { r: 0, g: 0, b: 0, alpha: 0 },
            })
            .png()
            .toFile(`${outputDir}/${i}.png`);

        console.log(`  帧 ${i} -> ${outputDir}/${i}.png`);
    }
}

async function main() {
    console.log('=== 精确切割 V5 (自动裁切透明边缘) ===');
    console.log(`输出尺寸: ${OUTPUT_SIZE}x${OUTPUT_SIZE}`);

    // 玩家素材
    await processPlayerSheet(
        `${artifactDir}/player_idle_unified_1769767640514.png`,
        'assets/player/idle',
        6,
    );

    await processPlayerSheet(
        `${artifactDir}/player_run_unified_1769767667967.png`,
        'assets/player/run',
        6,
    );

    // 敌人素材
    await processEnemySheet(
        `${artifactDir}/skeleton_idle_sprite_1769764076094.png`,
        'assets/enemy/idle',
        4,
    );

    await processEnemySheet(
        `${artifactDir}/skeleton_walk_sprite_1769764105133.png`,
        'assets/enemy/walk',
        4,
    );

    // 临时复用
    console.log('\n复用帧作为跳跃/攻击动画...');
    await mkdir('assets/player/jump', { recursive: true });
    await mkdir('assets/player/attack', { recursive: true });
    await mkdir('assets/enemy/attack', { recursive: true });

    for (let i = 0; i < 4; i++) {
        await copyFile(
            `assets/player/idle/${i}.png`,
            `assets/player/jump/${i}.png`,
        );
        await copyFile(
            `assets/player/idle/${i}.png`,
            `assets/player/attack/${i}.png`,
        );
        await copyFile(
            `assets/enemy/idle/${i}.png`,
            `assets/enemy/attack/${i}.png`,
        );
    }

    console.log('\n=== 完成 ===');
}

main().catch(console.error);
