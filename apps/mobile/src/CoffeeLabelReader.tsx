import { useRef } from 'react';
import { WebView } from 'react-native-webview';
import { View } from './native';
import { readCoffeeOcrEvent, type CoffeeLabelReaderProps } from './coffeeOcr';
const reader = 'https://beanmora-mobile.expo.app/coffee-ocr/reader.html';
export function CoffeeLabelReader({ job, event }: CoffeeLabelReaderProps) {
  const ref = useRef<WebView>(null);
  return <View pointerEvents="none" accessible={false} style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }}>
    <WebView ref={ref} source={{ uri: reader }} javaScriptEnabled domStorageEnabled
      originWhitelist={['https://beanmora-mobile.expo.app']} mixedContentMode="never"
      onShouldStartLoadWithRequest={request => request.url === reader}
      onError={() => event({ type: 'error' })} onHttpError={() => event({ type: 'error' })}
      onMessage={message => {
        try {
          const parsed = readCoffeeOcrEvent(JSON.parse(message.nativeEvent.data), job.id);
          if (parsed === 'ready') ref.current?.injectJavaScript(`window.postMessage(${JSON.stringify({ ...job, channel: 'beanmora-coffee-ocr', type: 'recognize' })}, location.origin);true;`);
          else if (parsed) event(parsed);
        } catch { event({ type: 'error' }); }
      }} />
  </View>;
}
