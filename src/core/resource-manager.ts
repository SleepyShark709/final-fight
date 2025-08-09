import { IResourceManager, LoadProgress, ImageResource } from '@/types/index';

/**
 * 现代化资源管理器
 * 使用 Promise/async-await 模式处理资源加载
 */
export class ResourceManager implements IResourceManager {
  private images: Map<string, HTMLImageElement> = new Map();
  private loadingPromises: Map<string, Promise<HTMLImageElement>> = new Map();
  private loadProgress: LoadProgress = { loaded: 0, total: 0, progress: 0 };

  /**
   * 加载单个图片资源
   */
  async loadImage(name: string, url: string): Promise<HTMLImageElement> {
    // 如果已经加载过，直接返回
    if (this.images.has(name)) {
      return this.images.get(name)!;
    }

    // 如果正在加载，返回现有的Promise
    if (this.loadingPromises.has(name)) {
      return this.loadingPromises.get(name)!;
    }

    // 创建加载Promise
    const loadPromise = new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();

      img.onload = () => {
        this.images.set(name, img);
        this.loadingPromises.delete(name);
        resolve(img);
      };

      img.onerror = (error) => {
        this.loadingPromises.delete(name);
        reject(new Error(`Failed to load image: ${name} from ${url}. Error: ${error}`));
      };

      // 设置超时处理
      setTimeout(() => {
        if (!this.images.has(name)) {
          img.src = ''; // 取消加载
          reject(new Error(`Image load timeout: ${name} from ${url}`));
        }
      }, 10000); // 10秒超时

      img.src = url;
    });

    this.loadingPromises.set(name, loadPromise);
    return loadPromise;
  }

  /**
   * 批量加载图片资源
   */
  async loadImages(resources: ImageResource[]): Promise<Map<string, HTMLImageElement>> {
    this.loadProgress.total = resources.length;
    this.loadProgress.loaded = 0;
    this.loadProgress.progress = 0;

    const loadPromises = resources.map(async (resource) => {
      try {
        const image = await this.loadImage(resource.name, resource.url);
        this.loadProgress.loaded++;
        this.loadProgress.progress = this.loadProgress.loaded / this.loadProgress.total;

        // 触发进度更新事件
        this.onProgressUpdate?.(this.loadProgress, resource.name);

        return { name: resource.name, image };
      } catch (error) {
        console.error(`Failed to load resource: ${resource.name}`, error);
        throw error;
      }
    });

    // 并发加载所有资源
    try {
      const results = await Promise.all(loadPromises);
      const resultMap = new Map<string, HTMLImageElement>();

      results.forEach(result => {
        resultMap.set(result.name, result.image);
      });

      return resultMap;
    } catch (error) {
      throw new Error(`Failed to load some resources: ${error}`);
    }
  }

  /**
   * 预加载资源（可选择性加载）
   */
  async preloadImages(resources: ImageResource[]): Promise<void> {
    const loadPromises = resources.map(resource =>
      this.loadImage(resource.name, resource.url).catch(error => {
        console.warn(`Preload failed for ${resource.name}:`, error);
        return null;
      })
    );

    await Promise.all(loadPromises);
  }

  /**
   * 获取已加载的图片
   */
  getImage(name: string): HTMLImageElement | null {
    return this.images.get(name) || null;
  }

  /**
   * 检查资源是否已加载
   */
  isImageLoaded(name: string): boolean {
    return this.images.has(name);
  }

  /**
   * 获取加载进度
   */
  getLoadProgress(): LoadProgress {
    return { ...this.loadProgress };
  }

  /**
   * 清理所有资源
   */
  cleanup(): void {
    this.images.clear();
    this.loadingPromises.clear();
    this.loadProgress = { loaded: 0, total: 0, progress: 0 };
  }

  /**
   * 清理指定资源
   */
  removeImage(name: string): void {
    this.images.delete(name);
    this.loadingPromises.delete(name);
  }

  /**
   * 获取所有已加载资源的名称
   */
  getAllImageNames(): string[] {
    return Array.from(this.images.keys());
  }

  /**
   * 获取内存使用信息
   */
  getMemoryUsage(): { imageCount: number; estimatedSize: string } {
    const imageCount = this.images.size;
    const estimatedBytes = imageCount * 100000; // 粗略估算每张图片100KB
    const estimatedSize = `${(estimatedBytes / 1024 / 1024).toFixed(2)}MB`;

    return { imageCount, estimatedSize };
  }

  // 进度更新回调
  onProgressUpdate?: (progress: LoadProgress, resourceName: string) => void;

  // 错误处理回调
  onError?: (error: Error, resourceName: string) => void;
}

/**
 * 全局资源管理器实例
 */
export const resourceManager = new ResourceManager();
