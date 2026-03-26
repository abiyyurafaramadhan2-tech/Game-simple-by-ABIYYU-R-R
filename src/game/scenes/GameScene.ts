import Phaser from "phaser";
import { Player }       from "../entities/Player";
import { Enemy }        from "../entities/Enemy";
import { FloatingText } from "../objects/FloatingText";
import { VirtualJoystick } from "../objects/VirtualJoystick";
import { eventBus }     from "../EventBus";

const WORLD_W = 2560;
const WORLD_H = 1920;

export class GameScene extends Phaser.Scene {
  player!:    Player;
  enemies:    Enemy[] = [];
  joystick:   VirtualJoystick | null = null;
  private floatingTexts: FloatingText[] = [];
  private wave:     number = 1;
  private waveTimer: number = 12000;
  private score:    number = 0;
  private isDead:   boolean = false;

  // Parallax
  private bgFar!:  Phaser.GameObjects.TileSprite;
  private bgMid!:  Phaser.GameObjects.TileSprite;
  private bgNear!: Phaser.GameObjects.TileSprite;

  // AOE ring
  private ultRing: Phaser.GameObjects.Graphics | null = null;

  // Mobile buttons
  private mobileButtons: Phaser.GameObjects.Graphics[] = [];
  private mobileBtnLabels: Phaser.GameObjects.Text[] = [];

  constructor() { super({ key: "GameScene" }); }

  create() {
    const cam = this.cameras.main;

    // ── World bounds ──────────────────────────────────────────────
    this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);
    cam.setBounds(0, 0, WORLD_W, WORLD_H);

    // ── Parallax background ───────────────────────────────────────
    const CW = this.scale.width, CH = this.scale.height;
    this.bgFar  = this.add.tileSprite(CW/2, CH/2, CW, CH, "bg_far" ).setScrollFactor(0).setDepth(-3);
    this.bgMid  = this.add.tileSprite(CW/2, CH/2, CW, CH, "bg_mid" ).setScrollFactor(0).setDepth(-2);
    this.bgNear = this.add.tileSprite(CW/2, CH/2, CW, CH, "bg_near").setScrollFactor(0).setDepth(-1);

    // ── Floor tiles ───────────────────────────────────────────────
    for (let tx = 0; tx < WORLD_W; tx += 64)
      for (let ty = 0; ty < WORLD_H; ty += 64)
        this.add.image(tx + 32, ty + 32, "tile").setDepth(-1).setAlpha(0.9);

    // ── Boundary walls ────────────────────────────────────────────
    this.createWalls();

    // ── Player ────────────────────────────────────────────────────
    this.player = new Player(this, WORLD_W / 2, WORLD_H / 2);
    cam.startFollow(this.player, true, 0.10, 0.10);
    cam.setDeadzone(80, 60);

    // ── Initial enemies ───────────────────────────────────────────
    this.spawnWave(this.wave);

    // ── Bullet ↔ Enemy overlap ────────────────────────────────────
    this.physics.add.overlap(
      this.player.bulletGroup,
      this.physics.world as any,
      undefined, undefined, this,
    );

    // ── Player attack box ↔ enemy overlap (checked in update) ─────

    // ── Mobile controls ───────────────────────────────────────────
    if (!this.sys.game.device.os.desktop) {
      this.joystick = new VirtualJoystick(this, 90, this.scale.height - 90);
      this.createMobileButtons();
    }

    // ── ULT ring pool ─────────────────────────────────────────────
    this.ultRing = this.add.graphics().setDepth(50);

    // ── Events ────────────────────────────────────────────────────
    eventBus.on("player-dead", this.onPlayerDead, this);

    // ── Wave timer event ──────────────────────────────────────────
    this.time.addEvent({
      delay: 15000,
      callback: () => {
        this.wave++;
        this.spawnWave(this.wave);
      },
      loop: true,
    });

