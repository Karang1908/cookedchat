'use client';

import { Section } from '../ui';

/**
 * "Subway Surfers sidebar, for retention." That footage is someone else's IP, so this ships a neutral lane-runner
 * placeholder. Set NEXT_PUBLIC_GAMEPLAY_SRC (e.g. /gameplay.mp4, a muted loop in /public) to play a video instead.
 */
const SRC = process.env.NEXT_PUBLIC_GAMEPLAY_SRC;

export function Gameplay() {
  return (
    <Section title="Retention zone">
      <div className="relative aspect-[16/11] overflow-hidden rounded-xl bg-surface ring-1 ring-line">
        {SRC ? (
          <video src={SRC} autoPlay muted loop playsInline className="size-full object-cover" />
        ) : (
          <div className="absolute inset-0 overflow-hidden" aria-hidden>
            <div className="absolute inset-0 animate-[lane_1.2s_linear_infinite] bg-[repeating-linear-gradient(0deg,transparent_0_36px,rgb(255_255_255/.08)_36px_40px)] [mask-image:linear-gradient(90deg,transparent_14%,#000_14%_16%,transparent_16%_49%,#000_49%_51%,transparent_51%_84%,#000_84%_86%,transparent_86%)]" />
            <div className="absolute bottom-[14%] left-1/2 -translate-x-1/2 animate-bounce text-3xl">🏃</div>
            <div className="absolute left-[20%] top-[22%] animate-[drop_2.4s_linear_infinite] text-xl">🚧</div>
            <div className="absolute right-[18%] top-[2%] animate-[drop_1.8s_linear_infinite_0.6s] text-xl">🪙</div>
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2 text-center text-[11px] text-white/70">satisfying gameplay, for retention</div>
      </div>
    </Section>
  );
}
