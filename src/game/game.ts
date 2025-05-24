export class Game {
  images: { [key: string]: HTMLImageElement | string };
  runCallback: (g: any) => void;
  scene: any;
  actions: { [key: string]: () => void };
  keydowns: { [key: string]: boolean };
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  canvasWidth: number;
  canvasHeight: number;
  keyStatus: "up" | "down";
  frameCount: number;
  constructor(
    fps: number,
    images: { [key: string]: string | HTMLImageElement },
    runCallback: (g: any) => void
  ) {
    window.fps = fps;
    this.images = images;
    this.runCallback = runCallback;
    this.scene = null;
    this.actions = {};
    this.keydowns = {};
    this.canvas = document.querySelector("#id-canvas") as HTMLCanvasElement;
    this.context = this.canvas.getContext("2d") as CanvasRenderingContext2D;

    // 设置像素完美渲染 - 关闭图像平滑以避免砖块间出现细线
    this.context.imageSmoothingEnabled = false;
    // 确保Canvas使用清晰的像素渲染（使用类型断言处理浏览器兼容性）
    (this.context as any).webkitImageSmoothingEnabled = false;
    (this.context as any).mozImageSmoothingEnabled = false;
    (this.context as any).msImageSmoothingEnabled = false;

    this.canvasWidth = this.canvas.clientWidth;
    this.canvasHeight = this.canvas.clientHeight;
    this.keyStatus = "up";
    this.frameCount = 0;
    window.addEventListener("keydown", (event) => {
      this.keydowns[event.key] = true;
      this.keyStatus = "down";
    });
    window.addEventListener("keyup", (event) => {
      this.keydowns[event.key] = false;
      this.keyStatus = "up";
    });
    this.init();
  }
  drawImage(Img: any, width: number, height: number) {
    //Img 是一个 GameImgae
    // LogGroup: default
    Img.texture &&
      this.context.drawImage(Img.texture, Img.x, Img.y, width, height);
  }
  update() {
    this.scene && this.scene.update();
  }
  draw() {
    this.scene && this.scene.draw();
  }
  deleteImage(element: any) {
    this.scene.deleteElement(element);
  }
  registerAction = (
    key: string,
    callback: (keyStatus: "up" | "down") => void
  ) => {
    this.actions[key] = () => callback(this.keyStatus);
  };
  runLoop() {
    let g = this;
    var actions = Object.keys(g.actions);
    for (let i = 0; i < actions.length; i++) {
      var key = actions[i];
      if (g.keydowns[key]) {
        g.actions[key]();
      }
    }

    this.frameCount++;

    g.update();
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    g.draw();
    setTimeout(() => {
      window.requestAnimationFrame(this.runLoop.bind(this));
    }, 1000 / window.fps);
  }
  textureByName(name: string) {
    let g = this;
    var img = g.images[name];
    return img;
  }
  runWithScene(scene: any) {
    let g = this;
    g.scene = scene;
    setTimeout(() => {
      this.runLoop();
    }, 1000 / window.fps);
  }
  replaceScene(scene: any) {
    this.scene = scene;
  }
  __start() {
    this.runCallback(this);
  }
  init = () => {
    let g = this;
    var loads = [];
    var names = Object.keys(this.images);
    for (let i = 0; i < names.length; i++) {
      let name = names[i];
      var path = this.images[name];
      let img: HTMLImageElement = new Image();
      img.src = path as unknown as string;
      img.onload = function () {
        //存入g.images中
        g.images[name] = img;
        // 所有图片都载入成功之后调用run
        loads.push(1);
        if (loads.length === names.length) {
          g.__start();
        }
      };
    }
  };
}
