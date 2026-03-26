type Fn = (...args: any[]) => void;

class EventBus {
  private map: Map<string, Fn[]> = new Map();

  on(event: string, fn: Fn) {
    if (!this.map.has(event)) this.map.set(event, []);
    this.map.get(event)!.push(fn);
  }

  off(event: string, fn: Fn) {
    this.map.set(event, (this.map.get(event) || []).filter(f => f !== fn));
  }

  emit(event: string, ...args: any[]) {
    (this.map.get(event) || []).forEach(fn => fn(...args));
  }
}

export const eventBus = new EventBus();
