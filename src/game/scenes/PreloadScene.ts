import Phaser from "phaser";

export class PreloadScene extends Phaser.Scene {
  constructor() { super({ key: "PreloadScene" }); }

  create() {
    this.generateTextures();
    this.scene.start("GameScene");
  }

  private generateTextures() {
    // ── Player ─────────────────────────────────────────────────────
    const pg = this.add.graphics({ x:0, y:0 });
    pg.fillStyle(0x2255cc, 1);
    pg.fillRoundedRect(6, 10, 20, 18, 4);
    pg.fillStyle(0xffccaa, 1);
    pg.fillCircle(16, 9, 8);
    pg.fillStyle(0x1133aa, 1);
    pg.fillCircle(13, 8, 2);
    pg.fillCircle(19, 8, 2);
    pg.fillStyle(0x88aaff, 1);
    pg.fillTriangle(16, 5, 12, 13, 20, 13);
    pg.generateTexture("player", 32, 32);
    pg.destroy();

    // ── Enemy ──────────────────────────────────────────────────────
    const eg = this.add.graphics({ x:0, y:0 });
    eg.fillStyle(0xcc2222, 1);
    eg.fillCircle(16, 16, 14);
    eg.fillStyle(0xff7700, 1);
    eg.fillCircle(10, 12, 4);
    eg.fillCircle(22, 12, 4);
    eg.fillStyle(0x220000, 1);
    eg.fillCircle(11, 12, 2);
    eg.fillCircle(23, 12, 2);
    eg.generateTexture("enemy", 32, 32);
    eg.destroy();

    // ── Elite Enemy ────────────────────────────────────────────────
    const e2g = this.add.graphics({ x:0, y:0 });
    e2g.fillStyle(0x881100, 1);
    e2g.lineStyle(2, 0xff4400, 1);
    e2g.strokeCircle(16, 16, 13);
    e2g.fillStyle(0xffaa00, 1);
    e2g.fillCircle(9, 11, 5);
    e2g.fillCircle(23, 11, 5);
    e2g.fillStyle(0x110000, 1);
    e2g.fillCircle(10, 11, 2.5);
    e2g.fillCircle(24, 11, 2.5);
    // Crown spikes
    e2g.fillStyle(0xffdd00, 1);
    e2g.fillTriangle(9,4, 12,10, 7,10);
    e2g.fillTriangle(16,2, 19,10, 13,10);
    e2g.fillTriangle(23,4, 26,10, 20,10);
    e2g.generateTexture("enemy2", 32, 32);
    e2g.destroy();

    // ── Bullet ─────────────────────────────────────────────────────
    const bg = this.add.graphics({ x:0, y:0 });
    bg.fillStyle(0xffff44, 1);
    bg.fillCircle(5, 5, 5);
    bg.fillStyle(0xffffff, 1);
    bg.fillCircle(4, 4, 2);
    bg.generateTexture("bullet", 10, 10);
    bg.destroy();

    // ── Particle ───────────────────────────────────────────────────
    const pp = this.add.graphics({ x:0, y:0 });
    pp.fillStyle(0xffffff, 1);
    pp.fillCircle(4, 4, 4);
    pp.generateTexture("particle", 8, 8);
    pp.destroy();

    // ── Background Layers ──────────────────────────────────────────
    this.makeBackground("bg_far",  0x08081a, [ [0xffffff,0.08], [0xaaaaff,0.05] ], 50);
    this.makeBackground("bg_mid",  0x0d0d28, [ [0x2244aa,0.12] ], 15);
    this.makeBackground("bg_near", 0x111122, [ [0x334466,0.15], [0x223355,0.10] ], 8);

    // ── Tile (floor) ───────────────────────────────────────────────
    const tg = this.add.graphics({ x:0, y:0 });
    tg.fillStyle(0x161630, 1);
    tg.fillRect(0, 0, 64, 64);
    tg.lineStyle(1, 0x222244, 0.4);
    tg.strokeRect(0, 0, 64, 64);
    tg.generateTexture("tile", 64, 64);
    tg.destroy();
  }

