/**
 * 精确精灵切割脚本
 * 根据每个精灵表的实际布局进行切割
 */
import sharp from 'sharp';
import { mkdir } from 'fs/promises';
import { join } from 'path';

/**
 * 根据实际布局定义切割任务
 * 每个 frame 定义为 [left, top, width, height]
 */
const tasks = [
    // 玩家跑步：3x3 网格，取前 6 帧
    {
        name: '玩家跑步',
        input: 'assets/player/run/spritesheet.png',
        outputDir: 'assets/player/run',
        gridCols: 3,
        gridRows: 3,
        frameCount: 6,
    },
    // 玩家跳跃：4帧不规则布局
    // 观察：左下、中上左、中上右、右下
    {
        name: '玩家跳跃',
        input: 'assets/player/jump/spritesheet.png',
        outputDir: 'assets/player/jump',
        customFrames: [
            [0, 350, 256, 300], // 左下角
            [200, 150, 300, 350], // 中上左
            [480, 150, 300, 350], // 中上右
            [750, 350, 256, 300], // 右下角
        ],
    },
    // 玩家攻击：2x2 网格
    {
        name: '玩家攻击',
        input: 'assets/player/attack/spritesheet.png',
        outputDir: 'assets/player/attack',
        gridCols: 2,
        gridRows: 2,
        frameCount: 4,
    },
    // 敌人移动：5个骷髅水平排列，取4帧
    // 骷髅在图片中间偏下
    {
        name: '敌人移动',
        input: 'assets/enemy/walk/spritesheet.png',
        outputDir: 'assets/enemy/walk',
        customFrames: [
            [20, 350, 180, 300], // 第1个
            [220, 350, 180, 300], // 第2个
            [420, 350, 180, 300], // 第3个
            [620, 350, 180, 300], // 第4个
        ],
    },
    // 敌人攻击：6个骷髅水平排列，取4帧
    {
        name: '敌人攻击',
        input: 'assets/enemy/attack/spritesheet.png',
        outputDir: 'assets/enemy/attack',
        customFrames: [
            [20, 300, 160, 350], // 第1个
            [180, 300, 160, 350], // 第2个
            [340, 300, 200, 350], // 第3个（挥剑动作更宽）
            [540, 300, 200, 350], // 第4个
        ],
    },
];

async function splitGridSpritesheet(task) {
    console.log(`\n正在处理: ${task.name}`);

    await mkdir(task.outputDir, { recursive: true });

    const metadata = await sharp(task.input).metadata();
    const frameWidth = Math.floor(metadata.width / task.gridCols);
    const frameHeight = Math.floor(metadata.height / task.gridRows);

    console.log(`  图片尺寸: ${metadata.width}x${metadata.height}`);
    console.log(
        `  网格: ${task.gridCols}x${task.gridRows}, 帧尺寸: ${frameWidth}x${frameHeight}`,
    );

    let frameIndex = 0;

    for (
        let row = 0;
        row < task.gridRows && frameIndex < task.frameCount;
        row++
    ) {
        for (
            let col = 0;
            col < task.gridCols && frameIndex < task.frameCount;
            col++
        ) {
            const left = col * frameWidth;
            const top = row * frameHeight;
            const outputPath = join(task.outputDir, `${frameIndex}.png`);

            await sharp(task.input)
                .extract({ left, top, width: frameWidth, height: frameHeight })
                .png()
                .toFile(outputPath);

            console.log(`  帧 ${frameIndex}: ${outputPath}`);
            frameIndex++;
        }
    }
}

async function splitCustomSpritesheet(task) {
    console.log(`\n正在处理: ${task.name}`);

    await mkdir(task.outputDir, { recursive: true });

    for (let i = 0; i < task.customFrames.length; i++) {
        const [left, top, width, height] = task.customFrames[i];
        const outputPath = join(task.outputDir, `${i}.png`);

        await sharp(task.input)
            .extract({ left, top, width, height })
            .png()
            .toFile(outputPath);

        console.log(
            `  帧 ${i}: ${outputPath} (区域: ${left},${top} ${width}x${height})`,
        );
    }
}

async function main() {
    console.log('开始精确切割精灵表...\n');

    for (const task of tasks) {
        if (task.customFrames) {
            await splitCustomSpritesheet(task);
        } else {
            await splitGridSpritesheet(task);
        }
    }

    console.log('\n全部完成!');
}

main();
