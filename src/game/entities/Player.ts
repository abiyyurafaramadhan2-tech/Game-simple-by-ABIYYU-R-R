import Phaser from "phaser";
import { PlayerState, PlayerStats }   from "../types/GameTypes";
import { StateMachine }               from "../systems/StateMachine";
import { CooldownManager }            from "../systems/CooldownManager";
import { Bullet }                     from "../objects/Bullet";
import { eventBus }                   from "../EventBus";

const SKILL_KEY   = { DASH:"dash", ATTACK:"attack", PROJ:"proj", ULT:"ult" };
const SKILL_CD    = { DASH:2000, ATTACK:600, PROJ:1200, ULT:10000 };

export class Player extends Phaser.Physics.Arcade.Sprite {
  sm:           StateMachine<PlayerState>;
  cooldowns:    CooldownManager = new CooldownManager();
  stats:        PlayerStats;
  isInvincible: boolean = false;
  facing:       number = 0;                   // angle in degrees
  score:        number = 0;
  bulletGroup:  Phaser.Physics.Arcade.Group;

  // Trail particles
  private dashTrail: Phaser.GameObjects.Particles.ParticleEmitter | null = null;

  // Attack box (invisible zone in front)
  attackBox: Phaser.GameObjects.Zone;

  // Keys
  private keys: any;
  private shift: Phaser.Input.Keyboard.Key;
  private keyF:  Phaser.Input.Keyboard.Key;
  private keyQ:  Phaser.Input.Keyboard.Key;
  private keyJ:  Phaser.Input.Keyboard.Key;

  // State timers
  private stateTimer: number = 0;

