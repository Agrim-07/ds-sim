export const RANKS = Object.freeze([
  { name: 'Novice', xp: 0 },
  { name: 'Apprentice', xp: 200 },
  { name: 'Adept', xp: 500 },
  { name: 'Expert', xp: 950 },
  { name: 'Master', xp: 1500 },
  { name: 'Grandmaster', xp: 2000 },
]);

const STAR_BONUS = 15;

export function rankFor(xp) {
  let index = 0;
  while (index + 1 < RANKS.length && xp >= RANKS[index + 1].xp) index += 1;
  const current = RANKS[index];
  const next = RANKS[index + 1] ?? null;
  const progress = next ? (xp - current.xp) / (next.xp - current.xp) : 1;
  return { current, next, progress: Math.max(0, Math.min(1, progress)) };
}

/** 3 stars for a flawless run, 2 for one or two mistakes, 1 otherwise. */
export function starsFor(mistakes) {
  if (mistakes === 0) return 3;
  return mistakes <= 2 ? 2 : 1;
}

export function xpForMission(mission, stars) {
  if (!mission) return 0;
  return mission.reward.xp + (Math.max(1, stars) - 1) * STAR_BONUS;
}
