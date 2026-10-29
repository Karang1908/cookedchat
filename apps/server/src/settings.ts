import { PERSONAS } from '@cooked/shared';
import type { BrainrotLevel, PersonaId, RoastIntensity, RoomSettings, RoomTimings } from '@cooked/shared';

export type SettingsPatch = Partial<Omit<RoomSettings, 'timings'>> & { timings?: Partial<RoomTimings> };

const MIN_MS = 200;
const MAX_MS = 7 * 24 * 60 * 60_000;

/** Returns a new settings object; ignores anything invalid instead of throwing (admin UI sends partial junk). */
export function applySettingsPatch(cur: RoomSettings, patch: SettingsPatch): RoomSettings {
  const next: RoomSettings = { ...cur, timings: { ...cur.timings } };
  if (Number.isInteger(patch.brainrot) && patch.brainrot! >= 0 && patch.brainrot! <= 3) next.brainrot = patch.brainrot as BrainrotLevel;
  if (Number.isInteger(patch.intensity) && patch.intensity! >= 1 && patch.intensity! <= 3) next.intensity = patch.intensity as RoastIntensity;
  if (typeof patch.persona === 'string' && patch.persona in PERSONAS) next.persona = patch.persona as PersonaId;
  if (typeof patch.commentary === 'boolean') next.commentary = patch.commentary;
  if (typeof patch.autopilotBots === 'boolean') next.autopilotBots = patch.autopilotBots;
  if (typeof patch.chaos === 'boolean') next.chaos = patch.chaos;
  if (typeof patch.jumpscare === 'boolean') next.jumpscare = patch.jumpscare;
  if (typeof patch.duel === 'boolean') next.duel = patch.duel;
  if (typeof patch.aiEvery === 'number' && Number.isFinite(patch.aiEvery)) next.aiEvery = Math.max(0, Math.min(20, Math.round(patch.aiEvery)));
  if (patch.rival === null || (typeof patch.rival === 'string' && patch.rival in PERSONAS)) next.rival = patch.rival as PersonaId | null;
  for (const [k, v] of Object.entries(patch.timings ?? {})) {
    if (!(k in next.timings) || typeof v !== 'number' || !Number.isFinite(v)) continue;
    const key = k as keyof RoomTimings;
    next.timings[key] = key === 'burstCount' ? Math.min(50, Math.max(2, Math.round(v))) : Math.min(MAX_MS, Math.max(MIN_MS, Math.round(v)));
  }
  return next;
}
