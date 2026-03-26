export class FloatingText {
  private text:    Phaser.GameObjects.Text;
  private elapsed: number = 0;
  private duration: number = 900;
  private vy:      number = -0.08;
  done:            boolean = false;

  constructor(scene: Phaser.Scene, x: number, y: number, value: number | string, color = "#ffffff") {
    this.text = scene.add.text(x, y - 20, String(value), {
      fontSize: "16px",
      fontFamily: "monospace",
      color,
      stroke: "#000000",
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(300);
  }

  update(delta: number) {
    this.elapsed += delta;
    this.text.y  += this.vy * delta;
    const t       = this.elapsed / this.duration;
    this.text.setAlpha(1 - t * t);
    if (this.elapsed >= this.duration) {
      this.text.destroy();
      this.done = true;
    }
  }
}