  private makeBackground(key: string, base: number, dots: [number, number][], count: number) {
    const W = 512, H = 512;
    const g = this.add.graphics({ x:0, y:0 });
    g.fillStyle(base, 1);
    g.fillRect(0, 0, W, H);
    for (const [color, alpha] of dots) {
      for (let i = 0; i < count; i++) {
        const px  = Phaser.Math.Between(0, W);
        const py  = Phaser.Math.Between(0, H);
        const sz  = Phaser.Math.FloatBetween(1, 3.5);
        g.fillStyle(color, alpha);
        g.fillRect(px, py, sz, sz);
      }
    }
    g.generateTexture(key, W, H);
    g.destroy();
  }
}    eg.destroy();

    // ── Elite Enemy ────────────────────────────────────────────────
    const e2g = this.make.graphics({ x:0, y:0, add:false });
    e2g.fillStyle(0x881100, 1);
    e2g.fillCircle(16, 16, 14);
    e2g.lineStyle(2, 0xff4400, 1);
    e2g.strokeCircle(16, 16, 13);
    e2g.fillStyle(0xffaa00, 1);
    e2g.fillCircle(9, 11, 5);
    e2g.fillCircle(23, 11, 5);
    e2g.fillStyle(0x110000, 1);
    e2g.fillCircle(10, 11, 2.5);
    e2g.fillCircle(24, 11, 2.5);
    // Crown spikes
    e2g.fillStyle(0xffdd00, 1);
    e2g.fillTriangle(9,4, 12,10, 7,10);
    e2g.fillTriangle(16,2, 19,10, 13,10);
    e2g.fillTriangle(23,4, 26,10, 20,10);
    e2g.generateTexture("enemy2", 32, 32);
    e2g.destroy();

    // ── Bullet ─────────────────────────────────────────────────────
    const bg = this.make.graphics({ x:0, y:0, add:false });
    bg.fillStyle(0xffff44, 1);
    bg.fillCircle(5, 5, 5);
    bg.fillStyle(0xffffff, 1);
    bg.fillCircle(4, 4, 2);
    bg.generateTexture("bullet", 10, 10);
    bg.destroy();

    // ── Particle ───────────────────────────────────────────────────
    const pp = this.make.graphics({ x:0, y:0, add:false });
    pp.fillStyle(0xffffff, 1);
    pp.fillCircle(4, 4, 4);
    pp.generateTexture("particle", 8, 8);
    pp.destroy();

    // ── Background Layers ──────────────────────────────────────────
    this.makeBackground("bg_far",  0x08081a, [ [0xffffff,0.08], [0xaaaaff,0.05] ], 50);
    this.makeBackground("bg_mid",  0x0d0d28, [ [0x2244aa,0.12] ], 15);
    this.makeBackground("bg_near", 0x111122, [ [0x334466,0.15], [0x223355,0.10] ], 8);

    // ── Tile (floor) ───────────────────────────────────────────────
    const tg = this.make.graphics({ x:0, y:0, add:false });
    tg.fillStyle(0x161630, 1);
    tg.fillRect(0, 0, 64, 64);
    tg.lineStyle(1, 0x222244, 0.4);
    tg.strokeRect(0, 0, 64, 64);
    tg.generateTexture("tile", 64, 64);
    tg.destroy();
  }

  private makeBackground(key: string, base: number, dots: [number, number][], count: number) {
    const W = 512, H = 512;
    const g = this.make.graphics({ x:0, y:0, add:false });
    g.fillStyle(base, 1);
    g.fillRect(0, 0, W, H);
    for (const [color, alpha] of dots) {
      for (let i = 0; i < count; i++) {
        const px  = Phaser.Math.Between(0, W);
        const py  = Phaser.Math.Between(0, H);
        const sz  = Phaser.Math.FloatBetween(1, 3.5);
        g.fillStyle(color, alpha);
        g.fillRect(px, py, sz, sz);
      }
    }
    g.generateTexture(key, W, H);
    g.destroy();
  }
}
