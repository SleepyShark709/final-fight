import {
  IGame,
  IGameScene,
  IGameImage,
  GameRunCallback,
  LoadProgress,
} from "@/types/index";
import { ResourceManager } from "@/core/resource-manager";
import { getAllResources } from "@/config/resources";
import { gameErrorHandler, reportGameError } from "@/core/error-handler";
import { performanceMonitor } from "@/core/performance-monitor";

export class Game implements IGame {
  images: { [key: string]: HTMLImageElement | string };
  runCallback: GameRunCallback;
  scene: IGameScene | null;
  actions: { [key: string]: () => void };
  keydowns: { [key: string]: boolean };
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  canvasWidth: number;
  canvasHeight: number;
  keyStatus: "up" | "down";
  frameCount: number;
  private resourceManager: ResourceManager;

  constructor(
    fps: number,
    images: { [key: string]: string | HTMLImageElement },
    runCallback: GameRunCallback
  ) {
    window.fps = fps;
    this.images = images;
    this.runCallback = runCallback;
    this.scene = null;
    this.actions = {};
    this.keydowns = {};
    this.canvas = document.querySelector("#id-canvas") as HTMLCanvasElement;
    this.context = this.canvas.getContext("2d") as CanvasRenderingContext2D;

    // 设置像素完美渲染 - 关闭图像平滑以避免砖块间出现细线
    this.context.imageSmoothingEnabled = false;
    // 确保Canvas使用清晰的像素渲染（使用类型断言处理浏览器兼容性）
    (this.context as CanvasRenderingContext2D & {
      webkitImageSmoothingEnabled?: boolean;
      mozImageSmoothingEnabled?: boolean;
      msImageSmoothingEnabled?: boolean;
    }).webkitImageSmoothingEnabled = false;
    (this.context as CanvasRenderingContext2D & {
      webkitImageSmoothingEnabled?: boolean;
      mozImageSmoothingEnabled?: boolean;
      msImageSmoothingEnabled?: boolean;
    }).mozImageSmoothingEnabled = false;
    (this.context as CanvasRenderingContext2D & {
      webkitImageSmoothingEnabled?: boolean;
      mozImageSmoothingEnabled?: boolean;
      msImageSmoothingEnabled?: boolean;
    }).msImageSmoothingEnabled = false;

    this.canvasWidth = this.canvas.clientWidth;
    this.canvasHeight = this.canvas.clientHeight;
    this.keyStatus = "up";
    this.frameCount = 0;
    window.addEventListener("keydown", (event) => {
      this.keydowns[event.key] = true;
      this.keyStatus = "down";
    });
    window.addEventListener("keyup", (event) => {
      this.keydowns[event.key] = false;
      this.keyStatus = "up";
    });
    this.resourceManager = new ResourceManager();
    this.setupResourceManager();
    this.setupErrorHandling();
    this.setupPerformanceMonitoring();
    this.init();
  }
  drawImage(Img: IGameImage, width: number, height: number) {
    //Img 是一个 GameImgae
    // LogGroup: default
    if (
      Img.texture &&
      typeof Img.texture !== "string" &&
      Img.x !== undefined &&
      Img.y !== undefined
    ) {
      this.context.drawImage(
        Img.texture as HTMLImageElement,
        Img.x,
        Img.y,
        width,
        height
      );
    }
  }
  update() {
    this.scene && this.scene.update();
  }
  draw() {
    this.scene && this.scene.draw();
  }
  deleteImage(element: IGameImage) {
    if (this.scene) {
      this.scene.deleteElement(element);
    }
  }
  registerAction = (
    key: string,
    callback: (_keyStatus: "up" | "down") => void
  ) => {
    this.actions[key] = () => callback(this.keyStatus);
  };
  runLoop() {
    // 帧开始性能监控
    performanceMonitor.frameStart();

    try {

      // 输入处理
      const actions = Object.keys(this.actions);
      for (let i = 0; i < actions.length; i++) {
        const key = actions[i];
        if (this.keydowns[key]) {
          this.actions[key]();
        }
      }

      this.frameCount++;

      // 更新逻辑性能监控
      performanceMonitor.updateStart();
      this.update();
      performanceMonitor.updateEnd();

      // 渲染性能监控
      performanceMonitor.renderStart();
      this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.draw();
      performanceMonitor.renderEnd();
    } catch (error: unknown) {
      // 捕获游戏循环中的错误
      const errorMessage = error instanceof Error ? error.message : String(error);
      reportGameError("runtime", "Game loop error", errorMessage, {
        frameCount: this.frameCount,
        scene: this.scene?.constructor.name || "unknown",
      });

      // 尝试继续运行，除非是致命错误
      if (error instanceof Error && error.name === "FatalError") {
        return;
      }
    }

    // 调度下一帧
    setTimeout(() => {
      window.requestAnimationFrame(this.runLoop.bind(this));
    }, 1000 / window.fps);
  }
  textureByName(name: string): HTMLImageElement | string {
    // 优先从资源管理器获取
    const image = this.resourceManager.getImage(name);
    if (image) {
      return image;
    }

    // 回退到legacy方式
    return this.images[name] || "";
  }

  // 新增：获取资源管理器实例
  getResourceManager(): ResourceManager {
    return this.resourceManager;
  }

  // 新增：预加载资源
  async preloadResources(): Promise<void> {
    const allResources = getAllResources();
    await this.resourceManager.loadImages(allResources);
  }

