/**
 * 精确切割脚本 V4
 * 检测白色边框分隔的帧区域并提取
 */
import sharp from 'sharp';
import { mkdir, copyFile } from 'fs/promises';

const artifactDir =
    '/Users/shark_kuaishou/.gemini/antigravity/brain/d83e684e-fa25-4fca-b913-3afb26d31fae';

// 输出帧尺寸
const OUTPUT_SIZE = 96;

// 棋盘格颜色范围
function isCheckerOrBorder(r, g, b) {
    // 灰色棋盘格
    const isGray =
        Math.abs(r - g) < 15 && Math.abs(g - b) < 15 && r > 120 && r < 230;
    // 白色边框
    const isWhite = r > 240 && g > 240 && b > 240;
    // 黑色边框
    const isBlack = r < 15 && g < 15 && b < 15;
    return isGray || isWhite || isBlack;
}

/**
 * 找到图片中每一帧的边界（基于白色边框分隔）
 */
async function findFrameBounds(imagePath, expectedFrames) {
    const { data, info } = await sharp(imagePath)
        .raw()
        .ensureAlpha()
        .toBuffer({ resolveWithObject: true });
    const { width, height } = info;

    console.log(`  图片尺寸: ${width}x${height}`);

    // 扫描每列，找到非背景内容的区域
    const columnHasContent = [];
    for (let x = 0; x < width; x++) {
        let hasContent = false;
        for (let y = 0; y < height && !hasContent; y++) {
            const idx = (y * width + x) * 4;
            const r = data[idx],
                g = data[idx + 1],
                b = data[idx + 2],
                a = data[idx + 3];
            if (a > 50 && !isCheckerOrBorder(r, g, b)) {
                hasContent = true;
            }
        }
        columnHasContent.push(hasContent);
    }

    // 找到内容块（帧）
    const frames = [];
    let inContent = false;
    let startX = 0;

    for (let x = 0; x < width; x++) {
        if (columnHasContent[x] && !inContent) {
            inContent = true;
            startX = x;
        } else if (!columnHasContent[x] && inContent) {
            inContent = false;
            const endX = x - 1;
            if (endX - startX > 20) {
                // 忽略太窄的区域
                frames.push({ startX, endX, width: endX - startX + 1 });
            }
        }
    }
    if (inContent) {
        const endX = width - 1;
        if (endX - startX > 20) {
            frames.push({ startX, endX, width: endX - startX + 1 });
        }
    }

    console.log(`  检测到 ${frames.length} 个帧区域`);

    // 如果检测帧数不匹配，使用均等分割
    if (frames.length !== expectedFrames) {
        console.log(`  帧数不匹配，使用均等分割`);
        const frameWidth = Math.floor(width / expectedFrames);
        frames.length = 0;
        for (let i = 0; i < expectedFrames; i++) {
            frames.push({
                startX: i * frameWidth,
                endX: (i + 1) * frameWidth - 1,
                width: frameWidth,
            });
        }
    }

    // 找到垂直内容边界
    let minY = height,
        maxY = 0;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const r = data[idx],
                g = data[idx + 1],
                b = data[idx + 2],
                a = data[idx + 3];
            if (a > 50 && !isCheckerOrBorder(r, g, b)) {
                minY = Math.min(minY, y);
                maxY = Math.max(maxY, y);
            }
        }
    }

    const contentHeight = maxY - minY + 1;
    console.log(`  内容垂直范围: y[${minY}-${maxY}], 高度=${contentHeight}`);

    return { frames, minY, maxY, contentHeight };
}

/**
 * 移除棋盘格背景
 */
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
        if (isCheckerOrBorder(r, g, b)) {
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
 * 切割精灵表
 */
async function splitSheet(inputPath, outputDir, expectedFrames) {
    console.log(`\n处理: ${inputPath}`);
    await mkdir(outputDir, { recursive: true });

    const { frames, minY, contentHeight } = await findFrameBounds(
        inputPath,
        expectedFrames,
    );

    for (let i = 0; i < Math.min(frames.length, expectedFrames); i++) {
        const frame = frames[i];

        // 提取帧区域
        let buffer = await sharp(inputPath)
            .extract({
                left: frame.startX,
                top: minY,
                width: frame.width,
                height: contentHeight,
            })
            .toBuffer();

        // 移除棋盘格
        buffer = await removeChecker(buffer);

        // 缩放并居中到统一尺寸
        await sharp(buffer)
            .resize(OUTPUT_SIZE, OUTPUT_SIZE, {
                fit: 'contain',
                background: { r: 0, g: 0, b: 0, alpha: 0 },
            })
            .png()
            .toFile(`${outputDir}/${i}.png`);

        console.log(
            `  帧 ${i}: ${frame.startX}-${frame.endX} -> ${outputDir}/${i}.png`,
        );
    }
}

async function main() {
    console.log('=== 精确切割 V4 ===');
    console.log(`输出尺寸: ${OUTPUT_SIZE}x${OUTPUT_SIZE}`);

    // 玩家素材
    await splitSheet(
        `${artifactDir}/player_idle_unified_1769767640514.png`,
        'assets/player/idle',
        6,
    );

    await splitSheet(
        `${artifactDir}/player_run_unified_1769767667967.png`,
        'assets/player/run',
        6,
    );

    // 敌人素材
    await splitSheet(
        `${artifactDir}/skeleton_idle_sprite_1769764076094.png`,
        'assets/enemy/idle',
        4,
    );

    await splitSheet(
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
