/**
 * 智能精灵切割脚本 V3
 * 检测素材中的有效区域并切割，移除透明区域
 */
import sharp from 'sharp';
import { mkdir } from 'fs/promises';

const artifactDir =
    '/Users/shark_kuaishou/.gemini/antigravity/brain/d83e684e-fa25-4fca-b913-3afb26d31fae';

// 统一帧尺寸 (用于最终输出)
const UNIFIED_FRAME_WIDTH = 96;
const UNIFIED_FRAME_HEIGHT = 96;

/**
 * 裁剪图片的透明边缘，获取内容边界
 */
async function getContentBounds(imagePath) {
    const image = sharp(imagePath);
    const { data, info } = await image
        .raw()
        .ensureAlpha()
        .toBuffer({ resolveWithObject: true });

    let minX = info.width,
        maxX = 0;
    let minY = info.height,
        maxY = 0;

    // 扫描找到非透明像素的边界
    for (let y = 0; y < info.height; y++) {
        for (let x = 0; x < info.width; x++) {
            const idx = (y * info.width + x) * 4;
            const alpha = data[idx + 3];
            if (alpha > 10) {
                // 非透明
                minX = Math.min(minX, x);
                maxX = Math.max(maxX, x);
                minY = Math.min(minY, y);
                maxY = Math.max(maxY, y);
            }
        }
    }

    return { minX, maxX, minY, maxY, width: info.width, height: info.height };
}

/**
 * 分析精灵表，自动检测帧数和布局
 */
async function analyzeSheet(imagePath, expectedFrames) {
    const meta = await sharp(imagePath).metadata();
    console.log(`  原始尺寸: ${meta.width}x${meta.height}`);

    // 获取内容边界
    const bounds = await getContentBounds(imagePath);
    console.log(
        `  内容边界: x[${bounds.minX}-${bounds.maxX}], y[${bounds.minY}-${bounds.maxY}]`,
    );

    const contentWidth = bounds.maxX - bounds.minX + 1;
    const contentHeight = bounds.maxY - bounds.minY + 1;
    console.log(`  内容尺寸: ${contentWidth}x${contentHeight}`);

    // 假设水平排列，计算每帧宽度
    const frameWidth = Math.floor(contentWidth / expectedFrames);
    const frameHeight = contentHeight;

    console.log(
        `  每帧尺寸: ${frameWidth}x${frameHeight} (共 ${expectedFrames} 帧)`,
    );

    return {
        bounds,
        frameWidth,
        frameHeight,
        totalFrames: expectedFrames,
    };
}

/**
 * 切割精灵表并统一输出尺寸
 */
async function splitSheet(inputPath, outputDir, expectedFrames) {
    console.log(`\n处理: ${inputPath}`);
    await mkdir(outputDir, { recursive: true });

    const analysis = await analyzeSheet(inputPath, expectedFrames);
    const { bounds, frameWidth, frameHeight, totalFrames } = analysis;

    for (let i = 0; i < totalFrames; i++) {
        const left = bounds.minX + i * frameWidth;
        const top = bounds.minY;

        // 提取帧
        const frameBuffer = await sharp(inputPath)
            .extract({
                left: Math.floor(left),
                top: Math.floor(top),
                width: Math.floor(frameWidth),
                height: Math.floor(frameHeight),
            })
            .toBuffer();

        // 调整到统一尺寸，保持宽高比，居中放置
        await sharp(frameBuffer)
            .resize(UNIFIED_FRAME_WIDTH, UNIFIED_FRAME_HEIGHT, {
                fit: 'contain',
                background: { r: 0, g: 0, b: 0, alpha: 0 },
            })
            .png()
            .toFile(`${outputDir}/${i}.png`);

        console.log(`  帧 ${i} -> ${outputDir}/${i}.png`);
    }
}

async function main() {
    console.log('=== 智能精灵切割 V3 ===');
    console.log(`统一输出尺寸: ${UNIFIED_FRAME_WIDTH}x${UNIFIED_FRAME_HEIGHT}`);

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

    // 跳跃和攻击暂时复用待机帧
    console.log('\n复用待机帧作为跳跃和攻击动画（临时）...');
    const { copyFile } = await import('fs/promises');

    await mkdir('assets/player/jump', { recursive: true });
    await mkdir('assets/player/attack', { recursive: true });

    for (let i = 0; i < 4; i++) {
        const src =
            i < 6 ? `assets/player/idle/${i}.png` : `assets/player/idle/0.png`;
        await copyFile(src, `assets/player/jump/${i}.png`);
        await copyFile(src, `assets/player/attack/${i}.png`);
    }

    // 敌人素材 - 使用之前生成的
    console.log('\n处理敌人素材...');
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

    // 敌人攻击暂时复用待机
    await mkdir('assets/enemy/attack', { recursive: true });
    for (let i = 0; i < 4; i++) {
        await copyFile(
            `assets/enemy/idle/${i}.png`,
            `assets/enemy/attack/${i}.png`,
        );
    }

    console.log('\n=== 完成 ===');
}

main().catch(console.error);