  // 新增：获取加载进度
  getLoadProgress(): LoadProgress {
    return this.resourceManager.getLoadProgress();
  }
  runWithScene(scene: IGameScene) {
    this.scene = scene;
    setTimeout(() => {
      this.runLoop();
    }, 1000 / window.fps);
  }
  replaceScene(scene: IGameScene) {
    this.scene = scene;
  }
  __start() {
    this.runCallback(this);
  }

  private setupResourceManager() {
    // 设置加载进度回调
    this.resourceManager.onProgressUpdate = (progress: LoadProgress) => {
      // 可以在这里更新加载界面
      if (progress.progress === 1) {
        // 所有资源加载完成
      }
    };

    // 设置错误处理回调
    this.resourceManager.onError = (error: Error, resourceName: string) => {
      reportGameError(
        "resource",
        `Resource loading failed: ${resourceName}`,
        error.message
      );
    };
  }

  private setupErrorHandling() {
    // 设置错误处理回调
    gameErrorHandler.onError = (error: unknown) => {
      // eslint-disable-next-line no-console
      console.error("Game Error:", error);
    };

    gameErrorHandler.onFatalError = (error: unknown) => {
      // eslint-disable-next-line no-console
      console.error("Fatal Game Error:", error);
      // 可以在这里显示错误页面或重启游戏
      this.handleFatalError(error);
    };

    // 添加资源恢复策略
    gameErrorHandler.addRecoveryStrategy("game-resource", {
      canRecover: (error: unknown) =>
        typeof error === "object" &&
        error !== null &&
        "type" in error &&
        (error as { type: string }).type === "resource" &&
        !!this.resourceManager,
      recover: async () => {
        try {
          // 尝试重新初始化资源管理器
          await this.resourceManager.cleanup();
          return true;
        } catch {
          return false;
        }
      },
      fallback: () => {
        // eslint-disable-next-line no-console
        console.warn("Using fallback resources due to loading failure");
        // 可以加载最小化的资源集
      },
    });
  }

  private setupPerformanceMonitoring() {
    // 设置性能警报回调
    performanceMonitor.onAlert = (alert: { type: string; message: string }) => {
      // eslint-disable-next-line no-console
      console.warn(`Performance Alert [${alert.type}]:`, alert.message);

      // 根据不同类型的性能问题采取相应措施
      switch (alert.type) {
        case "fps_drop":
          // 可以降低渲染质量或禁用某些效果
          break;
        case "memory_high":
          // 可以清理缓存或垃圾回收
          this.performGarbageCollection();
          break;
        case "render_slow":
          // 可以简化渲染流程
          break;
        case "update_slow":
          // 可以优化游戏逻辑
          break;
      }
    };

    performanceMonitor.onMetricsUpdate = (metrics: {
      totalFrames: number;
      fps: { average: number };
      renderTime: { average: number };
      memory: { percentage: number };
    }) => {
      // 可以在调试模式下显示性能指标
      // 在浏览器环境中，我们可以通过其他方式检测开发模式，这里简化处理
      const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      if (isDevelopment) {
        // 开发模式检查
        // 每30秒输出一次性能报告
        if (metrics.totalFrames % (30 * 60) === 0) {
          // eslint-disable-next-line no-console
          console.log("Performance Report:", {
            fps: metrics.fps.average.toFixed(1),
            renderTime: metrics.renderTime.average.toFixed(2),
            memoryUsage: `${(metrics.memory.percentage * 100).toFixed(1)}%`,
            grade: performanceMonitor.getPerformanceGrade(),
          });
        }
      }
    };
  }

  private handleFatalError(error: unknown) {
    // 尝试安全关闭游戏
    try {
      if (this.scene) {
        // 停止当前场景
        this.scene = null;
      }

      // 清理资源
      this.resourceManager?.cleanup();

      // 显示错误信息给用户
      this.displayErrorScreen(error);
    } catch (shutdownError) {
      // eslint-disable-next-line no-console
      console.error("Error during game shutdown:", shutdownError);
    }
  }

  private displayErrorScreen(error: unknown) {
    // 在canvas上绘制错误信息
    this.context.fillStyle = "#000000";
    this.context.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

    this.context.fillStyle = "#ff4444";
    this.context.font = "bold 24px Arial";
    this.context.textAlign = "center";
    this.context.fillText(
      "Game Error Occurred",
      this.canvasWidth / 2,
      this.canvasHeight / 2 - 50
    );

    this.context.fillStyle = "#ffffff";
    this.context.font = "16px Arial";
    this.context.fillText(
      "Please refresh the page to restart",
      this.canvasWidth / 2,
      this.canvasHeight / 2 + 20
    );

    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage) {
      this.context.font = "12px Arial";
      this.context.fillStyle = "#cccccc";
      this.context.fillText(
        errorMessage,
        this.canvasWidth / 2,
        this.canvasHeight / 2 + 50
      );
    }
  }

  private performGarbageCollection() {
    // 强制垃圾回收（如果支持）
    if ("gc" in window && typeof (window as Window & { gc?: () => void }).gc === "function") {
      (window as Window & { gc: () => void }).gc();
    }

    // 清理可能的内存泄漏
    this.resourceManager?.cleanup();
  }

  init = async () => {
    try {
      // 从传入的images对象创建资源列表
      const legacyResources = Object.entries(this.images).map(
        ([name, url]) => ({
          name,
          url: url as string,
        })
      );

      // 加载所有资源
      const loadedImages = await this.resourceManager.loadImages(
        legacyResources
      );

      // 更新images对象
      loadedImages.forEach((img, name) => {
        this.images[name] = img;
      });

      // 启动游戏
      this.__start();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Failed to initialize game resources:", error);
      // 可以显示错误页面或重试机制
    }
  };
}
