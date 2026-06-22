const SOUND_KEY = 'elite.sound';
const HAPTICS_KEY = 'elite.haptics';
const MATCH_NOTIFICATIONS_KEY = 'elite.matchNotifications';
export const INITIAL_HELP_KEY = 'elite.initialHelp';
export const ONBOARDING_SEEN_KEY = 'elite2050:onboarding:v1';
let lastInteractionFeedbackAt = 0;

const isEnabled = (key: string, fallback = true) => {
  if (typeof window === 'undefined') return fallback;
  return window.localStorage.getItem(key) !== 'off';
};

export const isSoundEnabled = () => isEnabled(SOUND_KEY);
export const isHapticsEnabled = () => isEnabled(HAPTICS_KEY);
export const isInitialHelpEnabled = () => isEnabled(INITIAL_HELP_KEY);
export const isMatchNotificationsEnabled = () => isEnabled(MATCH_NOTIFICATIONS_KEY, false);

export const setSoundEnabled = (enabled: boolean) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(SOUND_KEY, enabled ? 'on' : 'off');
  window.dispatchEvent(new Event('elite-ui-preferences-changed'));
};

export const setHapticsEnabled = (enabled: boolean) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(HAPTICS_KEY, enabled ? 'on' : 'off');
  window.dispatchEvent(new Event('elite-ui-preferences-changed'));
};

export const setInitialHelpEnabled = (enabled: boolean) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(INITIAL_HELP_KEY, enabled ? 'on' : 'off');
  window.localStorage.setItem('elite.homeGuideHidden', enabled ? 'false' : 'true');

  if (enabled) {
    window.localStorage.removeItem(ONBOARDING_SEEN_KEY);
  }
  window.dispatchEvent(new Event('elite-ui-preferences-changed'));
};

export const setMatchNotificationsEnabled = (enabled: boolean) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(MATCH_NOTIFICATIONS_KEY, enabled ? 'on' : 'off');
  window.dispatchEvent(new Event('elite-ui-preferences-changed'));
};

export const playClickSound = () => {
  if (!isSoundEnabled()) return;

  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;

    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.05);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.05);
    window.setTimeout(() => ctx.close().catch(() => undefined), 90);
  } catch {
    // Browser autoplay policies can block short UI tones.
  }
};

const playToneSequence = (tones: Array<{ frequency: number; start: number; duration: number; gain?: number }>) => {
  if (!isSoundEnabled()) return;

  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;

    const ctx = new AudioContext();
    tones.forEach((tone) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(tone.frequency, ctx.currentTime + tone.start);
      gain.gain.setValueAtTime(tone.gain ?? 0.08, ctx.currentTime + tone.start);
      gain.gain.exponentialRampToValueAtTime(0.006, ctx.currentTime + tone.start + tone.duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + tone.start);
      osc.stop(ctx.currentTime + tone.start + tone.duration);
    });
    window.setTimeout(() => ctx.close().catch(() => undefined), 260);
  } catch {
    // Short tones are non-critical polish.
  }
};

export const playEliteSound = (tier: 'top50' | 'top10' | 'top3' = 'top50') => {
  if (tier === 'top3') {
    playToneSequence([
      { frequency: 660, start: 0, duration: 0.08, gain: 0.08 },
      { frequency: 990, start: 0.07, duration: 0.1, gain: 0.09 },
      { frequency: 1320, start: 0.16, duration: 0.12, gain: 0.08 },
    ]);
    return;
  }

  if (tier === 'top10') {
    playToneSequence([
      { frequency: 540, start: 0, duration: 0.07 },
      { frequency: 920, start: 0.08, duration: 0.11 },
    ]);
    return;
  }

  playToneSequence([
    { frequency: 520, start: 0, duration: 0.06, gain: 0.06 },
    { frequency: 760, start: 0.06, duration: 0.08, gain: 0.06 },
  ]);
};

export const triggerHaptic = (pattern: number | number[] = 15) => {
  if (!isHapticsEnabled()) return;

  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(pattern);
  }
};

export const runInteractionFeedback = () => {
  const now = Date.now();
  if (now - lastInteractionFeedbackAt < 90) return;
  lastInteractionFeedbackAt = now;
  playClickSound();
  triggerHaptic();
};

export const runElitePlayerFeedback = (tier: 'top50' | 'top10' | 'top3' = 'top50') => {
  playEliteSound(tier);
  triggerHaptic(tier === 'top3' ? [18, 20, 28] : tier === 'top10' ? [16, 18, 16] : [12, 14]);
};
