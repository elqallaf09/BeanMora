import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);
function compile(source) {
  return ts.transpileModule(source, { compilerOptions: {
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
}
// Render the shipped primitive wrappers. No DOM / react-native-web responder is
// substituted: the capture decision below comes from the installed native RN.
const module = { exports: {} };
runInNewContext(compile(readFileSync(new URL('../src/native.tsx', import.meta.url), 'utf8')), {
  module, exports: module.exports,
  require: name => name === './theme' ? { useTheme: () => ({ dark: false }), themedStyle: style => style }
    : name === 'react-native' ? { ScrollView: 'NativeScrollView', FlatList: 'NativeFlatList', Animated: { View: 'AnimatedView', Text: 'AnimatedText' } }
    : name === 'react-native-safe-area-context' ? { SafeAreaView: 'NativeSafeAreaView' }
    : require(name),
});

const source = readFileSync(require.resolve('react-native/Libraries/Components/ScrollView/ScrollView.js'), 'utf8');
const start = source.indexOf('  _handleStartShouldSetResponderCapture:');
const end = source.indexOf('\n  /**', start);
assert.ok(start >= 0 && end > start, 'Native capture implementation must be available');
const input = { type: 'TextInput' }, button = { type: 'Pressable' };
const NativeCapture = runInNewContext(compile(`class NativeCapture { ${source.slice(start, end)} }\nNativeCapture;`), {
  TextInputState: { isTextInput: target => target === input }, __DEV__: false,
});
function captures(props, target = button) {
  const scroll = new NativeCapture();
  scroll.props = props;
  scroll._isAnimating = () => false;
  scroll._softKeyboardIsDetached = () => false;
  scroll._keyboardIsDismissible = () => true;
  return scroll._handleStartShouldSetResponderCapture({ target });
}

test('reproduces native first-tap interception with a focused input', () => {
  assert.equal(captures({}), true, 'RN default consumes the search/category press');
  assert.equal(captures({}, input), false, 'the focused input remains usable');
});
for (const name of ['ScrollView', 'FlatList']) {
  test(`${name} lets search and category buttons receive the first native tap`, () => {
    const props = module.exports[name].render({}, null).props;
    assert.equal(captures(props), false);
    assert.equal(props.keyboardDismissMode, 'on-drag');
  });
  test(`${name} preserves explicit keyboard behavior for special screens`, () => {
    const props = module.exports[name].render({ keyboardShouldPersistTaps: 'never', keyboardDismissMode: 'none' }, null).props;
    assert.equal(captures(props), true);
    assert.equal(props.keyboardDismissMode, 'none');
  });
}
