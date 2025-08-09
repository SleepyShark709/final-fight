import { FPS } from "./constants";
import { Game } from "./game/game";
import { SceneTitle } from "./scene/title/scene-title";
import { LoadingScreen } from "./ui/loading-screen";
import { getAllResources } from "./config/resources";

// 保持向后兼容，继续导入legacy资源工具
import { EnemyImages } from "./utils/enemy-utils";
import { MapImages } from "./utils/map-util";
import { PlayerImages } from "./utils/player-util";
import bgImage from "@/assets/background/bg.png";
import startbgImage from "@/assets/background/startbg.png";

const main = async () => {
  // 这个地方是加了一个滑动条来控制帧率
  const input = document.querySelector("#id-input-speed") as HTMLInputElement;
  const zhen = document.querySelector(".zhen");
  let fps = FPS;
  if (input && zhen) {
    input.value = String(FPS);
    zhen.innerHTML = `帧率（${fps})`;
    input.addEventListener("input", (event: Event) => {
      const input = event.target as HTMLInputElement;
      fps = Number(input?.value);
      zhen.innerHTML = `帧率（${fps})`;
      window.fps = fps;
    });
  }

  let images: { [key: string]: string } = {
    bg: bgImage,
    startbg: startbgImage,
  };

  const playerImages = new PlayerImages().images;
  const enemyImages = new EnemyImages().images;
  const mapImages = new MapImages().images;

  images = Object.assign(images, playerImages);
  images = Object.assign(images, enemyImages);
  images = Object.assign(images, mapImages);

  // 创建游戏实例
  const game = new Game(FPS, images, function (g: Game) {
    const s = SceneTitle.new(g);
    g.runWithScene(s);
  });

  // 创建加载屏幕
  const loadingScreen = new LoadingScreen(game);
  loadingScreen.show();

  // 设置资源管理器进度回调
  const resourceManager = game.getResourceManager();
  // let currentResourceName = ''; // 暂时注释掉未使用的变量

  resourceManager.onProgressUpdate = (progress, resourceName) => {
    // currentResourceName = resourceName; // 暂时注释掉
    loadingScreen.draw(progress, resourceName);

    if (progress.progress === 1) {
      // 所有资源加载完成，隐藏加载屏幕
      setTimeout(() => {
        loadingScreen.hide();
      }, 500); // 延迟500ms让用户看到100%完成
    }
  };

  resourceManager.onError = (error, resourceName) => {
    loadingScreen.drawError(`Failed to load ${resourceName}: ${error.message}`);
  };

  // 预加载现代资源管理系统的资源（可选）
  try {
    const modernResources = getAllResources();
    if (modernResources.length > 0) {
      await game.preloadResources();
    }
  } catch (error) {
    console.warn('Modern resource preloading failed, falling back to legacy system:', error);
  }
};

// 当页面加载完成后启动游戏
window.addEventListener("load", () => main());
