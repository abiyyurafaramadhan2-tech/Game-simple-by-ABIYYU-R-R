export class CooldownManager {
  private cooldowns: Map<string, number> = new Map();

  set(key: string, duration: number) { this.cooldowns.set(key, duration); }

  update(delta: number) {
    this.cooldowns.forEach((v, k) => {
      if (v > 0) this.cooldowns.set(k, Math.max(0, v - delta));
    });
  }

  isReady(key: string): boolean {
    return (this.cooldowns.get(key) ?? 0) <= 0;
  }

  getRatio(key: string, maxCd: number): number {
    return Math.max(0, (this.cooldowns.get(key) ?? 0)) / maxCd;
  }

  getRemaining(key: string): number {
    return this.cooldowns.get(key) ?? 0;
  }
}
