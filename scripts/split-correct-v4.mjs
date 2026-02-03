/**
 * 修复的精灵切割脚本 V4
 * 使用中心向外扫描法 (Center-Out Scanning)
 * 解决上下边缘噪点导致裁切区域过大的问题
 */
import sharp from 'sharp';
import { mkdir } from 'fs/promises';

const artifactDir =
    '/Users/shark_kuaishou/.gemini/antigravity/brain/d83e684e-fa25-4fca-b913-3afb26d31fae';

// 棋盘格颜色检测（宽范围）
function isCheckerColor(r, g, b) {
    const isGray =
        Math.abs(r - g) < 20 && Math.abs(g - b) < 20 && r > 70 && r < 250;
    const isWhite = r > 240 && g > 240 && b > 240;
    return isGray || isWhite;
}

// 移除棋盘格
async function removeCheckerAndGetData(buffer) {
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
            newData[i] = 0;
            newData[i + 1] = 0;
            newData[i + 2] = 0;
            newData[i + 3] = 0;
        } else {
            newData[i] = r;
            newData[i + 1] = g;
            newData[i + 2] = b;
            newData[i + 3] = a;
        }
    }
    return { data: newData, width: info.width, height: info.height };
}

/**
 * 改进的边界检测：从中心向外扫描
 */
function findContentBounds(data, width, height) {
    const centerX = Math.floor(width / 2);
    const centerY = Math.floor(height / 2);

    // 辅助函数：检查某一行是否有内容
    const rowHasContent = (y) => {
        for (let x = 0; x < width; x++) {
            if (data[(y * width + x) * 4 + 3] > 0) return true;
        }
        return false;
    };

    // 辅助函数：检查某一列是否有内容
    const colHasContent = (x) => {
        for (let y = 0; y < height; y++) {
            if (data[(y * width + x) * 4 + 3] > 0) return true;
        }
        return false;
    };

    // 1. 垂直扫描：从中心向上和向下寻找边界

    // 如果中心行本身是空的，这可能意味着角色偏离中心，或者这帧真的是空的
    // 为了保险，我们还是先全图扫描找到任何有内容的一行作为起点
    let seedY = -1;
    if (rowHasContent(centerY)) {
        seedY = centerY;
    } else {
        // 搜索最近的有内容行
        for (let d = 1; d < height / 2; d++) {
            if (rowHasContent(centerY + d)) {
                seedY = centerY + d;
                break;
            }
            if (rowHasContent(centerY - d)) {
                seedY = centerY - d;
                break;
            }
        }
    }

    if (seedY === -1) return null; // 全空

    // 向上找上边界
    let minY = 0;
    for (let y = seedY; y >= 0; y--) {
        if (!rowHasContent(y)) {
            // 发现空行，继续检查几行确认不是断裂
            let isEmptyArea = true;
            for (let check = 1; check <= 5 && y - check >= 0; check++) {
                if (rowHasContent(y - check)) {
                    isEmptyArea = false;
                    break;
                }
            }
            if (isEmptyArea) {
                minY = y + 1;
                break;
            }
        }
    }

    // 向下找下边界
    let maxY = height - 1;
    for (let y = seedY; y < height; y++) {
        if (!rowHasContent(y)) {
            let isEmptyArea = true;
            for (let check = 1; check <= 5 && y + check < height; check++) {
                if (rowHasContent(y + check)) {
                    isEmptyArea = false;
                    break;
                }
            }
            if (isEmptyArea) {
                maxY = y - 1;
                break;
            }
        }
    }

    // 2. 水平扫描：在 [minY, maxY] 范围内找左右边界
    let minX = width;
    let maxX = 0;

    // 只扫描有内容的垂直区域
    for (let y = minY; y <= maxY; y++) {
        for (let x = 0; x < width; x++) {
            if (data[(y * width + x) * 4 + 3] > 0) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
            }
        }
    }

    if (maxX < minX) return null;

    return { minX, maxX, minY, maxY };
}

async function processSheet(inputPath, outputDir, frameCount, outputSize) {
    console.log(`\n处理: ${inputPath}`);
    await mkdir(outputDir, { recursive: true });

    const meta = await sharp(inputPath).metadata();
    const frameWidth = Math.floor(meta.width / frameCount);

    for (let i = 0; i < frameCount; i++) {
        const frameBuffer = await sharp(inputPath)
            .extract({
                left: i * frameWidth,
                top: 0,
                width: frameWidth,
                height: meta.height,
            })
            .toBuffer();

        const processed = await removeCheckerAndGetData(frameBuffer);
        const bounds = findContentBounds(
            processed.data,
            processed.width,
            processed.height,
        );

        if (!bounds) {
            console.log(`  帧 ${i}: 空帧 (Center-out scan)`);
            continue;
        }

        const contentWidth = bounds.maxX - bounds.minX + 1;
        const contentHeight = bounds.maxY - bounds.minY + 1;

        const cleanBuffer = await sharp(processed.data, {
            raw: {
                width: processed.width,
                height: processed.height,
                channels: 4,
            },
        })
            .png()
            .toBuffer();

        const croppedBuffer = await sharp(cleanBuffer)
            .extract({
                left: bounds.minX,
                top: bounds.minY,
                width: contentWidth,
                height: contentHeight,
            })
            .toBuffer();

        await sharp(croppedBuffer)
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
    console.log('=== 修复的精灵切割 V4 (Center-Out) ===');

    const enemySize = 200;
    const playerSize = 128;

    // 只需要重跑玩家 idle，但为了统一全部跑一遍
    // Skip enemy as they are perfect
    console.log('跳过已完美的敌人素材...');

    await processSheet(
        `${artifactDir}/player_idle_sprite_1769763969108.png`,
        'assets/player/idle',
        6,
        playerSize,
    );

    // Run 已经很好，但也跑一遍以防万一
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
