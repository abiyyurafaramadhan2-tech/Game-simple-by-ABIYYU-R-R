export interface JoystickOutput {
  x: number;
  y: number;
  active: boolean;
}

export class VirtualJoystick {
  private scene:     Phaser.Scene;
  private base:      Phaser.GameObjects.Graphics;
  private thumb:     Phaser.GameObjects.Graphics;
  private bx:        number;
  private by:        number;
  private radius:    number = 60;
  private thumbRad:  number = 24;
  private pointer:   Phaser.Input.Pointer | null = null;
  private touchId:   number = -1;
  output: JoystickOutput = { x: 0, y: 0, active: false };

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.bx    = x;
    this.by    = y;

    this.base  = scene.add.graphics().setScrollFactor(0).setDepth(200).setAlpha(0.35);
    this.thumb = scene.add.graphics().setScrollFactor(0).setDepth(201).setAlpha(0.7);

    this.drawBase();
    this.drawThumb(0, 0);

    scene.input.on("pointerdown",  this.onDown,  this);
    scene.input.on("pointermove",  this.onMove,  this);
    scene.input.on("pointerup",    this.onUp,    this);
    scene.input.on("pointercancel",this.onUp,    this);
  }

  private drawBase() {
    this.base.clear();
    this.base.lineStyle(2, 0xffffff, 1);
    this.base.strokeCircle(this.bx, this.by, this.radius);
    this.base.fillStyle(0x333366, 0.8);
    this.base.fillCircle(this.bx, this.by, this.radius);
  }

  private drawThumb(dx: number, dy: number) {
    this.thumb.clear();
    this.thumb.fillStyle(0x88aaff, 1);
    this.thumb.fillCircle(this.bx + dx, this.by + dy, this.thumbRad);
  }

  private onDown(pointer: Phaser.Input.Pointer) {
    if (this.touchId !== -1) return;
    const cx = this.scene.cameras.main;
    const px = pointer.x;
    const py = pointer.y;
    if (px < cx.width * 0.45) {
      this.pointer = pointer;
      this.touchId = pointer.id;
    }
  }

  private onMove(pointer: Phaser.Input.Pointer) {
    if (pointer.id !== this.touchId) return;
    const dx = pointer.x - this.bx;
    const dy = pointer.y - this.by;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const clampedDist = Math.min(dist, this.radius);
    const angle = Math.atan2(dy, dx);
    const cx = Math.cos(angle) * clampedDist;
    const cy = Math.sin(angle) * clampedDist;
    this.output.x = cx / this.radius;
    this.output.y = cy / this.radius;
    this.output.active = dist > 8;
    this.drawThumb(cx, cy);
  }

  private onUp(pointer: Phaser.Input.Pointer) {
    if (pointer.id !== this.touchId) return;
    this.pointer = null;
    this.touchId = -1;
    this.output  = { x: 0, y: 0, active: false };
    this.drawThumb(0, 0);
  }

  destroy() {
    this.scene.input.off("pointerdown",  this.onDown,  this);
    this.scene.input.off("pointermove",  this.onMove,  this);
    this.scene.input.off("pointerup",    this.onUp,    this);
    this.scene.input.off("pointercancel",this.onUp,    this);
    this.base.destroy();
    this.thumb.destroy();
  }
}
