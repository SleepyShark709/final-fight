/**
 * 游戏性能监控器
 * 监控FPS、内存使用、渲染性能等关键指标
 */

export interface PerformanceMetrics {
  fps: {
    current: number;
    average: number;
    min: number;
    max: number;
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  renderTime: {
    current: number;
    average: number;
    max: number;
  };
  updateTime: {
    current: number;
    average: number;
    max: number;
  };
  frameDrops: number;
  totalFrames: number;
}

export interface PerformanceAlert {
  type: 'fps_drop' | 'memory_high' | 'render_slow' | 'update_slow';
  message: string;
  value: number;
  threshold: number;
  timestamp: number;
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor | null = null;

  // 性能阈值配置
  private thresholds = {
    minFps: 24,           // 最低FPS阈值
    maxRenderTime: 16,    // 最大渲染时间(ms)，60fps = 16.67ms per frame
    maxUpdateTime: 8,     // 最大更新时间(ms)
    maxMemoryUsage: 0.8   // 最大内存使用率(80%)
  };

  // 监控数据
  private metrics: PerformanceMetrics = {
    fps: { current: 0, average: 0, min: Infinity, max: 0 },
    memory: { used: 0, total: 0, percentage: 0 },
    renderTime: { current: 0, average: 0, max: 0 },
    updateTime: { current: 0, average: 0, max: 0 },
    frameDrops: 0,
    totalFrames: 0
  };

  // 历史数据（用于计算平均值）
  private fpsHistory: number[] = [];
  private renderTimeHistory: number[] = [];
  private updateTimeHistory: number[] = [];
  private historySize = 60; // 保持60帧的历史记录

  // 时间测量
  private lastFrameTime = 0;
  private renderStartTime = 0;
  private updateStartTime = 0;

  // 警报和回调
  private alerts: PerformanceAlert[] = [];
  private maxAlerts = 20;

  onAlert?: (alert: PerformanceAlert) => void;
  onMetricsUpdate?: (metrics: PerformanceMetrics) => void;

  private constructor() {
    this.startMonitoring();
  }

  /**
   * 获取单例实例
   */
  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * 开始性能监控
   */
  private startMonitoring(): void {
    this.lastFrameTime = performance.now();

    // 定期更新内存信息
    setInterval(() => {
      this.updateMemoryMetrics();
    }, 1000); // 每秒更新一次内存信息
  }

  /**
   * 帧开始时调用
   */
  frameStart(): void {
    const now = performance.now();

    // 计算FPS
    if (this.lastFrameTime > 0) {
      const deltaTime = now - this.lastFrameTime;
      const fps = 1000 / deltaTime;
      this.updateFPS(fps);
    }

    this.lastFrameTime = now;
    this.metrics.totalFrames++;
  }

  /**
   * 更新开始时调用
   */
  updateStart(): void {
    this.updateStartTime = performance.now();
  }

  /**
   * 更新结束时调用
   */
  updateEnd(): void {
    if (this.updateStartTime > 0) {
      const updateTime = performance.now() - this.updateStartTime;
      this.updateUpdateTime(updateTime);

      // 检查更新时间警报
      if (updateTime > this.thresholds.maxUpdateTime) {
        this.addAlert('update_slow', `Update time too high: ${updateTime.toFixed(2)}ms`,
                     updateTime, this.thresholds.maxUpdateTime);
      }
    }
  }

  /**
   * 渲染开始时调用
   */
  renderStart(): void {
    this.renderStartTime = performance.now();
  }

  /**
   * 渲染结束时调用
   */
  renderEnd(): void {
    if (this.renderStartTime > 0) {
      const renderTime = performance.now() - this.renderStartTime;
      this.updateRenderTime(renderTime);

      // 检查渲染时间警报
      if (renderTime > this.thresholds.maxRenderTime) {
        this.addAlert('render_slow', `Render time too high: ${renderTime.toFixed(2)}ms`,
                     renderTime, this.thresholds.maxRenderTime);
      }
    }
  }

  /**
   * 更新FPS指标
   */
  private updateFPS(fps: number): void {
    this.metrics.fps.current = fps;

    // 更新最小值和最大值
    this.metrics.fps.min = Math.min(this.metrics.fps.min, fps);
    this.metrics.fps.max = Math.max(this.metrics.fps.max, fps);

    // 更新历史记录
    this.fpsHistory.push(fps);
    if (this.fpsHistory.length > this.historySize) {
      this.fpsHistory.shift();
    }

    // 计算平均值
    this.metrics.fps.average = this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length;

    // 检查FPS警报
    if (fps < this.thresholds.minFps) {
      this.metrics.frameDrops++;
      this.addAlert('fps_drop', `FPS dropped below threshold: ${fps.toFixed(1)}`,
                   fps, this.thresholds.minFps);
    }
  }

  /**
   * 更新渲染时间指标
   */
  private updateRenderTime(time: number): void {
    this.metrics.renderTime.current = time;
    this.metrics.renderTime.max = Math.max(this.metrics.renderTime.max, time);

    this.renderTimeHistory.push(time);
    if (this.renderTimeHistory.length > this.historySize) {
      this.renderTimeHistory.shift();
    }

    this.metrics.renderTime.average =
      this.renderTimeHistory.reduce((a, b) => a + b, 0) / this.renderTimeHistory.length;
  }