  // Mobile skill callbacks (set from GameScene)
  mobileSkill: number | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, "player");
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.stats = {
      maxHp: 120, hp: 120, speed: 200,
      dashSpeed: 650, dashDuration: 220,
      attackDamage: 30, projDamage: 22, ultDamage: 55,
    };

    (this.body as Phaser.Physics.Arcade.Body)
      .setSize(24, 24)
      .setOffset(4, 4)
      .setCollideWorldBounds(true);

    this.setDepth(10);

    // Bullet group
    this.bulletGroup = scene.physics.add.group({
      classType: Bullet,
      maxSize: 30,
      runChildUpdate: true,
    });

    // Attack zone
    this.attackBox = scene.add.zone(x, y, 64, 50);
    scene.physics.world.enable(this.attackBox);
    (this.attackBox.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    this.attackBox.setDepth(5);

    // Trail emitter
    this.dashTrail = scene.add.particles(x, y, "particle", {
      lifespan: 180,
      scale: { start: 0.55, end: 0 },
      alpha: { start: 0.9, end: 0 },
      blendMode: Phaser.BlendModes.ADD,
      tint: 0x4488ff,
      emitting: false,
      frequency: 15,
    });

    // Input
    this.keys  = (scene.input.keyboard as Phaser.Input.Keyboard.KeyboardPlugin)
      .addKeys("W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE");
    this.shift = (scene.input.keyboard as any).addKey("SHIFT");
    this.keyF  = (scene.input.keyboard as any).addKey("F");
    this.keyQ  = (scene.input.keyboard as any).addKey("Q");
    this.keyJ  = (scene.input.keyboard as any).addKey("J");

    // State machine
    this.sm = new StateMachine<PlayerState>(PlayerState.IDLE)
      .addState(PlayerState.IDLE,   { onUpdate: (d) => this.updateIdle(d) })
      .addState(PlayerState.WALK,   { onUpdate: (d) => this.updateWalk(d) })
      .addState(PlayerState.DASH,   {
        onEnter: () => this.enterDash(),
        onUpdate:(d) => this.updateDash(d),
        onExit:  () => this.exitDash(),
      })
      .addState(PlayerState.ATTACK, {
        onEnter: () => this.enterAttack(),
        onUpdate:(d) => this.updateAttack(d),
        onExit:  () => this.exitAttack(),
      })
      .addState(PlayerState.HURT,   {
        onEnter: () => { this.stateTimer = 400; this.setTintFill(0xff4444); },
        onUpdate:(d) => {
          this.stateTimer -= d;
          if (this.stateTimer <= 0) { this.clearTint(); this.sm.transition(PlayerState.IDLE); }
        },
      })
      .addState(PlayerState.DEAD,   {
        onEnter: () => { this.setTintFill(0x880000); this.setAlpha(0.5); },
        onUpdate:() => {},
      });
  }

  // ─── MOVEMENT ──────────────────────────────────────────────────────────────

  private getInputDir(joystick?: { x:number; y:number; active:boolean }): { dx:number; dy:number } {
    let dx = 0, dy = 0;
    if (joystick?.active) {
      dx = joystick.x; dy = joystick.y;
    } else {
      if (this.keys.A?.isDown || this.keys.LEFT?.isDown)  dx -= 1;
      if (this.keys.D?.isDown || this.keys.RIGHT?.isDown) dx += 1;
      if (this.keys.W?.isDown || this.keys.UP?.isDown)    dy -= 1;
      if (this.keys.S?.isDown || this.keys.DOWN?.isDown)  dy += 1;
      const len = Math.sqrt(dx*dx + dy*dy);
      if (len > 0) { dx /= len; dy /= len; }
    }
    return { dx, dy };
  }

  private applyMovement(dx: number, dy: number) {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const targetVx = dx * this.stats.speed;
    const targetVy = dy * this.stats.speed;
    // Smooth acceleration with lerp
    body.velocity.x = Phaser.Math.Linear(body.velocity.x, targetVx, 0.22);
    body.velocity.y = Phaser.Math.Linear(body.velocity.y, targetVy, 0.22);
    if (dx !== 0 || dy !== 0) this.facing = Phaser.Math.RAD_TO_DEG * Math.atan2(dy, dx);
  }

  // ─── STATE UPDATE ──────────────────────────────────────────────────────────

  private updateIdle(delta: number) {
    const { dx, dy } = this.getInputDir((this.scene as any).joystick?.output);
    if (Math.abs(dx) > 0.05 || Math.abs(dy) > 0.05) {
      this.sm.transition(PlayerState.WALK);
    }
    this.applyMovement(dx * 0.05, dy * 0.05);
    this.checkSkillInput();
  }

  private updateWalk(delta: number) {
    const { dx, dy } = this.getInputDir((this.scene as any).joystick?.output);
    if (Math.abs(dx) < 0.05 && Math.abs(dy) < 0.05) {
      this.sm.transition(PlayerState.IDLE);
    }
    this.applyMovement(dx, dy);
    this.checkSkillInput();
  }

  // ─── DASH ──────────────────────────────────────────────────────────────────

  private enterDash() {
    this.isInvincible = true;
    const rad = Phaser.Math.DegToRad(this.facing);
    const vx  = Math.cos(rad) * this.stats.dashSpeed;
    const vy  = Math.sin(rad) * this.stats.dashSpeed;
    (this.body as Phaser.Physics.Arcade.Body).setVelocity(vx, vy);
    this.setTintFill(0x44aaff);
    this.dashTrail?.setPosition(this.x, this.y);
    this.dashTrail?.start();
    this.stateTimer = this.stats.dashDuration;
    this.cooldowns.set(SKILL_KEY.DASH, SKILL_CD.DASH);
  }

  private updateDash(delta: number) {
    this.stateTimer -= delta;
    this.dashTrail?.setPosition(this.x, this.y);
    if (this.stateTimer <= 0) this.sm.transition(PlayerState.IDLE);
  }

  private exitDash() {
    this.isInvincible = false;
    this.clearTint();
    this.dashTrail?.stop();
    (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
  }

  // ─── ATTACK ────────────────────────────────────────────────────────────────

  private enterAttack() {
    this.stateTimer = 350;
    this.setTintFill(0xffff44);
    this.cooldowns.set(SKILL_KEY.ATTACK, SKILL_CD.ATTACK);
    this.positionAttackBox();
    // Attack box active for 200ms
    this.scene.time.delayedCall(200, () => this.clearAttackBox());
  }

  private positionAttackBox() {
    const rad = Phaser.Math.DegToRad(this.facing);
    const dist = 40;
    (this.attackBox as any).setPosition(
      this.x + Math.cos(rad) * dist,
      this.y + Math.sin(rad) * dist,
    );
    (this.attackBox.body as Phaser.Physics.Arcade.Body).reset(
      this.x + Math.cos(rad) * dist,
      this.y + Math.sin(rad) * dist,
    );
  }

  private clearAttackBox() {
    this.attackBox.setPosition(-9999, -9999);
    (this.attackBox.body as Phaser.Physics.Arcade.Body).reset(-9999, -9999);
  }

  private updateAttack(delta: number) {
    this.stateTimer -= delta;
    (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    if (this.stateTimer <= 0) {
      this.clearTint();
      this.sm.transition(PlayerState.IDLE);
    }
  }

  private exitAttack() {
    this.clearTint();
    this.clearAttackBox();
  }

  // ─── SKILLS ────────────────────────────────────────────────────────────────

  checkSkillInput(mobileSkill?: number) {
    const mobile = mobileSkill ?? this.mobileSkill;
    this.mobileSkill = null;

    // Dash (SHIFT or mobile 1)
    if ((Phaser.Input.Keyboard.JustDown(this.shift) || mobile === 0)
      && this.cooldowns.isReady(SKILL_KEY.DASH)
      && !this.sm.is(PlayerState.DASH)) {
      this.sm.transition(PlayerState.DASH);
      return;
    }

    // Melee (SPACE/J or mobile 2)
    if ((Phaser.Input.Keyboard.JustDown(this.keys.SPACE) || Phaser.Input.Keyboard.JustDown(this.keyJ) || mobile === 1)
      && this.cooldowns.isReady(SKILL_KEY.ATTACK)
      && !this.sm.is(PlayerState.ATTACK)) {
      this.sm.transition(PlayerState.ATTACK);
      return;
    }

    // Projectile (F or mobile 3)
    if ((Phaser.Input.Keyboard.JustDown(this.keyF) || mobile === 2)
      && this.cooldowns.isReady(SKILL_KEY.PROJ)) {
      this.fireProjectile();
      this.cooldowns.set(SKILL_KEY.PROJ, SKILL_CD.PROJ);
      return;
    }

    // Ultimate (Q or mobile 4)
    if ((Phaser.Input.Keyboard.JustDown(this.keyQ) || mobile === 3)
      && this.cooldowns.isReady(SKILL_KEY.ULT)) {
      (this.scene as any).triggerUltimate(this);
      this.cooldowns.set(SKILL_KEY.ULT, SKILL_CD.ULT);
    }
  }

  private fireProjectile() {
    const bullet = this.bulletGroup.get(this.x, this.y, "bullet") as Bullet;
    if (!bullet) return;
    bullet.fire(this.x, this.y, this.facing, 480, this.stats.projDamage);
  }

  // ─── DAMAGE ────────────────────────────────────────────────────────────────

  takeDamage(amount: number) {
    if (this.isInvincible || this.sm.is(PlayerState.DEAD)) return;
    this.stats.hp = Math.max(0, this.stats.hp - amount);
    this.sm.transition(PlayerState.HURT);
    this.isInvincible = true;
    this.scene.time.delayedCall(600, () => { this.isInvincible = false; });
    if (this.stats.hp <= 0) {
      this.sm.transition(PlayerState.DEAD);
      eventBus.emit("player-dead");
    }
  }

  // ─── MAIN UPDATE ───────────────────────────────────────────────────────────

  update(delta: number, joystick?: any) {
    if (this.sm.is(PlayerState.DEAD)) return;
    this.cooldowns.update(delta);
    this.sm.update(delta);

    // Emit UI update
    eventBus.emit("ui-update", {
      hp:    this.stats.hp,
      maxHp: this.stats.maxHp,
      score: this.score,
      skills: [
        { name:"Dash",    key:"SHIFT", cd: this.cooldowns.getRemaining(SKILL_KEY.DASH),   maxCd: SKILL_CD.DASH,   color:"#33aaff" },
        { name:"Attack",  key:"SPACE", cd: this.cooldowns.getRemaining(SKILL_KEY.ATTACK), maxCd: SKILL_CD.ATTACK, color:"#ffdd33" },
        { name:"Arrow",   key:"F",     cd: this.cooldowns.getRemaining(SKILL_KEY.PROJ),   maxCd: SKILL_CD.PROJ,   color:"#33ff88" },
        { name:"Ultimate",key:"Q",     cd: this.cooldowns.getRemaining(SKILL_KEY.ULT),    maxCd: SKILL_CD.ULT,    color:"#ff44aa" },
      ],
    });
  }

  getSkillCDs() { return { DASH: SKILL_CD.DASH, ATTACK: SKILL_CD.ATTACK, PROJ: SKILL_CD.PROJ, ULT: SKILL_CD.ULT }; }

  static readonly SKILL_KEY = SKILL_KEY;
  }
