import { Game } from "./game";
import { IGameImage } from '@/types/index';

export class GameImage implements IGameImage {
  game: Game;
  texture: string | HTMLImageElement;
  x: number;
  y: number;
  w: number;
  h: number;
  constructor(
    game: Game,
    name: string,
    x?: number,
    y?: number,
    w?: number,
    h?: number
  ) {
    this.game = game;
    this.texture = game.textureByName(name);
    if (x === undefined) {
      x = 0;
    }
    if (y === undefined) {
      y = 0;
    }
    this.x = x;
    this.y = y;
    this.w = w || (this.texture as HTMLImageElement).width;
    this.h = h || (this.texture as HTMLImageElement).height;
  }
  static new(game: Game, name: string) {
    const i = new this(game, name);
    return i;
  }
  draw() {
    this.game.drawImage(this, this.w, this.h);
  }
  update() {}
}
