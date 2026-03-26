import { BTNode, BTStatus } from "../types/GameTypes";

export const sequence = (...nodes: BTNode[]): BTNode =>
  (delta) => {
    for (const node of nodes) {
      const status = node(delta);
      if (status !== "SUCCESS") return status;
    }
    return "SUCCESS";
  };

export const selector = (...nodes: BTNode[]): BTNode =>
  (delta) => {
    for (const node of nodes) {
      const status = node(delta);
      if (status !== "FAILURE") return status;
    }
    return "FAILURE";
  };

export const condition = (fn: () => boolean): BTNode =>
  () => fn() ? "SUCCESS" : "FAILURE";

export const action = (fn: (delta: number) => BTStatus): BTNode =>
  (delta) => fn(delta);
