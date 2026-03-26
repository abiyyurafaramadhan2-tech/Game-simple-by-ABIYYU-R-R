"use client";
import dynamic from "next/dynamic";
import { useState, useEffect } from "react";
import { eventBus } from "@/src/game/EventBus";
import { UIState, UISkill } from "@/src/game/types/GameTypes";

const GameCanvas = dynamic(() => import("@/src/game/GameCanvas"), { ssr: false });

const DEFAULT_SKILLS: UISkill[] = [
  { name:"Dash",    key:"SHIFT", cd:0, maxCd:2000,  color:"#33aaff" },
  { name:"Attack",  key:"SPACE", cd:0, maxCd:600,   color:"#ffdd33" },
  { name:"Arrow",   key:"F",     cd:0, maxCd:1200,  color:"#33ff88" },
  { name:"Ultimate",key:"Q",     cd:0, maxCd:10000, color:"#ff44aa" },
];

export default function Page() {
  const [ui,       setUi]       = useState<UIState>({ hp:120, maxHp:120, skills: DEFAULT_SKILLS, score:0, wave:1 });
  const [gameOver, setGameOver] = useState<{ score:number; wave:number } | null>(null);
  const [wave,     setWave]     = useState(1);

  useEffect(() => {
    const onUi = (data: any) => setUi(prev => ({ ...prev, ...data }));
    const onGS = (data: any) => { setWave(data.wave); setUi(p => ({...p, score:data.score, wave:data.wave})); };
    const onDead = (data: any) => setGameOver(data);

    eventBus.on("ui-update",   onUi);
    eventBus.on("game-state",  onGS);
    eventBus.on("game-over",   onDead);

    return () => {
      eventBus.off("ui-update",  onUi);
      eventBus.off("game-state", onGS);
      eventBus.off("game-over",  onDead);
    };
  }, []);

  const hpPct = (ui.hp / ui.maxHp) * 100;
  const hpColor = hpPct > 60 ? "#33ff88" : hpPct > 30 ? "#ffdd33" : "#ff3344";

  return (
    <div className="relative w-full h-full bg-[#08081a] overflow-hidden">
      {/* ── Game Canvas ── */}
      <GameCanvas />

      {/* ── HUD Top-Left: HP ── */}
      <div className="absolute top-3 left-3 hud-panel px-4 py-2 min-w-[180px] z-10">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] tracking-widest text-blue-300 uppercase">HP</span>
          <span className="text-xs font-bold" style={{ color: hpColor }}>
            {ui.hp} / {ui.maxHp}
          </span>
        </div>
        <div className="w-full h-2.5 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-200"
            style={{ width:`${hpPct}%`, background: hpColor, boxShadow:`0 0 8px ${hpColor}` }}
          />
        </div>
      </div>

      {/* ── HUD Top-Right: Score & Wave ── */}
      <div className="absolute top-3 right-3 hud-panel px-4 py-2 text-right z-10">
        <div className="text-[10px] tracking-widest text-blue-300 uppercase">Wave {ui.wave}</div>
        <div className="text-lg font-black text-yellow-300 leading-none mt-0.5">{ui.score.toLocaleString()}</div>
        <div className="text-[9px] text-white/40 uppercase tracking-wider">score</div>
      </div>

      {/* ── HUD Bottom: Skill Bar ── */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2 z-10">
        {ui.skills.map((sk) => {
          const cdRatio = sk.maxCd > 0 ? sk.cd / sk.maxCd : 0;
          const ready   = sk.cd <= 0;
          return (
            <div
              key={sk.name}
              className={`hud-panel flex flex-col items-center px-3 py-2 min-w-[64px] ${ready ? "skill-ready" : ""}`}
              style={{ borderColor: ready ? sk.color + "66" : "rgba(100,120,255,0.2)" }}
            >
              {/* Cooldown ring using conic-gradient */}
              <div className="relative w-10 h-10 mb-1">
                <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="16" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="2.5" />
                  <circle
                    cx="18" cy="18" r="16"
                    fill="none"
                    stroke={sk.color}
                    strokeWidth="2.5"
                    strokeDasharray={`${(1 - cdRatio) * 100.5} 100.5`}
                    strokeLinecap="round"
                    style={{ filter: ready ? `drop-shadow(0 0 4px ${sk.color})` : "none", transition:"stroke-dasharray 0.1s" }}
                  />
                </svg>
                <div
                  className="absolute inset-0 flex items-center justify-center text-[9px] font-bold tracking-wide"
                  style={{ color: ready ? sk.color : "#ffffff88" }}
                >
                  {sk.key}
                </div>
              </div>
              <div className="text-[9px] text-white/60 uppercase tracking-wider leading-none">{sk.name}</div>
              {!ready && (
                <div className="text-[9px] font-mono mt-0.5" style={{ color: sk.color }}>
                  {(sk.cd / 1000).toFixed(1)}s
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Controls hint (Desktop) ── */}
      <div className="absolute bottom-3 right-3 hud-panel px-3 py-2 z-10 hidden md:block">
        <div className="text-[9px] text-white/40 leading-relaxed">
          <div><span className="text-white/70">WASD</span> Move</div>
          <div><span className="text-white/70">SHIFT</span> Dash</div>
          <div><span className="text-white/70">SPACE</span> Attack</div>
          <div><span className="text-white/70">F</span> Arrow</div>
          <div><span className="text-white/70">Q</span> Ultimate</div>
        </div>
      </div>

      {/* ── Game Over Screen ── */}
      {gameOver && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="hud-panel px-12 py-10 text-center max-w-sm w-full mx-4">
            <div className="text-5xl font-black text-red-400 mb-2 tracking-wider">GAME OVER</div>
            <div className="w-16 h-0.5 bg-red-500/50 mx-auto mb-6" />
            <div className="flex justify-center gap-8 mb-8">
              <div>
                <div className="text-3xl font-black text-yellow-300">{gameOver.score.toLocaleString()}</div>
                <div className="text-[10px] text-white/40 uppercase tracking-widest">Score</div>
              </div>
              <div>
                <div className="text-3xl font-black text-blue-300">W{gameOver.wave}</div>
                <div className="text-[10px] text-white/40 uppercase tracking-widest">Wave</div>
              </div>
            </div>
            <button
              onClick={() => { setGameOver(null); window.location.reload(); }}
              className="w-full py-3 rounded-lg font-bold text-sm tracking-widest transition-all hover:scale-105"
              style={{ background:"linear-gradient(135deg,#6633ff,#3366ff)", boxShadow:"0 0 20px rgba(100,80,255,0.5)" }}
            >
              PLAY AGAIN
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
