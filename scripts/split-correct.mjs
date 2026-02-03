/**
 * 正确的精灵切割脚本
 * 只切割和移除棋盘格，不改变尺寸
 */
import sharp from 'sharp';
import { mkdir } from 'fs/promises';

const artifactDir =
    '/Users/shark_kuaishou/.gemini/antigravity/brain/d83e684e-fa25-4fca-b913-3afb26d31fae';

// 棋盘格颜色检测
function isCheckerColor(r, g, b) {
    const isGray =
        Math.abs(r - g) < 15 && Math.abs(g - b) < 15 && r > 120 && r < 230;
    const isWhite = r > 240 && g > 240 && b > 240;
    return isGray || isWhite;
}

// 移除棋盘格背景
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

/**
 * 找到内容边界（非透明区域）
 */
async function findContentBounds(buffer) {
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

    return { minX, maxX, minY, maxY };
}

/**
 * 处理精灵表：均等分割，移除棋盘格，保持原始尺寸
 */
async function processSheet(inputPath, outputDir, frameCount, outputSize) {
    console.log(`\n处理: ${inputPath}`);
    console.log(`  输出尺寸: ${outputSize}x${outputSize}`);
    await mkdir(outputDir, { recursive: true });

    const meta = await sharp(inputPath).metadata();
    const frameWidth = Math.floor(meta.width / frameCount);
    console.log(
        `  原始尺寸: ${meta.width}x${meta.height}, 每帧 ${frameWidth}px`,
    );

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

        // 找到内容边界
        const bounds = await findContentBounds(buffer);

        if (bounds.maxX < bounds.minX) {
            console.log(`  帧 ${i}: 空帧，跳过`);
            continue;
        }

        // 裁切到内容区域
        const contentWidth = bounds.maxX - bounds.minX + 1;
        const contentHeight = bounds.maxY - bounds.minY + 1;

        buffer = await sharp(buffer)
            .extract({
                left: bounds.minX,
                top: bounds.minY,
                width: contentWidth,
                height: contentHeight,
            })
            .toBuffer();

        // 调整到输出尺寸，保持宽高比，居中放置
        await sharp(buffer)
            .resize(outputSize, outputSize, {
                fit: 'contain',
                background: { r: 0, g: 0, b: 0, alpha: 0 },
            })
            .png()
            .toFile(`${outputDir}/${i}.png`);

        console.log(
            `  帧 ${i}: ${contentWidth}x${contentHeight} -> ${outputDir}/${i}.png`,
        );
    }
}

async function main() {
    console.log('=== 正确的精灵切割 ===');

    // 敌人：使用原始精灵表，输出 200x200 (保持原始比例)
    const enemySize = 200;
    await processSheet(
        `${artifactDir}/skeleton_idle_sprite_1769764076094.png`,
        'assets/enemy/idle',
        4,
        enemySize,
    );

    await processSheet(
        `${artifactDir}/skeleton_walk_sprite_1769764105133.png`,
        'assets/enemy/walk',
        4,
        enemySize,
    );

    await processSheet(
        `${artifactDir}/skeleton_attack_sprite_1769765767634.png`,
        'assets/enemy/attack',
        4, // 只取前4帧
        enemySize,
    );

    // 玩家：使用原始精灵表，输出 128x128 (保持原始比例)
    const playerSize = 128;
    await processSheet(
        `${artifactDir}/player_idle_sprite_1769763969108.png`,
        'assets/player/idle',
        6,
        playerSize,
    );

    await processSheet(
        `${artifactDir}/player_run_sprite_1769763992726.png`,
        'assets/player/run',
        6,
        playerSize,
    );

    await processSheet(
        `${artifactDir}/player_jump_sprite_1769764014629.png`,
        'assets/player/jump',
        4,
        playerSize,
    );

    await processSheet(
        `${artifactDir}/player_attack_sprite_1769764036681.png`,
        'assets/player/attack',
        4,
        playerSize,
    );

    console.log('\n=== 完成 ===');
}

main().catch(console.error);
