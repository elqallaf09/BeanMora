import { useLabels } from './ui';
import { useContext, useState } from 'react';
import { View } from './native';
import { supabase } from './client';
import { Action, Field, Language, Txt, styles } from './ui';
import { chooseSocialMedia, SocialMediaView } from './SocialMedia';
import { uploadContributionImage } from './core/member-contributions';
import { editProfilePhoto, removeProfilePhoto, type SocialMedia } from './core/community-social';
import { SelectionMenu } from './SelectionMenu';

export function ProfilePhotoActions({ owner, photo, saved }: { owner: string; photo: { id: string; caption: string; kind: 'extraction' | 'corner' }; saved: () => void }) {
  const i18nUi = useLabels();
  const ar = useContext(Language) === 'ar';
  const [editing, setEditing] = useState(false), [deleting, setDeleting] = useState(false), [caption, setCaption] = useState(photo.caption), [kind, setKind] = useState(photo.kind), [replacement, setReplacement] = useState<SocialMedia | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState('');
  async function run(remove: boolean) {
    if (!supabase || busy) return; setBusy(true); setError('');
    try {
      if (remove) await removeProfilePhoto(supabase, owner, photo.id);
      else { const path = replacement ? await uploadContributionImage(supabase, owner, replacement.id, replacement.bytes, 'profile-gallery') : undefined; await editProfilePhoto(supabase, owner, photo.id, caption, kind, path); }
      saved(); setEditing(false); setDeleting(false);
    } catch { setError(ar ? 'تعذّر تأكيد العملية. أعد المحاولة.' : i18nUi('تعذّر تأكيد العملية. أعد المحاولة.', 'Could not confirm action. Try again.')); }
    finally { setBusy(false); }
  }
  return <View style={{ gap: 10 }}>
    <View style={styles.row}><Action compact title={ar ? 'تعديل الصورة' : i18nUi('تعديل الصورة', 'Edit gallery photo')} disabled={busy} onPress={() => { setEditing(!editing); setDeleting(false); }} /><Action compact title={ar ? 'حذف الصورة' : i18nUi('حذف الصورة', 'Delete gallery photo')} disabled={busy} onPress={() => { setDeleting(true); setEditing(false); }} /></View>
    {editing ? <>
      <Field label={ar ? 'تعديل وصف الصورة' : i18nUi('تعديل وصف الصورة', 'Edit photo caption')} value={caption} onChangeText={setCaption} maxLength={2000} editable={!busy} />
      <SelectionMenu label={ar ? 'قسم الصورة' : i18nUi('قسم الصورة', 'Photo section')} value={kind} items={[{ id: 'extraction', name: ar ? 'الاستخلاص' : i18nUi('الاستخلاص', 'Brew') }, { id: 'corner', name: ar ? 'ركن القهوة' : i18nUi('ركن القهوة', 'Coffee corner') }]} onChange={v => setKind(v as 'extraction' | 'corner')} />
      <Action compact title={ar ? 'استبدال الصورة' : i18nUi('استبدال الصورة', 'Replace photo')} disabled={busy} onPress={() => { void chooseSocialMedia('image').then(media => { if (media) setReplacement(media); }).catch(() => setError(ar ? 'اختر صورة JPG أو PNG أو WebP حتى 5 MB.' : i18nUi('اختر صورة JPG أو PNG أو WebP حتى 5 MB.', 'Choose JPG, PNG or WebP up to 5 MB.'))); }} />
      {replacement ? <SocialMediaView source={replacement.uri} type="image" label={ar ? 'الصورة البديلة' : i18nUi('الصورة البديلة', 'Replacement photo')} /> : null}
      <Action title={ar ? 'حفظ تعديل الصورة' : i18nUi('حفظ تعديل الصورة', 'Save photo changes')} selected disabled={busy} onPress={() => void run(false)} />
      <Action compact title={ar ? 'إلغاء تعديل الصورة' : i18nUi('إلغاء تعديل الصورة', 'Cancel photo changes')} disabled={busy} onPress={() => setEditing(false)} />
    </> : null}
    {deleting ? <><Txt>{ar ? 'حذف الصورة من الاستخلاص وركن القهوة؟' : i18nUi('حذف الصورة من الاستخلاص وركن القهوة؟', 'Remove this photo from brews and coffee corner?')}</Txt><Action title={ar ? 'تأكيد حذف الصورة' : i18nUi('تأكيد حذف الصورة', 'Confirm delete photo')} disabled={busy} onPress={() => void run(true)} /><Action compact title={ar ? 'إلغاء حذف الصورة' : i18nUi('إلغاء حذف الصورة', 'Cancel photo deletion')} disabled={busy} onPress={() => setDeleting(false)} /></> : null}
    {error ? <Txt accessibilityRole="alert" style={styles.error}>{error}</Txt> : null}
  </View>;
}
