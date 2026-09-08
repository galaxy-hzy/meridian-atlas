// A session owns one utterance. Detached or late browser events must not
// update a closed dialog or a newer reading session.
export function createReadAloudSession(
  synth: Pick<SpeechSynthesis, 'speak' | 'cancel'>,
  utterance: SpeechSynthesisUtterance,
  onFinish: (reason: 'ended' | 'error') => void,
) {
  let state: 'ready' | 'speaking' | 'finished' = 'ready';
  const detach = () => {
    utterance.onend = null;
    utterance.onerror = null;
  };
  const finish = (reason: 'ended' | 'error') => {
    if (state !== 'speaking') return;
    state = 'finished';
    detach();
    onFinish(reason);
  };
  return {
    start() {
      if (state !== 'ready') return;
      state = 'speaking';
      utterance.onend = () => finish('ended');
      utterance.onerror = () => finish('error');
      try {
        synth.speak(utterance);
      } catch {
        finish('error');
      }
    },
    stop() {
      const wasSpeaking = state === 'speaking';
      state = 'finished';
      detach();
      if (wasSpeaking) {
        try {
          synth.cancel();
        } catch {
          // Cleanup must still complete if the device's speech service fails.
        }
      }
    },
  };
}
