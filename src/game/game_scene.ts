import { Game } from "./game";

export class GameScene {
  game: Game;
  elements: any[];
  constructor(game: Game) {
    this.game = game;
    this.elements = [];
  }
  static new(game: Game) {
    var i = new this(game);
    return i;
  }
  addElement(img: any) {
    img.scene = this;
    this.elements.push(img);
  }
  popElement() {
    this.elements.pop();
  }
  deleteElement(element: any) {
    // 找到要删除的类
    let index = this.elements.indexOf(element);
    if (index > 0) {
      // 如果找到了则删除
      this.elements.splice(index, 1);
    }
  }
  draw() {
    for (let i = 0; i < this.elements.length; i++) {
      let e = this.elements[i];
      e.draw();
    }
  }
  update() {
    for (let i = 0; i < this.elements.length; i++) {
      let e = this.elements[i];
      e.update();
    }
  }
}
