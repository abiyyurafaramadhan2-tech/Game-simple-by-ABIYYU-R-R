import Phaser from "phaser";

export default class PreloadScene extends Phaser.Scene {
  constructor() {
    super("PreloadScene");
  }

  preload() {}

  create() {
    this.generateTextures();
    this.scene.start("GameScene");
  }

  private generateTextures() {
    // ── Player ─────────────────────────────────────────────
    const pg = this.add.graphics({ x: 0, y: 0 });

    pg.fillStyle(0x2255cc, 1);
    pg.fillRoundedRect(6, 10, 20, 28, 6);

    pg.fillStyle(0xffccaa, 1);
    pg.fillCircle(16, 10, 8);

    pg.generateTexture("player", 32, 48);
    pg.destroy();

    // ── Enemy ─────────────────────────────────────────────
    const eg = this.add.graphics({ x: 0, y: 0 });

    eg.fillStyle(0xcc2222, 1);
    eg.fillCircle(16, 16, 14);

    eg.generateTexture("enemy", 32, 32);
    eg.destroy();

    // ── Bullet ────────────────────────────────────────────
    const bg = this.add.graphics({ x: 0, y: 0 });

    bg.fillStyle(0xffff00, 1);
    bg.fillCircle(4, 4, 4);

    bg.generateTexture("bullet", 8, 8);
    bg.destroy();

    // ── Tile / Ground ─────────────────────────────────────
    const tg = this.add.graphics({ x: 0, y: 0 });

    tg.fillStyle(0x444444, 1);
    tg.fillRect(0, 0, 32, 32);

    tg.generateTexture("ground", 32, 32);
    tg.destroy();
  }
}
