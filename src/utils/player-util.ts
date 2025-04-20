import run0 from "@/assets/player/run/0.png";
import run1 from "@/assets/player/run/1.png";
import run2 from "@/assets/player/run/2.png";
import run3 from "@/assets/player/run/3.png";
import run4 from "@/assets/player/run/4.png";
import run5 from "@/assets/player/run/5.png";

import idle0 from "@/assets/player/idle-sword/0.png";
import idle1 from "@/assets/player/idle-sword/1.png";
import idle2 from "@/assets/player/idle-sword/2.png";
import idle3 from "@/assets/player/idle-sword/3.png";
import idle4 from "@/assets/player/idle-sword/4.png";
import idle5 from "@/assets/player/idle-sword/5.png";

import attack1_0 from "@/assets/player/attack/1-0.png";
import attack1_1 from "@/assets/player/attack/1-1.png";
import attack1_2 from "@/assets/player/attack/1-2.png";
import attack1_3 from "@/assets/player/attack/1-3.png";
import attack1_4 from "@/assets/player/attack/1-4.png";
import attack1_5 from "@/assets/player/attack/1-5.png";

import attack2_0 from "@/assets/player/attack/2-0.png";
import attack2_1 from "@/assets/player/attack/2-1.png";
import attack2_2 from "@/assets/player/attack/2-2.png";
import attack2_3 from "@/assets/player/attack/2-3.png";
import attack2_4 from "@/assets/player/attack/2-4.png";
import attack2_5 from "@/assets/player/attack/2-5.png";

import attack3_0 from "@/assets/player/attack/3-0.png";
import attack3_1 from "@/assets/player/attack/3-1.png";
import attack3_2 from "@/assets/player/attack/3-2.png";
import attack3_3 from "@/assets/player/attack/3-3.png";

import jump0 from "@/assets/player/jump/0.png";
import jump1 from "@/assets/player/jump/1.png";
import jump2 from "@/assets/player/jump/2.png";
import jump3 from "@/assets/player/jump/3.png";

export class PlayerImages {
  images: { [key: string]: string };
  constructor() {
    this.images = {
      run0: run0,
      run1: run1,
      run2: run2,
      run3: run3,
      run4: run4,
      run5: run5,
      idle0: idle0,
      idle1: idle1,
      idle2: idle2,
      idle3: idle3,
      idle4: idle4,
      idle5: idle5,
      attack1_0: attack1_0,
      attack1_1: attack1_1,
      attack1_2: attack1_2,
      attack1_3: attack1_3,
      attack1_4: attack1_4,
      attack1_5: attack1_5,
      attack2_0: attack2_0,
      attack2_1: attack2_1,
      attack2_2: attack2_2,
      attack2_3: attack2_3,
      attack2_4: attack2_4,
      attack2_5: attack2_5,
      attack3_0: attack3_0,
      attack3_1: attack3_1,
      attack3_2: attack3_2,
      attack3_3: attack3_3,
      // attack3_4: 'image/attack/3-4.png',
      // attack3_5: 'image/attack/3-5.png',
      jump0: jump0,
      jump1: jump1,
      jump2: jump2,
      jump3: jump3,
    };
  }
}
