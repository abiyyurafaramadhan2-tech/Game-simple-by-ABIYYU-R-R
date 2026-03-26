import Phaser from "phaser";
import { Player }       from "../entities/Player";
import { Enemy }        from "../entities/Enemy";
import { FloatingText } from "../objects/FloatingText";
import { VirtualJoystick } from "../objects/VirtualJoystick";
import { eventBus }     from "../EventBus";

const WORLD_W = 2560;
const WORLD_H = 1920;

export class GameScene extends Phaser.Scene {
  player!: Player;
  enemies: Enemy[] = [];
  joystick: VirtualJoystick | null = null;

  private floatingTexts: FloatingText[] = [];
  private wave: number = 1;
  private score: number = 0;
  private isDead: boolean = false;

  private bgFar!: Phaser.GameObjects.TileSprite;
  private bgMid!: Phaser.GameObjects.TileSprite;
  private bgNear!: Phaser.GameObjects.TileSprite;

  private ultRing!: Phaser.GameObjects.Graphics;

  // ✅ handler biar bisa off()
  private onPlayerDeadHandler = () => this.onPlayerDead();

  constructor() {
    super({ key: "GameScene" });
  }

  create() {
    const cam = this.cameras.main;

    this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);
    cam.setBounds(0, 0, WORLD_W, WORLD_H);

    const CW = this.scale.width;
    const CH = this.scale.height;

    // Background
    this.bgFar  = this.add.tileSprite(CW/2, CH/2, CW, CH, "bg_far").setScrollFactor(0).setDepth(-3);
    this.bgMid  = this.add.tileSprite(CW/2, CH/2, CW, CH, "bg_mid").setScrollFactor(0).setDepth(-2);
    this.bgNear = this.add.tileSprite(CW/2, CH/2, CW, CH, "bg_near").setScrollFactor(0).setDepth(-1);

    // Floor
    for (let tx = 0; tx < WORLD_W; tx += 64) {
      for (let ty = 0; ty < WORLD_H; ty += 64) {
        this.add.image(tx + 32, ty + 32, "tile").setDepth(-1).setAlpha(0.9);
      }
    }

    this.createWalls();

    // Player
    this.player = new Player(this, WORLD_W / 2, WORLD_H / 2);
    cam.startFollow(this.player, true, 0.10, 0.10);
    cam.setDeadzone(80, 60);

    // Enemy awal
    this.spawnWave(this.wave);

    // ✅ OVERLAP DIPINDAH KE SINI (FIX BESAR)
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
      }
    );

    this.physics.add.overlap(
      this.player.bulletGroup,
      this.enemies as any,
      (bulletObj, enemyObj) => {
        const b = bulletObj as any;
        const e = enemyObj as Enemy;
        if (b.active && e.active) {
          e.takeDamage(b.damage);
          if (b.kill) b.kill();
          this.score += 15;
          this.checkEnemyDeath(e);
        }
      }
    );

    // Mobile
    if (!this.sys.game.device.os.desktop) {
      this.joystick = new VirtualJoystick(this, 90, this.scale.height - 90);
    }

    this.ultRing = this.add.graphics().setDepth(50);

    // ✅ FIX EVENT BUS
    eventBus.on("player-dead", this.onPlayerDeadHandler);

    this.events.on("shutdown", this.shutdown, this);

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

    add(WORLD_W/2, thick/2, WORLD_W, thick);
    add(WORLD_W/2, WORLD_H - thick/2, WORLD_W, thick);
    add(thick/2, WORLD_H/2, thick, WORLD_H);
    add(WORLD_W - thick/2, WORLD_H/2, thick, WORLD_H);

    this.physics.add.collider(this.player, walls);

    (this as any)._walls = walls;
  }

  private spawnWave(wave: number) {
    const count = 4 + wave * 2;
    const margin = 200;

    for (let i = 0; i < count; i++) {
      let x: number, y: number;

      do {
        x = Phaser.Math.Between(margin, WORLD_W - margin);
        y = Phaser.Math.Between(margin, WORLD_H - margin);
      } while (
        Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) < 280
      );

      const enemy = new Enemy(this, x, y, "normal");
      enemy.player = this.player;

      this.enemies.push(enemy);
    }

    this.physics.add.collider(this.enemies as any, this.enemies as any);

    if ((this as any)._walls) {
      this.physics.add.collider(this.enemies as any, (this as any)._walls);
    }
  }

  private checkEnemyDeath(enemy: Enemy) {
    if (!enemy.active) {
      this.score += 50;
      this.player.score = this.score;

      // ✅ REMOVE DARI ARRAY (FIX MEMORY LEAK)
      this.enemies = this.enemies.filter(e => e !== enemy);

      enemy.destroy();

      if (this.enemies.length === 0) {
        const ft = new FloatingText(
          this,
          this.cameras.main.scrollX + this.scale.width/2,
          this.cameras.main.scrollY + this.scale.height/2 - 60,
          "WAVE CLEAR! 🎉",
          "#ffd700"
        );
        this.floatingTexts.push(ft);
      }
    }
  }

  update(_time: number, delta: number) {
    if (this.isDead) return;

    const cam = this.cameras.main;

    this.bgFar.setTilePosition(cam.scrollX * 0.08, cam.scrollY * 0.08);
    this.bgMid.setTilePosition(cam.scrollX * 0.22, cam.scrollY * 0.22);
    this.bgNear.setTilePosition(cam.scrollX * 0.40, cam.scrollY * 0.40);

    this.player.update(delta, this.joystick?.output);

    this.enemies.forEach(e => e.update(delta));

    this.floatingTexts = this.floatingTexts.filter(ft => {
      ft.update(delta);
      return !ft.done;
    });

    eventBus.emit("game-state", { wave: this.wave, score: this.score });
  }

  private onPlayerDead() {
    this.isDead = true;

    this.cameras.main.shake(500, 0.03);

    this.time.delayedCall(1800, () => {
      eventBus.emit("game-over", {
        score: this.score,
        wave: this.wave
      });
    });
  }

  shutdown() {
    eventBus.off("player-dead", this.onPlayerDeadHandler);
    this.joystick?.destroy();
  }
      }
