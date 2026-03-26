interface StateHandlers<TState extends string> {
  onEnter?: () => void;
  onUpdate?: (delta: number) => void;
  onExit?: () => void;
}

export class StateMachine<TState extends string> {
  private current: TState;
  private states: Map<TState, StateHandlers<TState>> = new Map();

  constructor(initial: TState) {
    this.current = initial;
  }

  addState(state: TState, handlers: StateHandlers<TState>) {
    this.states.set(state, handlers);
    return this;
  }

  transition(next: TState) {
    if (this.current === next) return;
    this.states.get(this.current)?.onExit?.();
    this.current = next;
    this.states.get(this.current)?.onEnter?.();
  }

  update(delta: number) {
    this.states.get(this.current)?.onUpdate?.(delta);
  }

  getState() { return this.current; }
  is(state: TState) { return this.current === state; }
}
