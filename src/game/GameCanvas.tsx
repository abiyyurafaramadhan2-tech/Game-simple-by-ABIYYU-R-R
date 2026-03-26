"use client";
import { useEffect, useRef } from "react";

export default function GameCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef      = useRef<any>(null);

  useEffect(() => {
    if (gameRef.current || !containerRef.current) return;

    const init = async () => {
      // Load Phaser client-side only
      const Phaser = (await import("phaser")).default;
      (window as any).Phaser = Phaser;

      const { PreloadScene } = await import("./scenes/PreloadScene");
      const { GameScene }    = await import("./scenes/GameScene");

      gameRef.current = new Phaser.Game({
        type:   Phaser.AUTO,
        parent: containerRef.current!,
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
    };

    init();

    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ touchAction: "none" }}
    />
  );
}
