'use client';

import { useState } from 'react';
import { Section } from '../ui';

/**
 * "Subway Surfers sidebar, for retention." Drop a muted loop at apps/web/public/gameplay.mp4 (or point
 * NEXT_PUBLIC_GAMEPLAY_SRC elsewhere) and it plays here; without one, a neutral lane-runner placeholder.
 */
const SRC = process.env.NEXT_PUBLIC_GAMEPLAY_SRC || '/gameplay.mp4';

export function Gameplay() {
  const [video, setVideo] = useState(true);
  return (
    <Section title="Retention zone">
      <div className="brut relative aspect-[9/12] overflow-hidden rounded-2xl bg-fg">
        {video ? (
          <video src={SRC} autoPlay muted loop playsInline preload="auto" onError={() => setVideo(false)} className="size-full object-cover" aria-label="gameplay footage" />
        ) : (
          <div className="absolute inset-0 overflow-hidden bg-sky" aria-hidden>
            <div className="absolute inset-0 animate-[lane_1.2s_linear_infinite] bg-[repeating-linear-gradient(0deg,transparent_0_36px,rgb(22_19_15/.18)_36px_40px)] [mask-image:linear-gradient(90deg,transparent_14%,#000_14%_16%,transparent_16%_49%,#000_49%_51%,transparent_51%_84%,#000_84%_86%,transparent_86%)]" />
            <div className="absolute bottom-[14%] left-1/2 -translate-x-1/2 animate-bounce text-4xl">🏃</div>
            <div className="absolute left-[20%] top-[22%] animate-[drop_2.4s_linear_infinite] text-2xl">🚧</div>
            <div className="absolute right-[18%] top-[2%] animate-[drop_1.8s_linear_infinite_0.6s] text-2xl">🪙</div>
          </div>
        )}
        <div className="absolute left-2 top-2 -rotate-3 rounded-md border-2 border-line bg-acid px-2 py-0.5 text-[11px] font-extrabold uppercase">for retention</div>
      </div>
    </Section>
  );
}
