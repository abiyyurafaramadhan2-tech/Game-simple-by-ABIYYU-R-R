import { PreloadScene } from "./scenes/PreloadScene";
import { GameScene }    from "./scenes/GameScene";

export function createMainGame(parent: HTMLDivElement): Phaser.Game {
  // Dynamic import at call site — this file is always loaded client-side
  const Phaser = (window as any).Phaser as typeof import("phaser");

  return new Phaser.Game({
    type:   Phaser.AUTO,
    parent,
    scale: {
      mode:       Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width:  960,
      height: 540,
    },
    backgroundColor: "#08081a",
    physics: {
      default: "arcade",
      arcade:  { gravity: { x:0, y:0 }, debug: false },
    },
    scene: [PreloadScene, GameScene],
    audio: { noAudio: true },
  });
}
