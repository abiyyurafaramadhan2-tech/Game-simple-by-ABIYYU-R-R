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
  enemyGroup!: Phaser.Physics.Arcade.Group; // Tambahan: Group untuk efisiensi physics
  joystick:   VirtualJoystick | null = null;
  private floatingTexts: FloatingText[] = [];
  private wave:     number = 1;
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
    