    eventBus.emit("wave-update", this.wave);
  }

  private createWalls() {
    const thick = 32;
    const walls = this.physics.add.staticGroup();
    const add = (x:number, y:number, w:number, h:number) => {
      const zone = this.add.zone(x, y, w, h);
      this.physics.world.enable(zone, Phaser.Physics.Arcade.STATIC_BODY);
      walls.add(zone);
    };
    add(WORLD_W/2,    thick/2,    WORLD_W, thick);
    add(WORLD_W/2,    WORLD_H - thick/2, WORLD_W, thick);
    add(thick/2,      WORLD_H/2,  thick,   WORLD_H);
    add(WORLD_W - thick/2, WORLD_H/2, thick, WORLD_H);
    // Collide player with walls
    this.physics.add.collider(this.player, walls);
    // Store for enemies
    (this as any)._walls = walls;
  }

  private spawnWave(wave: number) {
    const count  = 4 + wave * 2;
    const elites = Math.floor(wave / 3);
    const margin = 200;

    for (let i = 0; i < count; i++) {
      const type: "normal" | "elite" = i < elites ? "elite" : "normal";
      let x: number, y: number;
      do {
        x = Phaser.Math.Between(margin, WORLD_W - margin);
        y = Phaser.Math.Between(margin, WORLD_H - margin);
      } while (Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) < 280);

      const enemy = new Enemy(this, x, y, type);
      enemy.player    = this.player;
      enemy.allEnemies = this.enemies;
      this.enemies.push(enemy);
    }

    // Add newly created enemies to shared allEnemies reference
    this.enemies.forEach(e => { e.allEnemies = this.enemies; });
    this.physics.add.collider(this.enemies as any, this.enemies as any);
    if ((this as any)._walls) {
      this.physics.add.collider(this.enemies as any, (this as any)._walls);
    }

    // Player attack box overlaps enemies
    this.physics.add.overlap(
      this.player.attackBox,
      this.enemies as any,
      (_box, enemyObj) => {
        const e = enemyObj as Enemy;
        if (e.active) {
          e.takeDamage(this.player.stats.attackDamage);
          this.score += 10;
          this.checkEnemyDeath(e);
        }
      },
    );

    // Bullet overlaps enemies
    this.physics.add.overlap(
      this.player.bulletGroup,
      this.enemies as any,
      (bulletObj, enemyObj) => {
        const b = bulletObj as any;
        const e = enemyObj as Enemy;
        if (b.active && e.active) {
          e.takeDamage(b.damage);
          b.kill();
          this.score += 15;
          this.checkEnemyDeath(e);
        }
      },
    );

    // Enemy ↔ player collision (damage handled in enemy BT)
    this.physics.add.overlap(
      this.enemies as any,
      this.player,
      (_e, _p) => {
        // Handled by enemy state machine
      },
    );
  }

  private checkEnemyDeath(enemy: Enemy) {
    if (!enemy.active && !enemy.visible) {
      this.score += 50;
      this.player.score = this.score;
      // Spawn particles at death pos
      const px = this.add.particles(enemy.x, enemy.y, "particle", {
        speed: { min:80, max:220 },
        scale: { start:0.7, end:0 },
        alpha: { start:1,   end:0 },
        lifespan: 500,
        blendMode: Phaser.BlendModes.ADD,
        tint: 0xff4444,
        quantity: 14,
        emitting: false,
      });
      px.explode(14, enemy.x, enemy.y);
      this.time.delayedCall(600, () => px.destroy());

      // Check wave clear
      const alive = this.enemies.filter(e => e.active);
      if (alive.length === 0) {
        const ft = new FloatingText(this, this.cameras.main.scrollX + this.scale.width/2,
          this.cameras.main.scrollY + this.scale.height/2 - 60, "WAVE CLEAR! 🎉", "#ffd700");
        ft["duration"] = 2500;
        this.floatingTexts.push(ft);
      }
    }
  }

  // ── ULTIMATE ───────────────────────────────────────────────────────────────

  triggerUltimate(player: Player) {
    const radius = 220;
    const cx = player.x, cy = player.y;

    // Screen shake
    this.cameras.main.shake(350, 0.018);

    // Flash screen
    this.cameras.main.flash(200, 255, 100, 200, false);

    // Burst particles
    const burst = this.add.particles(cx, cy, "particle", {
      speed: { min:100, max:380 },
      scale: { start:1.0, end:0 },
      alpha: { start:1, end:0 },
      lifespan: 600,
      blendMode: Phaser.BlendModes.ADD,
      tint: [0xff44aa, 0xffaa44, 0xffffff],
      quantity: 40,
      emitting: false,
    });
    burst.explode(40, cx, cy);
    this.time.delayedCall(700, () => burst.destroy());

    // Ring wave
    let r = 0;
    const ring = this.ultRing!;
    const expand = this.time.addEvent({
      delay: 16,
      repeat: 25,
      callback: () => {
        r += radius / 25;
        ring.clear();
        ring.lineStyle(4, 0xff44aa, 1 - r/radius);
        ring.strokeCircle(cx, cy, r);
        if (r >= radius) ring.clear();
      },
    });

    // Damage enemies
    this.enemies.forEach(e => {
      if (!e.active) return;
      const d = Phaser.Math.Distance.Between(cx, cy, e.x, e.y);
      if (d < radius) {
        e.takeDamage(player.stats.ultDamage);
        this.score += 30;
        this.checkEnemyDeath(e);
      }
    });

    // Floating text
    const ft = new FloatingText(this, cx, cy - 40, `★ ULTIMATE ★`, "#ff44aa");
    ft["duration"] = 1500;
    this.floatingTexts.push(ft);
  }

  // ── MOBILE BUTTONS ─────────────────────────────────────────────────────────

  private createMobileButtons() {
    const CH = this.scale.height;
    const CW = this.scale.width;
    const btns = [
      { label:"DASH", color:0x3366ff },
      { label:"ATK",  color:0xffdd00 },
      { label:"ARR",  color:0x33ff88 },
      { label:"ULT",  color:0xff44aa },
    ];
    const startX = CW - 180;
    const startY = CH - 80;
    const positions = [
      { x: startX,       y: startY },
      { x: startX + 65,  y: startY - 50 },
      { x: startX + 120, y: startY },
      { x: startX + 65,  y: startY - 105 },
    ];

    btns.forEach((b, i) => {
      const g = this.add.graphics().setScrollFactor(0).setDepth(200).setAlpha(0.7);
      g.fillStyle(b.color, 0.6);
      g.fillCircle(positions[i].x, positions[i].y, 28);
      g.lineStyle(2, b.color, 1);
      g.strokeCircle(positions[i].x, positions[i].y, 28);
      this.mobileButtons.push(g);

      const t = this.add.text(positions[i].x, positions[i].y, b.label, {
        fontSize: "11px", fontFamily: "monospace",
        color: "#ffffff", stroke:"#000", strokeThickness:3,
      }).setOrigin(0.5).setScrollFactor(0).setDepth(201);
      this.mobileBtnLabels.push(t);

      // Touch input
      g.setInteractive(
        new Phaser.Geom.Circle(positions[i].x, positions[i].y, 28),
        Phaser.Geom.Circle.Contains
      );
      g.on("pointerdown", () => { this.player.mobileSkill = i; });
    });
  }

  // ── MAIN UPDATE ────────────────────────────────────────────────────────────

  update(_time: number, delta: number) {
    if (this.isDead) return;

    // Parallax scroll
    const cam  = this.cameras.main;
    const sx   = cam.scrollX, sy = cam.scrollY;
    this.bgFar.setTilePosition(sx * 0.08, sy * 0.08);
    this.bgMid.setTilePosition(sx * 0.22, sy * 0.22);
    this.bgNear.setTilePosition(sx * 0.40, sy * 0.40);

    // Update player
    this.player.update(delta, this.joystick?.output);
    if (this.player.mobileSkill !== null) {
      this.player.checkSkillInput(this.player.mobileSkill);
      this.player.mobileSkill = null;
    }

    // Update enemies
    this.enemies.forEach(e => e.update(delta));

    // Floating texts
    this.floatingTexts = this.floatingTexts.filter(ft => { ft.update(delta); return !ft.done; });

    // Emit wave+score to UI
    eventBus.emit("game-state", { wave: this.wave, score: this.score });
  }

  private onPlayerDead() {
    this.isDead = true;
    this.cameras.main.shake(500, 0.03);
    this.time.delayedCall(1800, () => {
      eventBus.emit("game-over", { score: this.score, wave: this.wave });
    });
  }

  shutdown() {
    eventBus.off("player-dead", this.onPlayerDead, this);
    this.joystick?.destroy();
  }
}
