/**
 * 游戏错误处理系统
 * 提供统一的错误捕获、记录和恢复机制
 */

export interface GameError {
  type: 'resource' | 'runtime' | 'physics' | 'render' | 'input' | 'network';
  message: string;
  details?: string;
  timestamp: number;
  stack?: string;
  context?: Record<string, unknown>;
}

export interface ErrorRecoveryStrategy {
  canRecover: (error: GameError) => boolean;
  recover: (error: GameError) => Promise<boolean>;
  fallback: (error: GameError) => void;
}

export class GameErrorHandler {
  private static instance: GameErrorHandler | null = null;
  private errors: GameError[] = [];
  private recoveryStrategies: Map<string, ErrorRecoveryStrategy> = new Map();
  private maxErrorHistory = 50;
  private isRecovering = false;

  // 事件回调
  onError?: (error: GameError) => void;
  onRecovery?: (error: GameError, success: boolean) => void;
  onFatalError?: (error: GameError) => void;

  private constructor() {
    this.setupGlobalErrorHandlers();
    this.setupDefaultRecoveryStrategies();
  }

  /**
   * 获取单例实例
   */
  static getInstance(): GameErrorHandler {
    if (!GameErrorHandler.instance) {
      GameErrorHandler.instance = new GameErrorHandler();
    }
    return GameErrorHandler.instance;
  }

  /**
   * 设置全局错误处理器
   */
  private setupGlobalErrorHandlers(): void {
    // 捕获未处理的JavaScript错误
    window.addEventListener('error', (event) => {
      this.handleError({
        type: 'runtime',
        message: event.message || 'Unknown runtime error',
        details: `${event.filename}:${event.lineno}:${event.colno}`,
        timestamp: Date.now(),
        stack: event.error?.stack,
        context: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        }
      });
    });

