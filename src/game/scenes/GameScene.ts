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

  private onPlayerDeadHandler = () => this.onPlayerDead();

  constructor() {
    super({ key: "GameScene" });
  }

  create() {
    this.generateTextures(); // ✅ penting

    const cam = this.cameras.main;

    this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);
    cam.setBounds(0, 0, WORLD_W, WORLD_H);

    const CW = this.scale.width;
    const CH = this.scale.height;

    // Background
    this.bgFar  = this.add.tileSprite(CW/2, CH/2, CW, CH, "particle").setScrollFactor(0).setDepth(-3).setTint(0x111122);
    this.bgMid  = this.add.tileSprite(CW/2, CH/2, CW, CH, "particle").setScrollFactor(0).setDepth(-2).setTint(0x222244);
    this.bgNear = this.add.tileSprite(CW/2, CH/2, CW, CH, "particle").setScrollFactor(0).setDepth(-1).setTint(0x333366);

    // Floor
    for (let tx = 0; tx < WORLD_W; tx += 64) {
      for (let ty = 0; ty < WORLD_H; ty += 64) {
        this.add.image(tx + 32, ty + 32, "particle").setAlpha(0.05);
      }
    }

    this.createWalls();

    // Player
    this.player = new Player(this, WORLD_W / 2, WORLD_H / 2);
    cam.startFollow(this.player, true, 0.10, 0.10);

    // Enemy awal
    this.spawnWave(this.wave);

    // ✅ OVERLAP (sekali aja)
    this.physics.add.overlap(this.player.attackBox, this.enemies as any, (_b, e:any) => {
      if (e.active) {
        e.takeDamage(this.player.stats.attackDamage);
        this.score += 10;
        this.checkEnemyDeath(e);
      }
    });

    this.physics.add.overlap(this.player.bulletGroup, this.enemies as any, (b:any, e:any) => {
      if (b.active && e.active) {
        e.takeDamage(b.damage);
        if (b.kill) b.kill();
        this.score += 15;
        this.checkEnemyDeath(e);
      }
    });

    // Mobile
    if (!this.sys.game.device.os.desktop) {
      this.joystick = new VirtualJoystick(this, 90, this.scale.height - 90);
    }

    this.ultRing = this.add.graphics().setDepth(50);

    eventBus.on("player-dead", this.onPlayerDeadHandler);
    this.events.on("shutdown", this.shutdown, this);

    this.time.addEvent({
      delay: 15000,
      loop: true,
      callback: () => {
        this.wave++;
        this.spawnWave(this.wave);
      }
    });
  }

  private generateTextures() {
    const pg = this.make.graphics({ x: 0, y: 0 });
    pg.setVisible(false);

    // Player
    pg.fillStyle(0x2255cc, 1);
    pg.fillRoundedRect(6, 10, 20, 18, 4);
    pg.fillStyle(0xffccaa, 1);
    pg.fillCircle(16, 10, 6);
    pg.generateTexture("player", 32, 32);
    pg.clear();

    // Enemy
    pg.fillStyle(0xcc3333, 1);
    pg.fillCircle(16, 16, 12);
    pg.generateTexture("enemy", 32, 32);
    pg.clear();

    // Bullet
    pg.fillStyle(0xffff00, 1);
    pg.fillCircle(8, 8, 6);
    pg.generateTexture("bullet", 16, 16);
    pg.clear();

    // Particle
    pg.fillStyle(0xffffff, 1);
    pg.fillCircle(4, 4, 4);
    pg.generateTexture("particle", 8, 8);
    pg.clear();

    pg.destroy();
  }

  private createWalls() {
    const walls = this.physics.add.staticGroup();
    const thick = 32;

    const add = (x:number,y:number,w:number,h:number) => {
      const z = this.add.zone(x,y,w,h);
      this.physics.world.enable(z, Phaser.Physics.Arcade.STATIC_BODY);
      walls.add(z);
    };

    add(WORLD_W/2, 16, WORLD_W, thick);
    add(WORLD_W/2, WORLD_H-16, WORLD_W, thick);
    add(16, WORLD_H/2, thick, WORLD_H);
    add(WORLD_W-16, WORLD_H/2, thick, WORLD_H);

    this.physics.add.collider(this.player, walls);
  }

  private spawnWave(wave:number) {
    const count = 4 + wave * 2;

    for (let i=0;i<count;i++){
      const x = Phaser.Math.Between(200, WORLD_W-200);
      const y = Phaser.Math.Between(200, WORLD_H-200);

      const e = new Enemy(this, x, y, "normal");
      e.player = this.player;

      this.enemies.push(e);
    }
  }

  private checkEnemyDeath(enemy:Enemy) {
    if (!enemy.active) {
      this.score += 50;
      this.player.score = this.score;

      this.enemies = this.enemies.filter(e=>e!==enemy);
      enemy.destroy();

      if (this.enemies.length === 0) {
        new FloatingText(this, this.player.x, this.player.y-60, "WAVE CLEAR!", "#ffd700");
      }
    }
  }

  update(_t:number, d:number) {
    if (this.isDead) return;

    this.player.update(d, this.joystick?.output);
    this.enemies.forEach(e=>e.update(d));

    eventBus.emit("game-state", { wave:this.wave, score:this.score });
  }

  private onPlayerDead() {
    this.isDead = true;
    this.time.delayedCall(1500, ()=>{
      eventBus.emit("game-over", { score:this.score, wave:this.wave });
    });
  }

  shutdown() {
    eventBus.off("player-dead", this.onPlayerDeadHandler);
    this.joystick?.destroy();
  }
                                          }
