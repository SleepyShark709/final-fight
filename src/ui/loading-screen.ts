import { IGame, LoadProgress } from '@/types/index';

/**
 * 游戏加载屏幕
 * 显示资源加载进度和状态
 */
export class LoadingScreen {
  // private game: IGame; // 暂时注释掉未使用的属性
  private canvas: HTMLCanvasElement;
  private context: CanvasRenderingContext2D;
  private isVisible: boolean = false;
  
  constructor(game: IGame) {
    // this.game = game; // 暂时注释掉
    this.canvas = game.canvas;
    this.context = game.context;
  }
  
  /**
   * 显示加载屏幕
   */
  show(): void {
    this.isVisible = true;
  }
  
  /**
   * 隐藏加载屏幕
   */
  hide(): void {
    this.isVisible = false;
  }
  
  /**
   * 更新并绘制加载屏幕
   */
  draw(progress: LoadProgress, currentResource?: string): void {
    if (!this.isVisible) return;
    
    const ctx = this.context;
    const width = this.canvas.width;
    const height = this.canvas.height;
    
    // 清空画布
    ctx.clearRect(0, 0, width, height);
    
    // 绘制背景
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, width, height);
    
    // 绘制标题
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Final Fight', width / 2, height / 2 - 100);
    
    // 绘制副标题
    ctx.font = '24px Arial';
    ctx.fillStyle = '#cccccc';
    ctx.fillText('Loading Game Assets...', width / 2, height / 2 - 50);
    
    // 绘制进度条背景
    const barWidth = 400;
    const barHeight = 20;
    const barX = (width - barWidth) / 2;
    const barY = height / 2;
    
    ctx.fillStyle = '#333333';
    ctx.fillRect(barX, barY, barWidth, barHeight);
    
    // 绘制进度条
    const progressWidth = barWidth * progress.progress;
    ctx.fillStyle = '#4CAF50';
    ctx.fillRect(barX, barY, progressWidth, barHeight);
    
    // 绘制进度条边框
    ctx.strokeStyle = '#555555';
    ctx.lineWidth = 2;
    ctx.strokeRect(barX, barY, barWidth, barHeight);
    
    // 绘制进度百分比
    ctx.fillStyle = '#ffffff';
    ctx.font = '18px Arial';
    const percentText = `${Math.round(progress.progress * 100)}%`;
    ctx.fillText(percentText, width / 2, barY + barHeight + 30);
    
    // 绘制进度详情
    ctx.font = '14px Arial';
    ctx.fillStyle = '#aaaaaa';
    const detailText = `${progress.loaded} / ${progress.total} assets loaded`;
    ctx.fillText(detailText, width / 2, barY + barHeight + 55);
    
    // 绘制当前加载的资源名称
    if (currentResource) {
      ctx.font = '12px Arial';
      ctx.fillStyle = '#888888';
      ctx.fillText(`Loading: ${currentResource}`, width / 2, barY + barHeight + 80);
    }
    
    // 绘制加载提示
    this.drawLoadingIndicator(width / 2, height - 50);
  }
  
  /**
   * 绘制加载指示器（旋转的点）
   */
  private drawLoadingIndicator(x: number, y: number): void {
    const ctx = this.context;
    const time = Date.now() / 100;
    const radius = 15;
    
    // 绘制旋转的加载点
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + time;
      const dotX = x + Math.cos(angle) * radius;
      const dotY = y + Math.sin(angle) * radius;
      
      // 计算透明度（根据角度变化）
      const alpha = 0.3 + 0.7 * Math.sin(time - i * 0.5);
      
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(dotX, dotY, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  
  /**
   * 绘制错误信息
   */
  drawError(error: string): void {
    if (!this.isVisible) return;
    
    const ctx = this.context;
    const width = this.canvas.width;
    const height = this.canvas.height;
    
    // 清空画布
    ctx.clearRect(0, 0, width, height);
    
    // 绘制背景
    ctx.fillStyle = '#2d1b1b';
    ctx.fillRect(0, 0, width, height);
    
    // 绘制错误标题
    ctx.fillStyle = '#ff4444';
    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Loading Failed', width / 2, height / 2 - 50);
    
    // 绘制错误信息
    ctx.font = '18px Arial';
    ctx.fillStyle = '#ffcccc';
    
    // 分行显示错误信息
    const words = error.split(' ');
    const lines: string[] = [];
    let currentLine = '';
    
    for (const word of words) {
      const testLine = currentLine + word + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > 500 && currentLine !== '') {
        lines.push(currentLine);
        currentLine = word + ' ';
      } else {
        currentLine = testLine;
      }
    }
    lines.push(currentLine);
    
    lines.forEach((line, index) => {
      ctx.fillText(line, width / 2, height / 2 + 20 + (index * 25));
    });
    
    // 绘制重试提示
    ctx.font = '14px Arial';
    ctx.fillStyle = '#aaaaaa';
    ctx.fillText('Please refresh the page to try again', width / 2, height - 30);
  }
  
  /**
   * 检查是否可见
   */
  get visible(): boolean {
    return this.isVisible;
  }
}