import { View } from './native';
import { Action, Txt, styles, useLabels } from './ui';
import type { ConsentChoice } from './coffeeAssistantRemote';

export function CoffeeConsentChoice({ onChoice, disabled, firstQuestion }: { onChoice: (choice: ConsentChoice) => void; disabled?: boolean; firstQuestion?: boolean }) {
  const L = useLabels();
  return <View testID="coffee-online-permission" style={[styles.card, { padding: 16, gap: 10 }]}>
    <Txt heading>{L('الإجابات عبر الإنترنت', 'Online answers')}</Txt>
    <Txt>{L('إذا سمحت، يرسل BeanMora سؤالك ورسائل المحادثة الحديثة التي تتبادلها بعد الموافقة إلى OpenAI لإعداد الإجابة. تجنّب كتابة معلومات شخصية. يمكنك سحب موافقتك من الإعدادات، أو استخدام دليل القهوة من دون إرسال المحادثة إلى OpenAI.', 'If you allow it, BeanMora sends your question and recent conversation messages exchanged after you agree to OpenAI to prepare answers. Avoid entering personal information. You can withdraw permission in Settings, or use the coffee guide without sending your conversation to OpenAI.')}</Txt>
    {firstQuestion ? <Txt>{L('تأتي إجابة سؤالك الحالي من دليل القهوة. إذا وافقت، تبدأ الإجابات عبر الإنترنت مع سؤالك التالي.', 'The coffee guide answers this question. If you allow it, online answers start with your next question.')}</Txt> : null}
    <Action title={L('السماح بالإجابات عبر الإنترنت', 'Allow online answers')} disabled={disabled} onPress={() => onChoice('allow')} />
    <Action title={L('استخدام دليل القهوة', 'Use the coffee guide')} disabled={disabled} onPress={() => onChoice('guide')} />
  </View>;
}
