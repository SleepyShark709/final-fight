import eidle0 from "@/assets/enemy/idle/0.png";
import eidle1 from "@/assets/enemy/idle/1.png";
import eidle2 from "@/assets/enemy/idle/2.png";
import eidle3 from "@/assets/enemy/idle/3.png";

import edie0 from "@/assets/enemy/die/0.png";
import edie1 from "@/assets/enemy/die/1.png";
import edie2 from "@/assets/enemy/die/2.png";
import edie3 from "@/assets/enemy/die/3.png";

import ewalk0 from "@/assets/enemy/walk/0.png";
import ewalk1 from "@/assets/enemy/walk/1.png";
import ewalk2 from "@/assets/enemy/walk/2.png";
import ewalk3 from "@/assets/enemy/walk/3.png";
import ewalk4 from "@/assets/enemy/walk/4.png";
import ewalk5 from "@/assets/enemy/walk/5.png";

import eattack0 from "@/assets/enemy/attack/0.png";
import eattack1 from "@/assets/enemy/attack/1.png";
import eattack2 from "@/assets/enemy/attack/2.png";
import eattack3 from "@/assets/enemy/attack/3.png";
import eattack4 from "@/assets/enemy/attack/4.png";
import eattack5 from "@/assets/enemy/attack/5.png";
import eattack6 from "@/assets/enemy/attack/6.png";
import eattack7 from "@/assets/enemy/attack/7.png";

export class EnemyImages {
  images: { [key: string]: string };
  constructor() {
    this.images = {
      eidle0: eidle0,
      eidle1: eidle1,
      eidle2: eidle2,
      eidle3: eidle3,
      // eidle4: 'image/enemy/idle/4.png',
      // eidle5: 'image/enemy/idle/5.png',
      // eidle6: 'image/enemy/idle/6.png',
      // eidle7: 'image/enemy/idle/7.png',
      edie0: edie0,
      edie1: edie1,
      edie2: edie2,
      edie3: edie3,
      // edie4: 'image/enemy/die/4.png',
      // edie5: 'image/enemy/die/5.png',
      // edie6: 'image/enemy/die/6.png',
      // edie7: 'image/enemy/die/7.png',
      // edie8: 'image/enemy/die/8.png',
      // edie9: 'image/enemy/die/9.png',
      ewalk0: ewalk0,
      ewalk1: ewalk1,
      ewalk2: ewalk2,
      ewalk3: ewalk3,
      ewalk4: ewalk4,
      ewalk5: ewalk5,
      // ewalk6: 'image/enemy/walk/6.png',
      // ewalk7: 'image/enemy/walk/7.png',
      eattack0: eattack0,
      eattack1: eattack1,
      eattack2: eattack2,
      eattack3: eattack3,
      eattack4: eattack4,
      eattack5: eattack5,
      eattack6: eattack6,
      eattack7: eattack7,
      // eattack8: 'image/enemy/attack/8.png',
      // eattack9: 'image/enemy/attack/9.png',
    };
  }
}
