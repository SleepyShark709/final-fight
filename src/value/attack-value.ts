import { Game } from "@/game/game";
import { Character } from "@/character/character";

export class AttackValue {
  game: Game;
  x: number;
  y: number;
  number: number;
  color: string;
  text: string;
  isShow: boolean;
  character: Character | null;
  constructor(game: Game, x: number, y: number) {
    this.game = game;
    this.x = x; // 伤害数值的 x
    this.y = y; // 伤害数值的 y
    this.number = 0;
    this.color = "#ffffff";
    this.text = "";
    this.isShow = false;
    this.character = null; // 关联的角色，用于获取地图偏移
  }

  // 设置关联的角色
  setCharacter(character: Character) {
    this.character = character;
  }

  setShow(show: boolean) {
    this.isShow = show;
  }
  update(hurtNum: number) {
    if (this.number < hurtNum && this.isShow === true) {
      this.number += 3;
      this.text = `-${this.number}`;
    } else {
      this.number = hurtNum;
      if (this.isShow === false) {
        this.number = 0;
      } else {
        setTimeout(() => {
          this.number = 0;
          this.isShow = false;
        }, 300);
      }
    }
  }
  draw() {
    if (this.isShow) {
      // 计算伤害值的屏幕坐标（考虑地图偏移）
      let screenX = this.x;
      let screenY = this.y;

      // 如果关联的角色有地图且地图有偏移功能
      if (
        this.character &&
        this.character.map &&
        this.character.map.worldToScreen
      ) {
        const screenPos = this.character.map.worldToScreen(this.x, this.y);
        screenX = screenPos.x;
        screenY = screenPos.y;
      }

      this.game.context.font = "20px serif";
      this.game.context.fillStyle = this.color;
      this.game.context.fillText(this.text, screenX, screenY);
    }
  }
}
