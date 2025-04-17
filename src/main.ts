import { FPS } from "./constants";
import { Game } from "./game/game";
import { SceneTitle } from "./scene/title/scene-title";
import { EnemyImages } from "./utils/enemy-utils";
import { MapImages } from "./utils/map-util";
import { PlayerImages } from "./utils/player-util";

const main = () => {
  // 这个地方是加了一个滑动条来控制帧率
  let input: any = document.querySelector("#id-input-speed");
  let zhen = document.querySelector(".zhen");
  let fps = FPS;
  if (input && zhen) {
    input.value = FPS;
    zhen.innerHTML = `帧率（${fps})`;
    input.addEventListener("input", (event: InputEvent) => {
      let input = event.target as HTMLInputElement;
      fps = Number(input?.value);
      zhen.innerHTML = `帧率（${fps})`;
      window.fps = fps;
    });
  }

  var images: { [key: string]: string } = {
    bg: "image/bg.png",
    startbg: "image/startbg.png",
  };
  let playerImages = new PlayerImages().images;
  let enemyImages = new EnemyImages().images;
  let mapImages = new MapImages().images;

  images = Object.assign(images, playerImages);
  images = Object.assign(images, enemyImages);
  images = Object.assign(images, mapImages);

  new Game(FPS, images, function (g: Game) {
    // var s = SceneTitle.new(g)
    var s = SceneTitle.new(g);
    g.runWithScene(s);
  });
};

// 当页面加载完成后启动游戏
window.addEventListener("load", () => main());
