import { useEffect, useRef, useState } from 'react';
import { randomUUID } from 'expo-crypto';
import { Keyboard, KeyboardAvoidingView, Modal, Platform, ScrollView, View } from './native';
import { supabase } from './client';
import { requireMember } from './core/member-contributions';
import { Action, Field, Txt, colors, styles, useLabels } from './ui';

export type ModerationTarget = { kind: 'post' | 'comment'; id: string; author: string };

export function CommunityModeration({ owner, target, close, reported, blocked }: {
  owner: string;
  target: ModerationTarget;
  close: () => void;
  reported: () => void;
  blocked: (author: string) => void;
}) {
  const L = useLabels();
  const [step, setStep] = useState<'menu' | 'report' | 'block'>('menu');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const sending = useRef(false);
  const reportId = useRef<string | null>(null);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);

  async function submit() {
    if (!supabase || sending.current || target.author === owner || step === 'menu') return;
    if (step === 'report' && reason.trim().length < 3) return;
    sending.current = true;
    setBusy(true);
    setError('');
    Keyboard.dismiss();
    try {
      await requireMember(supabase, owner);
      if (step === 'report') {
        // A lost response must not turn a retry into a duplicate report.
        const id = reportId.current ?? (reportId.current = randomUUID());
        const write = await supabase.from('reports').insert({
          id, reporter_id: owner, target_type: target.kind, target_id: target.id,
          reason: 'other', details: reason.trim(),
        }).select('id').single();
        if (write.error || write.data?.id !== id) {
          const check = await supabase.from('reports').select('id').eq('id', id)
            .eq('reporter_id', owner).eq('target_type', target.kind).eq('target_id', target.id).maybeSingle();
          if (check.error || check.data?.id !== id) throw write.error ?? check.error ?? new Error('REPORT_UNCONFIRMED');
        }
        if (alive.current) reported();
      } else {
        const write = await supabase.from('blocks').upsert({ blocker_id: owner, blocked_id: target.author }, {
          onConflict: 'blocker_id,blocked_id', ignoreDuplicates: true,
        });
        const check = await supabase.from('blocks').select('blocked_id')
          .eq('blocker_id', owner).eq('blocked_id', target.author).maybeSingle();
        if (check.error || check.data?.blocked_id !== target.author) throw write.error ?? check.error ?? new Error('BLOCK_UNCONFIRMED');
        if (alive.current) blocked(target.author);
      }
    } catch {
      if (alive.current) setError(L('لم يتأكد الإجراء. حاول مرة ثانية.', 'Action was not confirmed. Please retry.'));
    } finally {
      sending.current = false;
      if (alive.current) setBusy(false);
    }
  }

  const cancel = () => { if (!sending.current) close(); };
  return <Modal transparent visible animationType="fade" onRequestClose={cancel}>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#0008' }}>
      <ScrollView keyboardShouldPersistTaps="handled" style={{ width: '100%', maxWidth: 440, maxHeight: '85%', flexGrow: 0 }}
        contentContainerStyle={{ backgroundColor: colors.paper, borderRadius: 20, padding: 20, gap: 14 }}>
        <View testID="community-moderation" accessibilityViewIsModal style={{ gap: 14 }}>
          <Txt heading style={styles.subtitle}>{L('خيارات الحساب', 'Member options')}</Txt>
          {step === 'menu' ? <>
            <Action title={L('الإبلاغ عن المحتوى', 'Report content')} onPress={() => setStep('report')} />
            <Action title={L('حظر الحساب', 'Block member')} onPress={() => setStep('block')} />
          </> : step === 'report' ? <>
            <Txt>{L('الإبلاغ عن المحتوى', 'Report content')}</Txt>
            <Field label={L('سبب البلاغ', 'Report reason')} value={reason} onChangeText={setReason} multiline maxLength={1000} editable={!busy} />
            <Action selected title={L('إرسال البلاغ', 'Send report')} disabled={busy || reason.trim().length < 3} onPress={() => void submit()} />
          </> : <>
            <Txt>{L('حظر هذا الحساب ومنع الرسائل الجديدة بينكما؟ يمكنك إلغاء الحظر من الإعدادات.', 'Block this member and stop new messages between you? You can unblock in Settings.')}</Txt>
            <Action selected title={L('تأكيد الحظر', 'Confirm block')} disabled={busy} onPress={() => void submit()} />
          </>}
          {error ? <Txt accessibilityRole="alert" style={styles.error}>{error}</Txt> : null}
          <Action title={L('إلغاء', 'Cancel')} disabled={busy} onPress={cancel} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  </Modal>;
}
