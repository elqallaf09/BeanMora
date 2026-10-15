import type { Locale } from './copy';

// Owner-approved BeanMora support inbox. Replace here and regenerate the support page.
export const SUPPORT_EMAIL = 'Beanmora.app@gmail.com';
export const SUPPORT_TOPICS = ['support', 'bug', 'report', 'privacy'] as const;
export type SupportTopic = (typeof SUPPORT_TOPICS)[number];
type SupportCopy = {
  title: string;
  intro: string;
  topics: Record<SupportTopic, string>;
  draftHint: string;
  unavailable: string;
  safety: string;
  reportHint: string;
  details: string;
};
export const supportCopy: Record<Locale, SupportCopy> = {
  ar: {
    title: 'تواصل معنا', intro: 'للدعم والاستفسارات والبلاغات، راسل فريق BeanMora عبر البريد التالي.',
    topics: { support: 'دعم واستفسارات', bug: 'الإبلاغ عن مشكلة تقنية', report: 'بلاغ عن محتوى أو مستخدم', privacy: 'الخصوصية والحساب' },
    draftHint: 'يفتح الزر تطبيق البريد برسالة جاهزة. راجع رسالتك واضغط إرسال هناك؛ فتح البريد وحده لا يرسل الرسالة.',
    unavailable: 'تعذّر فتح تطبيق البريد. انسخ عنوان البريد الظاهر وأرسل رسالتك من تطبيق البريد الذي تستخدمه.',
    safety: 'لا ترسل كلمة المرور أو رمز التحقق أو معلومات الدفع.',
    reportHint: 'اذكر اسم المستخدم أو رابط المحتوى أو معرّفه، وسبب البلاغ. أرفق لقطة شاشة عند الحاجة دون كشف بيانات حساسة.',
    details: 'اكتب تفاصيل طلبك هنا:',
  },
  en: {
    title: 'Contact us', intro: 'For help, questions and reports, contact the BeanMora team at this email address.',
    topics: { support: 'Help and questions', bug: 'Report a technical issue', report: 'Report content or a user', privacy: 'Privacy and account' },
    draftHint: 'The button opens a draft in your email app. Review it and press Send there; opening the draft does not send it.',
    unavailable: 'Could not open an email app. Copy the address shown and send your message from your preferred email app.',
    safety: 'Do not send passwords, verification codes or payment details.',
    reportHint: 'Include the username or content link or ID, and the reason for your report. Attach a screenshot if needed without exposing sensitive data.',
    details: 'Describe your request here:',
  },
  ja: {
    title: 'お問い合わせ', intro: 'ご質問、サポートのご依頼、通報は、以下のメールアドレスでBeanMoraチームにご連絡ください。',
    topics: { support: 'サポート・ご質問', bug: '技術的な問題を報告', report: 'コンテンツ・ユーザーを通報', privacy: 'プライバシー・アカウント' },
    draftHint: 'ボタンを押すとメールアプリで下書きが開きます。内容を確認して送信してください。下書きを開くだけでは送信されません。',
    unavailable: 'メールアプリを開けませんでした。表示されているアドレスをコピーし、お使いのメールアプリから送信してください。',
    safety: 'パスワード、認証コード、お支払い情報は送信しないでください。',
    reportHint: 'ユーザー名、コンテンツのリンクまたはIDと、通報理由を記載してください。必要に応じて、機密情報を隠したスクリーンショットを添付してください。',
    details: 'お問い合わせ内容をご記入ください：',
  },
  fr: {
    title: 'Nous contacter', intro: 'Pour toute question, demande d’aide ou signalement, contactez l’équipe BeanMora à cette adresse.',
    topics: { support: 'Aide et questions', bug: 'Signaler un problème technique', report: 'Signaler un contenu ou un utilisateur', privacy: 'Confidentialité et compte' },
    draftHint: 'Le bouton ouvre un brouillon dans votre messagerie. Vérifiez-le et appuyez sur Envoyer ; ouvrir le brouillon ne l’envoie pas.',
    unavailable: 'Impossible d’ouvrir votre messagerie. Copiez l’adresse affichée et envoyez votre message depuis votre messagerie habituelle.',
    safety: 'N’envoyez aucun mot de passe, code de vérification ou renseignement de paiement.',
    reportHint: 'Indiquez le nom d’utilisateur ou le lien ou l’identifiant du contenu, ainsi que le motif du signalement. Joignez une capture d’écran si nécessaire en masquant les données sensibles.',
    details: 'Décrivez votre demande ici :',
  },
  it: {
    title: 'Contattaci', intro: 'Per assistenza, domande e segnalazioni, contatta il team BeanMora a questo indirizzo email.',
    topics: { support: 'Assistenza e domande', bug: 'Segnala un problema tecnico', report: 'Segnala un contenuto o un utente', privacy: 'Privacy e account' },
    draftHint: 'Il pulsante apre una bozza nella tua app email. Controllala e premi Invia; aprire la bozza non la invia.',
    unavailable: 'Impossibile aprire l’app email. Copia l’indirizzo visualizzato e invia il messaggio dalla tua app email.',
    safety: 'Non inviare password, codici di verifica o dati di pagamento.',
    reportHint: 'Indica il nome utente oppure il link o l’ID del contenuto e il motivo della segnalazione. Se necessario, allega uno screenshot nascondendo i dati sensibili.',
    details: 'Descrivi qui la tua richiesta:',
  },
  es: {
    title: 'Contáctanos', intro: 'Para ayuda, consultas y denuncias, escribe al equipo de BeanMora a esta dirección de correo.',
    topics: { support: 'Ayuda y consultas', bug: 'Informar de un problema técnico', report: 'Denunciar contenido o a un usuario', privacy: 'Privacidad y cuenta' },
    draftHint: 'El botón abre un borrador en tu aplicación de correo. Revísalo y pulsa Enviar allí; abrirlo no lo envía.',
    unavailable: 'No se pudo abrir la aplicación de correo. Copia la dirección y envía tu mensaje desde tu aplicación habitual.',
    safety: 'No envíes contraseñas, códigos de verificación ni datos de pago.',
    reportHint: 'Incluye el nombre de usuario o el enlace o identificador del contenido y el motivo de la denuncia. Adjunta una captura si es necesario, ocultando los datos sensibles.',
    details: 'Describe aquí tu solicitud:',
  },
  'pt-BR': {
    title: 'Fale conosco', intro: 'Para ajuda, dúvidas e denúncias, entre em contato com a equipe BeanMora por este e-mail.',
    topics: { support: 'Ajuda e dúvidas', bug: 'Relatar um problema técnico', report: 'Denunciar conteúdo ou usuário', privacy: 'Privacidade e conta' },
    draftHint: 'O botão abre um rascunho no aplicativo de e-mail. Revise e toque em Enviar; abrir o rascunho não envia a mensagem.',
    unavailable: 'Não foi possível abrir o aplicativo de e-mail. Copie o endereço exibido e envie a mensagem pelo seu aplicativo habitual.',
    safety: 'Não envie senhas, códigos de verificação nem dados de pagamento.',
    reportHint: 'Informe o nome de usuário ou o link ou ID do conteúdo e o motivo da denúncia. Anexe uma captura de tela, se necessário, ocultando dados sensíveis.',
    details: 'Descreva sua solicitação aqui:',
  },
  'zh-CN': {
    title: '联系我们', intro: '如需帮助、咨询或举报，请通过以下邮箱联系BeanMora团队。',
    topics: { support: '帮助与咨询', bug: '反馈技术问题', report: '举报内容或用户', privacy: '隐私与账户' },
    draftHint: '点击按钮会在邮件应用中打开草稿。请检查内容并点击发送；仅打开草稿不会发送邮件。',
    unavailable: '无法打开邮件应用。请复制显示的邮箱地址，通过您常用的邮件应用发送消息。',
    safety: '请勿发送密码、验证码或支付信息。',
    reportHint: '请提供用户名、内容链接或内容编号，并说明举报原因。如需附上截图，请先遮盖敏感信息。',
    details: '请在此描述您的请求：',
  },
};

export function getSupportCopy(locale: string): SupportCopy {
  return Object.prototype.hasOwnProperty.call(supportCopy, locale)
    ? supportCopy[locale as Locale] : supportCopy.en;
}

export function buildSupportMailto(locale: string, topic: SupportTopic = 'support'): string {
  const text = getSupportCopy(locale);
  const safeTopic = SUPPORT_TOPICS.includes(topic) ? topic : 'support';
  const subject = `BeanMora — ${text.topics[safeTopic]}`;
  const body = [text.details, '', safeTopic === 'report' ? text.reportHint : '', '', text.safety].filter((line, index, lines) => line || (index > 0 && lines[index - 1])).join('\r\n');
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

// Opening a mail client is not proof of sending or delivery. Never show "sent" here.
export async function openSupportDraft(
  openURL: (url: string) => Promise<unknown>, locale: string, topic: SupportTopic,
): Promise<'opened' | 'unavailable'> {
  try {
    await openURL(buildSupportMailto(locale, topic));
    return 'opened';
  } catch {
    return 'unavailable';
  }
}
