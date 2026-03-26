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
  enemyGroup!: Phaser.Physics.Arcade.Group;
  joystick:   VirtualJoystick | null = null;
  private floatingTexts: FloatingText[] = [];
  private wave:     number = 1;
  private score:    number = 0;
  private isDead:   boolean = false;

  private bgFar!:  Phaser.GameObjects.TileSprite;
  private bgMid!:  Phaser.GameObjects.TileSprite;
  private bgNear!: Phaser.GameObjects.TileSprite;
  private ultRing: Phaser.GameObjects.Graphics | null = null;
  private mobileButtons: Phaser.GameObjects.Graphics[] = [];
  private mobileBtnLabels: Phaser.GameObjects.Text[] = [];

  constructor() { 
    super({ key: "GameScene" }); 
  }

  create() {
    const cam = this.cameras.main;

    this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);
    cam.setBounds(0, 0, WORLD_W, WORLD_H);

    const CW = this.scale.width;
    const CH = this.scale.height;

    // Parallax
    this.bgFar  = this.add.tileSprite(CW/2, CH/2, CW, CH, "bg_far" ).setScrollFactor(0).setDepth(-3);
    this.bgMid  = this.add.tileSprite(CW/2, CH/2, CW, CH, "bg_mid" ).setScrollFactor(0).setDepth(-2);
    this.bgNear = this.add.tileSprite(CW/2, CH/2, CW, CH, "bg_near").setScrollFactor(0).setDepth(-1);

    // Floor
    this.add.tileSprite(WORLD_W/2, WORLD_H/2, WORLD_W, WORLD_H, "tile").setDepth(-1).setAlpha(0.9);

    this.enemyGroup = this.physics.add.group();
    const walls = this.createWalls();

    this.player = new Player(this, WORLD_W / 2, WORLD_H / 2);
    cam.startFollow(this.player, true, 0.10, 0.10);
    cam.setDeadzone(80, 60);

    // Physics Colliders
    this.physics.add.collider(this.player, walls);
    this.physics.add.collider(this.enemyGroup, walls);
    this.physics.add.collider(this.enemyGroup, this.enemyGroup);

    // Overlaps
    this.physics.add.overlap(this.player.attackBox, this.enemyGroup, (_box, enemyObj) => {
        const e = enemyObj as Enemy;
        if (e.active) {
          e.takeDamage(this.player.stats.attackDamage);
          this.score += 10;
          this.checkEnemyDeath(e);
        }
    });

    this.physics.add.overlap(this.player.bulletGroup, this.enemyGroup, (bulletObj, enemyObj) => {
        const b = bulletObj as any;
        const e = enemyObj as Enemy;
        if (b.active && e.active) {
          e.takeDamage(b.damage);
          if (b.kill) b.kill();
          this.score += 15;
          this.checkEnemyDeath(e);
        }
    });

    this.spawnWave(this.wave);

    if (!this.sys.game.device.os.desktop) {
      this.joystick = new VirtualJoystick(this, 90, this.scale.height - 90);
      this.createMobileButtons();
    }

    this.ultRing = this.add.graphics().setDepth(50);

    // Fix Event Bus
    eventBus.on("player-dead", () => { this.onPlayerDead(); });

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
    return walls;
  }

  private spawnWave(wave: number) {
    const count = 4 + wave * 2;
    const elites = Math.floor(wave / 3);
    const margin = 200;

    for (let i = 0; i < count; i++) {
      const type: "normal" | "elite" = i < elites ? "elite" : "normal";
      let x = Phaser.Math.Between(margin, WORLD_W - margin);
      let y = Phaser.Math.Between(margin, WORLD_H - margin);
      
      const enemy = new Enemy(this, x, y, type);
      enemy.player = this.player;
      this.enemies.push(enemy);
      this.enemyGroup.add(enemy);
    }
    this.enemies.forEach(e => { e.allEnemies = this.enemies; });
  }

  private checkEnemyDeath(enemy: Enemy) {
    if (!enemy.active && !enemy.visible) {
      this.score += 50;
      this.player.score = this.score;
      this.enemies = this.enemies.filter(e => e !== enemy);
      this.enemyGroup.remove(enemy);
      enemy.destroy();

      if (this.enemies.length === 0) {
        const ft = new FloatingText(this, this.cameras.main.scrollX + this.scale.width/2,
          this.cameras.main.scrollY + this.scale.height/2 - 60, "WAVE CLEAR! 🎉", "#ffd700");
        this.floatingTexts.push(ft);
      }
    }
  }

  update(_time: number, delta: number) {
    if (this.isDead) return;

    const cam = this.cameras.main;
    if (this.bgFar) this.bgFar.setTilePosition(cam.scrollX * 0.08, cam.scrollY * 0.08);
    if (this.bgMid) this.bgMid.setTilePosition(cam.scrollX * 0.22, cam.scrollY * 0.22);
    if (this.bgNear) this.bgNear.setTilePosition(cam.scrollX * 0.40, cam.scrollY * 0.40);

    this.player.update(delta, this.joystick?.output);
    this.enemies.forEach(e => e.update(delta));
    
    this.floatingTexts = this.floatingTexts.filter(ft => {
      ft.update(delta);
      if (ft.done) { ft.destroy(); return false; }
      return true;
    });

    eventBus.emit("game-state", { wave: this.wave, score: this.score });
  }

  private onPlayerDead() {
    this.isDead = true;
    this.cameras.main.shake(500, 0.03);
    this.time.delayedCall(1800, () => {
      eventBus.emit("game-over", { score: this.score, wave: this.wave });
    });
  }

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

      this.add.text(positions[i].x, positions[i].y, b.label, {
        fontSize: "11px", fontFamily: "monospace",
        color: "#ffffff", stroke:"#000", strokeThickness:3,
      }).setOrigin(0.5).setScrollFactor(0).setDepth(201);

      g.setInteractive(new Phaser.Geom.Circle(positions[i].x, positions[i].y, 28), Phaser.Geom.Circle.Contains);
      g.on("pointerdown", () => { this.player.mobileSkill = i; });
    });
  }

  shutdown() {
    eventBus.off("player-dead");
    if (this.joystick) this.joystick.destroy();
    this.enemies.forEach(e => e.destroy());
    this.floatingTexts.forEach(ft => ft.destroy());
  }
}
