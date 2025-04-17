interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const log = console.log.bind(console);

export const imageFromPath = (path: string): HTMLImageElement => {
  const img = new Image();
  img.src = path;
  return img;
};

export const reactIntersects = (a: Rect, b: Rect): boolean => {
  return b.y > a.y && b.y < a.y + a.h && b.x > a.x && b.x < a.x + a.w;
};

export const impact = (obj: Rect, dobj: Rect): boolean => {
  const o = {
    x: obj.x,
    y: obj.y,
    w: obj.w,
    h: obj.h,
  };

  const d = {
    x: dobj.x,
    y: dobj.y,
    w: dobj.w,
    h: dobj.h,
  };

  const px = o.x <= d.x ? d.x : o.x;
  const py = o.y <= d.y ? d.y : o.y;

  return (
    px >= o.x &&
    px <= o.x + o.w &&
    py >= o.y &&
    py <= o.y + o.h &&
    px >= d.x &&
    px <= d.x + d.w &&
    py >= d.y &&
    py <= d.y + d.h
  );
};

export const randomBetween = (start: number, end: number): number => {
  const n = Math.random() * (end - start + 1);
  return Math.floor(n + start);
};

export const config = {
  player_speed: 10,
  cloud_speed: 1,
  enemy_speed: 5,
  bullet_speed: 5,
  fire_cooldown: 9,
};