    // 捕获Promise拒绝错误
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError({
        type: 'runtime',
        message: 'Unhandled promise rejection',
        details: event.reason?.toString() || 'Unknown promise rejection',
        timestamp: Date.now(),
        stack: event.reason?.stack,
        context: {
          reason: event.reason
        }
      });
    });
  }

  /**
   * 设置默认恢复策略
   */
  private setupDefaultRecoveryStrategies(): void {
    // 资源加载错误恢复策略
    this.addRecoveryStrategy('resource', {
      canRecover: (error) => error.type === 'resource',
      recover: async (error) => {
        // 尝试重新加载资源
        try {
          await this.retryResourceLoad(error);
          return true;
        } catch {
          return false;
        }
      },
      fallback: (error) => {
        console.warn(`Resource fallback for: ${error.message}`);
        // 可以加载默认占位符资源
      }
    });

    // 渲染错误恢复策略
    this.addRecoveryStrategy('render', {
      canRecover: (error) => error.type === 'render',
      recover: async (error) => {
        // 尝试重置渲染上下文
        try {
          await this.resetRenderContext(error);
          return true;
        } catch {
          return false;
        }
      },
      fallback: (error) => {
        console.warn(`Render fallback for: ${error.message}`);
        // 切换到安全模式渲染
      }
    });

    // 物理系统错误恢复策略
    this.addRecoveryStrategy('physics', {
      canRecover: (error) => error.type === 'physics',
      recover: async (error) => {
        // 重置物理状态
        try {
          await this.resetPhysicsState(error);
          return true;
        } catch {
          return false;
        }
      },
      fallback: (error) => {
        console.warn(`Physics fallback for: ${error.message}`);
        // 禁用复杂物理效果，使用简化模式
      }
    });
  }

  /**
   * 处理游戏错误
   */
  async handleError(error: GameError): Promise<void> {
    // 记录错误
    this.errors.push(error);

    // 限制错误历史长度
    if (this.errors.length > this.maxErrorHistory) {
      this.errors = this.errors.slice(-this.maxErrorHistory);
    }

    // 触发错误回调
    this.onError?.(error);

    // 如果正在恢复中，避免递归
    if (this.isRecovering) {
      console.warn('Already recovering from error, queuing:', error);
      return;
    }

    // 尝试恢复
    await this.attemptRecovery(error);
  }

  /**
   * 尝试从错误中恢复
   */
  private async attemptRecovery(error: GameError): Promise<void> {
    this.isRecovering = true;

    try {
      // 查找适用的恢复策略
      for (const [, strategy] of this.recoveryStrategies) {
        if (strategy.canRecover(error)) {
          try {
            const recovered = await strategy.recover(error);
            this.onRecovery?.(error, recovered);

            if (recovered) {
              console.log(`Successfully recovered from error: ${error.message}`);
              return;
            }
          } catch (recoveryError) {
            console.warn('Recovery strategy failed:', recoveryError);
          }

          // 如果恢复失败，使用回退策略
          strategy.fallback(error);
          return;
        }
      }

      // 没有找到合适的恢复策略，视为致命错误
      this.handleFatalError(error);
    } finally {
      this.isRecovering = false;
    }
  }

  /**
   * 处理致命错误
   */
  private handleFatalError(error: GameError): void {
    console.error('Fatal game error:', error);
    this.onFatalError?.(error);

    // 可以在这里显示错误页面或重启游戏
  }

  /**
   * 添加自定义恢复策略
   */
  addRecoveryStrategy(name: string, strategy: ErrorRecoveryStrategy): void {
    this.recoveryStrategies.set(name, strategy);
  }

  /**
   * 移除恢复策略
   */
  removeRecoveryStrategy(name: string): void {
    this.recoveryStrategies.delete(name);
  }

  /**
   * 获取错误历史
   */
  getErrorHistory(): GameError[] {
    return [...this.errors];
  }

  /**
   * 清除错误历史
   */
  clearErrorHistory(): void {
    this.errors = [];
  }

  /**
   * 获取错误统计
   */
  getErrorStats(): Record<string, number> {
    const stats: Record<string, number> = {};

    this.errors.forEach(error => {
      stats[error.type] = (stats[error.type] || 0) + 1;
    });

    return stats;
  }

  /**
   * 检查系统健康状态
   */
  getHealthStatus(): 'healthy' | 'warning' | 'critical' {
    const recentErrors = this.errors.filter(
      error => Date.now() - error.timestamp < 60000 // 最近1分钟
    );

    if (recentErrors.length === 0) return 'healthy';
    if (recentErrors.length < 5) return 'warning';
    return 'critical';
  }

  /**
   * 资源重新加载实现（占位符）
   */
  private async retryResourceLoad(_error: GameError): Promise<void> {
    // 实际实现中，这里会调用资源管理器的重试逻辑
    await new Promise(resolve => setTimeout(resolve, 1000));
    throw new Error('Resource retry not implemented');
  }

  /**
   * 重置渲染上下文实现（占位符）
   */
  private async resetRenderContext(_error: GameError): Promise<void> {
    // 实际实现中，这里会重置WebGL上下文或Canvas状态
    await new Promise(resolve => setTimeout(resolve, 100));
    throw new Error('Render context reset not implemented');
  }

  /**
   * 重置物理状态实现（占位符）
   */
  private async resetPhysicsState(_error: GameError): Promise<void> {
    // 实际实现中，这里会重置角色位置和物理状态
    await new Promise(resolve => setTimeout(resolve, 100));
    throw new Error('Physics state reset not implemented');
  }
}

/**
 * 全局错误处理器实例
 */
export const gameErrorHandler = GameErrorHandler.getInstance();

/**
 * 便捷的错误报告函数
 */
export function reportGameError(
  type: GameError['type'],
  message: string,
  details?: string,
  context?: Record<string, unknown>
): void {
  gameErrorHandler.handleError({
    type,
    message,
    details,
    timestamp: Date.now(),
    context
  });
}

/**
 * 带错误处理的异步函数包装器
 */
export function withErrorHandling<T extends (...args: any[]) => any>(
  fn: T,
  errorType: GameError['type'] = 'runtime'
): T {
  return ((...args: any[]) => {
    try {
      const result = fn(...args);

      // 如果返回Promise，捕获异步错误
      if (result instanceof Promise) {
        return result.catch(error => {
          reportGameError(errorType, error.message || 'Async error', error.stack, {
            functionName: fn.name,
            arguments: args
          });
          throw error;
        });
      }

      return result;
    } catch (error: any) {
      reportGameError(errorType, error.message || 'Sync error', error.stack, {
        functionName: fn.name,
        arguments: args
      });
      throw error;
    }
  }) as T;
}
