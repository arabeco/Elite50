import { Manager, PlayStyle, TrainingState } from '../types';

export const TACTICAL_MEMORY_MASTERED_AT = 82;
export const TACTICAL_MEMORY_TRANSFER_FLOOR = 35;

export const getManagerTacticalMemory = (manager: Manager | null | undefined, style: PlayStyle | string | null | undefined) => {
  if (!manager || !style) return 0;
  return manager.tacticalMemory?.[style] || 0;
};

export const applyManagerTacticalMemoryFloor = (
  training: TrainingState,
  manager: Manager | null | undefined,
  style: PlayStyle | null
): TrainingState => {
  if (!style) {
    return {
      ...training,
      playstyleTraining: {
        ...training.playstyleTraining,
        currentStyle: null,
      },
    };
  }

  const savedUnderstanding = getManagerTacticalMemory(manager, style);
  const transferFloor = savedUnderstanding >= TACTICAL_MEMORY_MASTERED_AT
    ? TACTICAL_MEMORY_TRANSFER_FLOOR
    : Math.floor(savedUnderstanding / 3);
  const currentUnderstanding = training.playstyleTraining.understanding[style] || 0;

  return {
    ...training,
    playstyleTraining: {
      ...training.playstyleTraining,
      currentStyle: style,
      understanding: {
        ...training.playstyleTraining.understanding,
        [style]: Math.max(currentUnderstanding, transferFloor),
      },
    },
  };
};

export const recordManagerTacticalMemory = (
  manager: Manager | null | undefined,
  style: PlayStyle | string | null | undefined,
  understanding: number,
) => {
  if (!manager || !style || understanding < TACTICAL_MEMORY_MASTERED_AT) return manager;

  const currentMemory = manager.tacticalMemory?.[style] || 0;
  if (currentMemory >= understanding) return manager;

  return {
    ...manager,
    tacticalMemory: {
      ...(manager.tacticalMemory || {}),
      [style]: understanding,
    },
  };
};
