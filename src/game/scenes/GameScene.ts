import Phaser from "phaser";
import { Player } from "../entities/Player";
import { Enemy } from "../entities/Enemy";
import { eventBus } from "../EventBus";

export class GameScene extends Phaser.Scene {
  player!: Player;
  enemies: Enemy[] = [];

  private score = 0;
  private wave = 1;
  private isDead = false;

  // ✅ handler HARUS disimpan (biar off bisa jalan)
  private onPlayerDeadHandler = () => {
    this.handlePlayerDead();
  };

  constructor() {
    super("GameScene");
  }

  create() {
    this.generateTextures();

    this.player = new Player(this, 400, 300);

    this.spawnWave(this.wave);

    // ✅ EVENT FIX
    eventBus.on("player-dead", this.onPlayerDeadHandler);

    // cleanup
    this.events.on("shutdown", this.shutdown, this);
  }

  update(_t: number, dt: number) {
    if (this.isDead) return;

    this.player.update(dt);

    this.enemies.forEach(e => e.update(dt));

    // ✅ kirim state
    eventBus.emit("game-state", {
      score: this.score,
      wave: this.wave
    });
  }

  private handlePlayerDead() {
    if (this.isDead) return;

    this.isDead = true;

    this.time.delayedCall(1000, () => {
      eventBus.emit("game-over", {
        score: this.score,
        wave: this.wave
      });
    });
  }

  private spawnWave(wave: number) {
    const count = 3 + wave;

    for (let i = 0; i < count; i++) {
      const e = new Enemy(this, Phaser.Math.Between(100, 700), Phaser.Math.Between(100, 500));
      e.player = this.player;
      this.enemies.push(e);
    }
  }

  private generateTextures() {
    // ✅ FIX ERROR add:false
    const pg = this.make.graphics({ x: 0, y: 0 });
    pg.setVisible(false);

    pg.fillStyle(0x2255cc, 1);
    pg.fillRect(0, 0, 32, 32);
    pg.generateTexture("player", 32, 32);
    pg.clear();

    pg.fillStyle(0xcc3333, 1);
    pg.fillRect(0, 0, 32, 32);
    pg.generateTexture("enemy", 32, 32);
    pg.clear();

    pg.destroy();
  }

  private shutdown() {
    // ✅ PENTING BANGET (anti bug & memory leak)
    eventBus.off("player-dead", this.onPlayerDeadHandler);
  }
}
