import { Player, Pentagon } from '../types';

export type SectorInput = {
  averageAttribute: number;
  chemistry: number;
  phase: number;
  stamina: number;
  tacticalBonus: number;
  chaosMax: number;
};

export type MatchTickResult = {
  tick: number;
  outcome: 'goal' | 'defense' | 'turnover';
  probability: number;
  attackPower: number;
  defensePower: number;
  ratings: Record<string, number>;
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const applyChaos = (value: number, chaosMax: number) => {
  const chaos = Math.random() * chaosMax;
  return value * (1 + chaos / 100);
};

export const calculateMatchEvent = (
  tick: number,
  attack: SectorInput,
  defense: SectorInput,
  attackers: Player[] = [],
  defenders: Player[] = []
): MatchTickResult => {
  const baseAttack = attack.averageAttribute * attack.chemistry * attack.phase * attack.stamina * attack.tacticalBonus;
  const baseDefense = defense.averageAttribute * defense.chemistry * defense.phase * defense.stamina * defense.tacticalBonus;

  const attackPower = applyChaos(baseAttack, attack.chaosMax);
  const defensePower = applyChaos(baseDefense, defense.chaosMax);

  const ratio = attackPower / Math.max(1, defensePower);

  // Adjusted probabilities for more realistic football scores
  // Base goal probability is 0.15, up to 0.55 if dominating.
  // Boost base probability if it's a "High Quality" match (high average attributes)
  const qualityFactor = (attack.averageAttribute + defense.averageAttribute) / 1600; // > 1 for elite matches
  const baseProb = 0.15 * Math.max(1, qualityFactor);

  const goalProbability = clamp(baseProb + (ratio - 1) * 0.25, 0.08, 0.60);
  const defenseProbability = clamp(0.15 + (1 / ratio - 1) * 0.12, 0.05, 0.30);

  let outcome: 'goal' | 'defense' | 'turnover' = 'turnover';
  const roll = Math.random();
  if (roll < goalProbability) {
    outcome = 'goal';
  } else if (roll < goalProbability + defenseProbability) {
    outcome = 'defense';
  } else {
    outcome = 'turnover';
  }

  const ratings: Record<string, number> = {};

  // Amplify the significance of individual plays for Match Rating variance
  const attackBonus = outcome === 'goal' ? 2.5 : outcome === 'defense' ? -0.5 : -1.0;
  const defenseBonus = outcome === 'defense' ? 2.0 : outcome === 'goal' ? -1.0 : -0.2;

  attackers.forEach((p) => {
    // Base 5.5 instead of 6 so bad games actually drop ratings low (e.g., 3.0)
    // Good games can spike up to 10
    ratings[p.id] = clamp(5.5 + attackBonus + (ratio - 1) * 1.5, 0, 10);
  });
  defenders.forEach((p) => {
    ratings[p.id] = clamp(5.5 + defenseBonus + (1 - ratio) * 1.2, 0, 10);
  });

  return {
    tick,
    outcome,
    probability: outcome === 'goal' ? goalProbability : outcome === 'defense' ? defenseProbability : 1 - goalProbability - defenseProbability,
    attackPower,
    defensePower,
    ratings
  };
};

export type EvolutionResult = {
  playerId: string;
  newRating: number;
  newPhase: number;
  newPentagon: Pentagon;
  phaseHistory: number[];
  delta: number;
};

export const calculateEvolution = (
  player: Player,
  matchRating: number | null,
  lastPhases: number[],
  isEvolutionFocus: boolean = false,
  isStabilizationFocus: boolean = false,
  matchDifficulty: number = 1.0 // > 1 means opponent was stronger
): EvolutionResult => {
  const currentRating = player.totalRating;
  const potential = Math.min(1000, player.potential);

  const played = matchRating !== null && matchRating > 0;
  const effectiveRating = played ? matchRating : 0;
  const phaseHistory = [effectiveRating, ...lastPhases].slice(0, 3);
  const newPhase = phaseHistory.reduce((sum, v) => sum + v, 0) / Math.max(1, phaseHistory.length);

  // Breakeven logic: higher rated players need better match ratings
  // A 1000 player needs ~7.5, a 500 player needs ~6.0, a 250 player needs ~5.0
  const breakeven = 6.0 + (currentRating - 500) / 333;

  // Difficulty adjustment: if playing against a stronger team, the breakeven is lower
  // Using sqrt to make difficulty impact significant but not overwhelming
  const adjustedBreakeven = breakeven / Math.sqrt(matchDifficulty);

  // Multiplier adjusted: Instead of flat 6, we use a dynamic multiplier.
  // We want bad players performing well to explode, and good players bombing to crash.
  let delta = 0;

  if (played) {
    // How far were they from expected?
    const diff = effectiveRating - adjustedBreakeven;

    // Base multiplier makes 1.0 diff = 10 rating points
    let baseMultiplier = 10;

    if (diff > 0) {
      // Player played BETTER than expected
      // If they are low rated (e.g. 400), they get a massive boost up to 1.5x
      // If they are high rated (e.g. 900), they get the standard boost (they just did their job)
      const ratingFactor = 1.6 - (currentRating / 1000) * 0.6; // 400 = 1.36x, 900 = 1.06x
      delta = diff * baseMultiplier * ratingFactor;
    } else {
      // Player played WORSE than expected
      // If they are high rated (e.g. 1000), they get harshly punished up to 1.5x
      // If they are low rated (e.g. 400), they get the standard loss (they are expected to be bad anyway)
      const ratingFactor = 1.0 + (currentRating / 1000) * 0.5; // 400 = 1.2x, 1000 = 1.5x
      delta = diff * baseMultiplier * ratingFactor;
    }
  } else {
    // If they didn't play at all, they regress slightly (-1 to -3 depending on how good they are)
    delta = -1 - (currentRating / 500);
  }

  // Phase momentum: Being in a great phase adds a small tailwind, bad phase adds headwind
  if (played) {
    if (newPhase >= 8.0) delta += 2;
    else if (newPhase <= 4.0) delta -= 2;
  }

  // Apply individual focus modifiers
  if (isEvolutionFocus && delta > 0) {
    delta *= 1.5; // 50% extra gains if focus
  }
  if (isStabilizationFocus && delta < 0) {
    delta *= 0.5; // Halved losses if stabilization
  }

  // Cap delta at +/- 25
  delta = clamp(Math.round(delta), -25, 25);

  const newPentagon = { ...player.pentagon };
  const keys: Array<keyof Pentagon> = ['FOR', 'AGI', 'INT', 'TAT', 'TEC'];

  // --- Badge/Trait Influence on Delta ---
  let badgeModifier = 1.0;

  if (player.badges.slot1) badgeModifier += 0.05; // Technical Trait: +5% evolution

  if (player.badges.slot2) {
    const positiveTraits = ['Referência', 'Combativo', 'Vertical', 'Cadenciador', 'Líder', 'Inspirador'];
    const negativeTraits = ['Preciosista', 'Individualista', 'Desatento', 'Instável', 'Preguiçoso', 'Pavio Curto'];

    if (positiveTraits.includes(player.badges.slot2)) badgeModifier += 0.1; // Positive: +10%
    if (negativeTraits.includes(player.badges.slot2)) badgeModifier -= 0.1; // Negative: -10%
  }

  if (player.badges.slot3) badgeModifier += 0.2; // Special Trait: +20%

  delta = Math.round(delta * badgeModifier);

  // Focus increases chances of pentagon improvement
  const pentagonChanceMultiplier = isEvolutionFocus ? 1.5 : 1.0;

  if (played && newPhase > 8) {
    const rolls = Math.floor(2 * pentagonChanceMultiplier);
    for (let i = 0; i < rolls; i++) {
      const key = keys[Math.floor(Math.random() * keys.length)];
      newPentagon[key] = clamp(newPentagon[key] + 1, 0, 100);
    }
  } else if (played && newPhase < 5) {
    // Stabilization reduces pentagon decay
    const decayRolls = isStabilizationFocus ? 1 : 2;
    for (let i = 0; i < decayRolls; i++) {
      const key = keys[Math.floor(Math.random() * keys.length)];
      newPentagon[key] = clamp(newPentagon[key] - 1, 0, 100);
    }
  }

  let newRating = clamp(currentRating + delta, 0, potential);
  newRating = Math.min(1000, newRating);

  // Apply a hard floor of 400 to prevent useless players
  // If they fall below 400, they just stagnate at 400.
  newRating = Math.max(400, newRating);

  return {
    playerId: player.id,
    newRating,
    newPhase,
    newPentagon,
    phaseHistory,
    delta
  };
};