  /**
   * 更新更新时间指标
   */
  private updateUpdateTime(time: number): void {
    this.metrics.updateTime.current = time;
    this.metrics.updateTime.max = Math.max(this.metrics.updateTime.max, time);

    this.updateTimeHistory.push(time);
    if (this.updateTimeHistory.length > this.historySize) {
      this.updateTimeHistory.shift();
    }

    this.metrics.updateTime.average =
      this.updateTimeHistory.reduce((a, b) => a + b, 0) / this.updateTimeHistory.length;
  }

  /**
   * 更新内存指标
   */
  private updateMemoryMetrics(): void {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      this.metrics.memory.used = memory.usedJSHeapSize;
      this.metrics.memory.total = memory.totalJSHeapSize;
      this.metrics.memory.percentage = memory.usedJSHeapSize / memory.totalJSHeapSize;

      // 检查内存使用警报
      if (this.metrics.memory.percentage > this.thresholds.maxMemoryUsage) {
        this.addAlert('memory_high',
                     `Memory usage too high: ${(this.metrics.memory.percentage * 100).toFixed(1)}%`,
                     this.metrics.memory.percentage, this.thresholds.maxMemoryUsage);
      }
    }

    // 触发指标更新回调
    this.onMetricsUpdate?.(this.getMetrics());
  }

  /**
   * 添加性能警报
   */
  private addAlert(type: PerformanceAlert['type'], message: string, value: number, threshold: number): void {
    const alert: PerformanceAlert = {
      type,
      message,
      value,
      threshold,
      timestamp: Date.now()
    };

    this.alerts.push(alert);

    // 限制警报历史长度
    if (this.alerts.length > this.maxAlerts) {
      this.alerts = this.alerts.slice(-this.maxAlerts);
    }

    // 触发警报回调
    this.onAlert?.(alert);
  }

  /**
   * 获取当前性能指标
   */
  getMetrics(): PerformanceMetrics {
    return JSON.parse(JSON.stringify(this.metrics));
  }

  /**
   * 获取性能警报历史
   */
  getAlerts(): PerformanceAlert[] {
    return [...this.alerts];
  }

  /**
   * 清除警报历史
   */
  clearAlerts(): void {
    this.alerts = [];
  }

  /**
   * 重置性能统计
   */
  resetStats(): void {
    this.metrics.fps.min = Infinity;
    this.metrics.fps.max = 0;
    this.metrics.renderTime.max = 0;
    this.metrics.updateTime.max = 0;
    this.metrics.frameDrops = 0;
    this.metrics.totalFrames = 0;

    this.fpsHistory = [];
    this.renderTimeHistory = [];
    this.updateTimeHistory = [];
    this.alerts = [];
  }

  /**
   * 获取性能等级
   */
  getPerformanceGrade(): 'excellent' | 'good' | 'fair' | 'poor' {
    const avgFps = this.metrics.fps.average;
    const avgRenderTime = this.metrics.renderTime.average;
    const memoryUsage = this.metrics.memory.percentage;

    // 优秀：高FPS，低渲染时间，低内存使用
    if (avgFps >= 50 && avgRenderTime <= 10 && memoryUsage <= 0.6) {
      return 'excellent';
    }

    // 良好：中等FPS，正常渲染时间
    if (avgFps >= 30 && avgRenderTime <= 16 && memoryUsage <= 0.8) {
      return 'good';
    }

    // 一般：低FPS或高渲染时间
    if (avgFps >= 20 && avgRenderTime <= 25 && memoryUsage <= 0.9) {
      return 'fair';
    }

    // 差：严重性能问题
    return 'poor';
  }

  /**
   * 获取性能建议
   */
  getPerformanceSuggestions(): string[] {
    const suggestions: string[] = [];
    const grade = this.getPerformanceGrade();

    if (this.metrics.fps.average < 30) {
      suggestions.push('Consider reducing visual effects or lowering render quality');
    }

    if (this.metrics.renderTime.average > 16) {
      suggestions.push('Optimize rendering pipeline or reduce draw calls');
    }

    if (this.metrics.updateTime.average > 8) {
      suggestions.push('Optimize game logic or reduce update frequency');
    }

    if (this.metrics.memory.percentage > 0.8) {
      suggestions.push('Reduce memory usage or implement garbage collection');
    }

    if (this.metrics.frameDrops > this.metrics.totalFrames * 0.1) {
      suggestions.push('Too many frame drops detected, consider performance optimizations');
    }

    if (grade === 'excellent' && suggestions.length === 0) {
      suggestions.push('Performance is excellent! No optimizations needed.');
    }

    return suggestions;
  }

  /**
   * 更新性能阈值配置
   */
  updateThresholds(newThresholds: Partial<typeof this.thresholds>): void {
    this.thresholds = { ...this.thresholds, ...newThresholds };
  }

  /**
   * 获取当前阈值配置
   */
  getThresholds(): typeof this.thresholds {
    return { ...this.thresholds };
  }
}

/**
 * 全局性能监控器实例
 */
export const performanceMonitor = PerformanceMonitor.getInstance();
