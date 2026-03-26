export enum PlayerState { IDLE="IDLE", WALK="WALK", DASH="DASH", ATTACK="ATTACK", HURT="HURT", DEAD="DEAD" }
export enum EnemyState  { PATROL="PATROL", CHASE="CHASE", WINDUP="WINDUP", ATTACK="ATTACK", STUNNED="STUNNED", DEAD="DEAD" }

export type BTStatus = "SUCCESS" | "FAILURE" | "RUNNING";
export type BTNode   = (delta: number) => BTStatus;

export interface PlayerStats {
  maxHp:    number;
  hp:       number;
  speed:    number;
  dashSpeed:    number;
  dashDuration: number;
  attackDamage: number;
  projDamage:   number;
  ultDamage:    number;
}

export interface EnemyStats {
  maxHp:          number;
  hp:             number;
  speed:          number;
  damage:         number;
  detectionRadius: number;
  attackRadius:   number;
}

export interface UISkill {
  name:    string;
  key:     string;
  cd:      number;
  maxCd:   number;
  color:   string;
}

export interface UIState {
  hp:     number;
  maxHp:  number;
  skills: UISkill[];
  score:  number;
  wave:   number;
}
