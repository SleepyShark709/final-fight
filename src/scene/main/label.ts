import { Game } from "@/game/game";

export class GameLabel {
  game: Game;
  text: string;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  constructor(game: Game, text: string, x: number, y: number, color: string) {
    this.game = game;
    this.text = text;
    this.x = x;
    this.y = y;
    this.w = text.length * 12; // 简单估算文本宽度
    this.h = 20; // 固定高度
    this.color = color || "#000000";
  }
  static new(game: Game, text: string, x: number, y: number, color: string) {
    return new this(game, text, x, y, color);
  }
  draw() {
    this.game.context.font = "20px serif";
    this.game.context.fillStyle = this.color;
    this.game.context.fillText(this.text, this.x, this.y);
  }
  update() {}
}
