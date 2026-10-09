import { useContext, useEffect, useRef, useState } from 'react';
import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus, useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import { AppState, Platform, View } from './native';
import { Action, Language, Txt, styles } from './ui';
import { useContentMedia } from './useContentMedia';

export type VoiceDraft = { uri: string; seconds: number; mime: string; extension: string };
export function RecordVoice({ saved, disabled, onRecordingChange }: { saved: (voice: VoiceDraft) => void; disabled: boolean; onRecordingChange: (value: boolean) => void }) {
  const ar = useContext(Language) === 'ar';
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const started = useRef(0), captured = useRef(false), alive = useRef(true), inFlight = useRef(false);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const state = useAudioRecorderState(recorder, 150);
  const finish = async () => {
    if (captured.current || !started.current || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    try {
      if (recorder.isRecording) await recorder.stop();
      const uri = recorder.uri;
      if (uri && alive.current) {
        const seconds = Math.min(60, Math.max(0.1, (Date.now() - started.current) / 1000));
        captured.current = true;
        const webm = Platform.OS === 'web';
        saved({ uri, seconds, mime: webm ? 'audio/webm' : 'audio/mp4', extension: webm ? 'webm' : 'm4a' });
      }
      await setAudioModeAsync({ allowsRecording: false, shouldPlayInBackground: false });
    } catch { if (alive.current) setError(ar ? 'تعذّر تجهيز التسجيل. حاول مرة ثانية.' : 'Could not prepare recording. Try again.'); }
    finally { inFlight.current = false; if (alive.current) setBusy(false); }
  };
  useEffect(() => { onRecordingChange(busy || state.isRecording); }, [busy, state.isRecording, onRecordingChange]);
  useEffect(() => {
    alive.current = true;
    const listener = AppState.addEventListener('change', status => { if (status !== 'active' && recorder.isRecording) void finish(); });
    return () => { alive.current = false; listener.remove(); onRecordingChange(false); if (recorder.isRecording) void recorder.stop(); void setAudioModeAsync({ allowsRecording: false, shouldPlayInBackground: false }); };
  }, [recorder]);
  useEffect(() => {
    if (!state.isRecording && !recorder.isRecording && started.current && recorder.uri && !captured.current) void finish();
  }, [state.isRecording, state.url]);
  async function start() {
    if (busy || disabled || inFlight.current) return;
    setBusy(true); setError('');
    try {
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) throw new Error('MICROPHONE');
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true, shouldPlayInBackground: false });
      await recorder.prepareToRecordAsync();
      captured.current = false; started.current = Date.now();
      // Leave a small container/encoder margin below the strict 60-second cap.
      recorder.record({ forDuration: 59.5 });
    } catch { setError(ar ? 'اسمح باستخدام الميكروفون للتسجيل.' : 'Allow microphone access to record.'); }
    finally { setBusy(false); }
  }
  return <View style={{ gap: 6 }}>
    <Action compact title={state.isRecording ? (ar ? 'إيقاف التسجيل' : 'Stop recording') : (ar ? 'تسجيل صوتي' : 'Record voice')} disabled={disabled || busy} onPress={() => void (state.isRecording ? finish() : start())} />
    <Txt style={styles.muted}>{state.isRecording ? `${Math.min(60, Math.floor(state.durationMillis / 1000))} / 60` : (ar ? 'دقيقة واحدة كحد أقصى' : 'Up to one minute')}</Txt>
    {error ? <Txt style={styles.error}>{error}</Txt> : null}
  </View>;
}
export function VoicePlayback({ source, seconds, expiresAt }: { source: string; seconds: number; expiresAt?: string }) {
  const url = useContentMedia(source, expiresAt);
  return url ? <Audio key={url} url={url} seconds={seconds} /> : <Txt style={styles.muted}>…</Txt>;
}
function Audio({ url, seconds }: { url: string; seconds: number }) {
  const ar = useContext(Language) === 'ar';
  const player = useAudioPlayer(url);
  const state = useAudioPlayerStatus(player);
  return <View style={[styles.row, { flexWrap: 'wrap' }]}>
    <Action compact title={state.playing ? (ar ? 'إيقاف الصوت' : 'Pause voice') : (ar ? 'تشغيل الصوت' : 'Play voice')} onPress={() => { if (state.playing) player.pause(); else { if (state.didJustFinish) void player.seekTo(0); player.play(); } }} />
    <Txt>{Math.ceil(seconds)} {ar ? 'ث' : 's'}</Txt>
  </View>;
}
