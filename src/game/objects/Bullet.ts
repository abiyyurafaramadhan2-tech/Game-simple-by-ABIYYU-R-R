export class Bullet extends Phaser.Physics.Arcade.Sprite {
  private lifetime: number = 0;
  private maxLife:  number = 1800;
  public  damage:   number = 20;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, "bullet");
  }

  fire(x: number, y: number, angle: number, speed: number, dmg: number) {
    this.setActive(true).setVisible(true);
    this.setPosition(x, y);
    this.lifetime = 0;
    this.damage   = dmg;
    (this.body as Phaser.Physics.Arcade.Body).reset(x, y);
    this.scene.physics.velocityFromAngle(angle, speed, this.body.velocity as Phaser.Math.Vector2);
    this.setRotation(Phaser.Math.DegToRad(angle));
  }

  preUpdate(time: number, delta: number) {
    super.preUpdate(time, delta);
    this.lifetime += delta;
    if (this.lifetime >= this.maxLife || !this.active) {
      this.kill();
    }
  }

  kill() {
    this.setActive(false).setVisible(false);
    (this.body as Phaser.Physics.Arcade.Body)?.reset(0, 0);
    this.setVelocity(0, 0);
  }
}
