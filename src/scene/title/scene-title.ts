import { Game } from "@/game/game";
import { GameImage } from "@/game/game_image";
import { GameScene } from "@/game/game_scene";
import { GameLabel } from "../main/label";
import { Scene } from "../main/scene";

declare global {
  interface Window {
    isMobileTerminal: boolean;
  }
}

class SceneTitle extends GameScene {
  constructor(game: Game) {
    super(game);
    let startbg = new GameImage(game, "startbg", 0, 0, 1024, 512);
    let label = new GameLabel(game, "按r开始游戏", 100, 190, "#ffffff");
    this.addElement(startbg);
    this.addElement(label);
    game.registerAction("r", () => {
      var s = new Scene(game);
      game.replaceScene(s);
    });
  }

  static new(game: any) {
    return new this(game);
  }
}

export { SceneTitle };
