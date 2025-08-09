import { Game } from "./game";
import { IGameScene, IGameElement } from "@/types/index";

export class GameScene implements IGameScene {
  game: Game;
  elements: IGameElement[];
  constructor(game: Game) {
    this.game = game;
    this.elements = [];
  }
  static new(game: Game) {
    const i = new this(game);
    return i;
  }
  addElement(img: IGameElement) {
    img.scene = this;
    this.elements.push(img);
  }
  popElement() {
    this.elements.pop();
  }
  deleteElement(element: IGameElement) {
    // 找到要删除的类
    const index = this.elements.indexOf(element);
    if (index > 0) {
      // 如果找到了则删除
      this.elements.splice(index, 1);
    }
  }
  draw() {
    for (let i = 0; i < this.elements.length; i++) {
      const e = this.elements[i];
      e.draw();
    }
  }
  update() {
    for (let i = 0; i < this.elements.length; i++) {
      const e = this.elements[i];
      e.update();
    }
  }
}
