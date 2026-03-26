import Phaser from "phaser";
import { EnemyState, EnemyStats, BTStatus } from "../types/GameTypes";
import { sequence, selector, condition, action } from "../systems/BehaviorTree";
import { FloatingText } from "../objects/FloatingText";
import { Player } from "./Player";

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  stats:       EnemyStats;
  state:       EnemyState = EnemyState.PATROL;
  private stateTimer: number = 0;
  private patrolTimer: number = 0;
  private patrolVx:    number = 0;
  private patrolVy:    number = 0;
  private floatingTexts: FloatingText[] = [];
  private btRoot: (delta: number) => BTStatus;
  private isDead: boolean = false;

  // References set by GameScene
  player: Player | null = null;
  allEnemies: Enemy[] = [];

  constructor(scene: Phaser.Scene, x: number, y: number, type: "normal" | "elite" = "normal") {
    super(scene, x, y, type === "elite" ? "enemy2" : "enemy");
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.stats = type === "elite"
      ? { maxHp:80,  hp:80,  speed:90,  damage:20, detectionRadius:280, attackRadius:52 }
      : { maxHp:40,  hp:40,  speed:70,  damage:12, detectionRadius:220, attackRadius:46 };

    (this.body as Phaser.Physics.Arcade.Body)
      .setSize(26, 26).setOffset(3, 3);

    if (type === "elite") this.setScale(1.2);

    // Build behavior tree
    this.btRoot = selector(
      // Attack sequence
      sequence(
        condition(() => this.distToPlayer() < this.stats.attackRadius),
        condition(() => this.stateTimer <= 0),
        action((delta) => this.executeAttack(delta)),
      ),
      // Windup sequence
      sequence(
        condition(() => this.state === EnemyState.WINDUP),
        action((delta) => {
          this.stateTimer -= delta;
          (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
          return this.stateTimer > 0 ? "RUNNING" : "SUCCESS";
        }),
      ),
      // Chase sequence
      sequence(
        condition(() => this.distToPlayer() < this.stats.detectionRadius),
        action((delta) => { this.chase(delta); return "SUCCESS"; }),
      ),
      // Patrol
      action((delta) => { this.patrol(delta); return "SUCCESS"; }),
    );
  }

  private distToPlayer(): number {
    if (!this.player) return 99999;
    return Phaser.Math.Distance.Between(this.x, this.y, this.player.x, this.player.y);
  }

  private chase(delta: number) {
    if (!this.player) return;
    this.state = EnemyState.CHASE;
    const angle = Phaser.Math.Angle.Between(this.x, this.y, this.player.x, this.player.y);
    const speed = this.stats.speed;
    const targetVx = Math.cos(angle) * speed;
    const targetVy = Math.sin(angle) * speed;
    // Steering with separation
    const sep   = this.getSeparation();
    const body  = this.body as Phaser.Physics.Arcade.Body;
    body.velocity.x = Phaser.Math.Linear(body.velocity.x, targetVx + sep.x, 0.15);
    body.velocity.y = Phaser.Math.Linear(body.velocity.y, targetVy + sep.y, 0.15);
  }

  private patrol(delta: number) {
    this.state = EnemyState.PATROL;
    this.patrolTimer -= delta;
    if (this.patrolTimer <= 0) {
      this.patrolTimer = Phaser.Math.Between(1800, 3500);
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const speed = this.stats.speed * 0.45;
      this.patrolVx = Math.cos(angle) * speed;
      this.patrolVy = Math.sin(angle) * speed;
    }
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.velocity.x = Phaser.Math.Linear(body.velocity.x, this.patrolVx, 0.08);
    body.velocity.y = Phaser.Math.Linear(body.velocity.y, this.patrolVy, 0.08);
  }

  private executeAttack(_delta: number): BTStatus {
    if (this.state !== EnemyState.WINDUP && this.state !== EnemyState.ATTACK) {
      this.state = EnemyState.WINDUP;
      this.stateTimer = 550;
      (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
      this.setTintFill(0xff8800);
      return "RUNNING";
    }
    if (this.state === EnemyState.WINDUP) return "RUNNING";

    // Execute
    this.state = EnemyState.ATTACK;
    this.clearTint();
    this.player?.takeDamage(this.stats.damage);
    this.stateTimer = 1200;
    this.state      = EnemyState.CHASE;
    return "SUCCESS";
  }

  private getSeparation(): { x: number; y: number } {
    let sx = 0, sy = 0;
    const minDist = 52;
    for (const other of this.allEnemies) {
      if (other === this || !other.active) continue;
      const d = Phaser.Math.Distance.Between(this.x, this.y, other.x, other.y);
      if (d < minDist && d > 0) {
        const force = (minDist - d) / minDist;
        sx += (this.x - other.x) / d * force * 120;
        sy += (this.y - other.y) / d * force * 120;
      }
    }
    return { x: sx, y: sy };
  }

  takeDamage(amount: number) {
    if (this.isDead) return;
    this.stats.hp -= amount;
    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(100, () => {
      if (this.active) this.clearTint();
    });
    // Floating text
    const ft = new FloatingText(this.scene, this.x, this.y - 10, amount, "#ffdd44");
    this.floatingTexts.push(ft);

    if (this.stats.hp <= 0) this.die();
  }

  private die() {
    this.isDead = true;
    this.state  = EnemyState.DEAD;
    this.setActive(false);
    this.setVisible(false);
    (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    (this.body as Phaser.Physics.Arcade.Body).enable = false;
  }

  update(delta: number) {
    if (this.isDead) {
      this.floatingTexts = this.floatingTexts.filter(ft => {
        ft.update(delta); return !ft.done;
      });
      return;
    }
    if (this.stateTimer > 0 && this.state !== EnemyState.WINDUP) this.stateTimer -= delta;
    this.btRoot(delta);
    this.floatingTexts = this.floatingTexts.filter(ft => {
      ft.update(delta); return !ft.done;
    });

    // Windup → attack
    if (this.state === EnemyState.WINDUP && this.stateTimer <= 0) {
      this.state = EnemyState.ATTACK;
      this.clearTint();
      this.player?.takeDamage(this.stats.damage);
      this.stateTimer = 1000;
    }
  }
}
