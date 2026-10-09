import { useContext, useEffect, useState } from 'react';
import { View } from './native';
import { supabase } from './client';
import { Action, Language, Txt, styles } from './ui';
import { TabRail } from './TabRail';
import { directAudience, saveDirectAudience, type DirectAudience } from './core/community-social';
import { StoryModeration } from './CoffeeStories';

export function SettingsSocial({ owner }: { owner: string }) {
  const ar = useContext(Language) === 'ar';
  const [audience, setAudience] = useState<DirectAudience>('everyone'), [busy, setBusy] = useState(false), [error, setError] = useState(''), [blocks, setBlocks] = useState<{ id: string; name: string }[]>([]), [revision, setRevision] = useState(0);
  useEffect(() => { if (!supabase) return; let active = true; const db = supabase;
    void (async () => { const value = await directAudience(db, owner); const blocked = await db.from('blocks').select('blocked_id').eq('blocker_id', owner); if (blocked.error) throw blocked.error; const ids = (blocked.data ?? []).map(b => b.blocked_id); const profiles = ids.length ? await db.from('profiles').select('id,name').in('id', ids) : { data: [] }; if (active) { setAudience(value); setBlocks(profiles.data ?? []); } })().catch(() => { if (active) setError(ar ? 'تعذّر تحميل إعدادات الرسائل.' : 'Could not load message settings.'); });
    return () => { active = false; };
  }, [owner, revision, ar]);
  async function save(value: DirectAudience) { if (!supabase || busy) return; setBusy(true); setError(''); try { await saveDirectAudience(supabase, owner, value); setAudience(value); } catch { setError(ar ? 'تعذّر حفظ الإعداد. حاول مرة ثانية.' : 'Could not save setting. Try again.'); } finally { setBusy(false); } }
  return <View testID="settings-social" style={[styles.card, { padding: 16, gap: 12 }]}>
    <Txt heading style={{ fontWeight: '700' }}>{ar ? 'من يقدر يراسلك؟' : 'Who can message you?'}</Txt>
    <TabRail equal value={audience} items={[{ id: 'everyone', label: ar ? 'الجميع' : 'Everyone' }, { id: 'followers', label: ar ? 'المتابعون' : 'Followers' }, { id: 'off', label: ar ? 'مغلقة' : 'Off' }]} onChange={value => { if (!busy) void save(value as DirectAudience); }} />
    <Txt style={styles.muted}>{ar ? 'المتابعون: الأشخاص الذين يتابعونك وتم قبولهم. إغلاق الرسائل يمنع الرسائل الجديدة. كل رسالة تختفي بعد ٢٤ ساعة من إرسالها.' : 'Followers means people following you whose requests are accepted. Turning messages off stops new messages. Each message expires 24 hours after sending.'}</Txt>
    {error ? <Txt accessibilityRole="alert" style={styles.error}>{error}</Txt> : null}
    {blocks.map(person => <Action key={person.id} compact title={(ar ? 'إلغاء حظر ' : 'Unblock ') + person.name} onPress={() => { if (!supabase) return; void supabase.from('blocks').delete().eq('blocker_id', owner).eq('blocked_id', person.id).then(result => { if (result.error) setError(ar ? 'تعذّر إلغاء الحظر.' : 'Could not unblock.'); else setRevision(n => n + 1); }); }} />)}
    <StoryModeration owner={owner} />
  </View>;
}
