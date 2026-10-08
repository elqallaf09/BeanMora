import { forwardRef, type ComponentProps, type ComponentRef } from 'react';
import * as Native from 'react-native';
import { SafeAreaView as OriginalSafeAreaView } from 'react-native-safe-area-context';
import { themedStyle, themeColor, useTheme } from './theme';
export * from 'react-native';

// Keep native refs, events, virtualization and press-state styles intact.
export const View = forwardRef<
  ComponentRef<typeof Native.View>,
  Native.ViewProps
>((props, ref) => {
  const { dark } = useTheme();
  return (
    <Native.View {...props} ref={ref} style={themedStyle(props.style, dark)} />
  );
});
// Motion containers need the same surface mapping as ordinary Views. Without
// this, animated catalog cards retain a light surface underneath dark-mode text.
const AnimatedView = forwardRef<
  ComponentRef<typeof Native.Animated.View>,
  ComponentProps<typeof Native.Animated.View>
>((props, ref) => {
  const { dark } = useTheme();
  return (
    <Native.Animated.View
      {...props}
      ref={ref}
      style={themedStyle(props.style, dark)}
    />
  );
});
const AnimatedText = forwardRef<
  ComponentRef<typeof Native.Animated.Text>,
  ComponentProps<typeof Native.Animated.Text>
>((props, ref) => {
  const { dark } = useTheme();
  return (
    <Native.Animated.Text
      {...props}
      ref={ref}
      style={themedStyle(props.style, dark)}
    />
  );
});
export const Animated = {
  ...Native.Animated,
  View: AnimatedView,
  Text: AnimatedText,
};
export const ImageBackground = forwardRef<
  ComponentRef<typeof Native.ImageBackground>,
  Native.ImageBackgroundProps
>((props, ref) => {
  const { dark } = useTheme();
  return (
    <Native.ImageBackground
      {...props}
      ref={ref}
      style={themedStyle(props.style, dark)}
    />
  );
});
export const Text = forwardRef<
  ComponentRef<typeof Native.Text>,
  Native.TextProps
>((props, ref) => {
  const { dark } = useTheme();
  return (
    <Native.Text {...props} ref={ref} style={themedStyle(props.style, dark)} />
  );
});
export const TextInput = forwardRef<
  ComponentRef<typeof Native.TextInput>,
  Native.TextInputProps
>((props, ref) => {
  const { dark } = useTheme();
  return (
    <Native.TextInput
      {...props}
      ref={ref}
      style={themedStyle(props.style, dark)}
      placeholderTextColor={themeColor(props.placeholderTextColor, dark)}
      keyboardAppearance={dark ? 'dark' : 'light'}
    />
  );
});
export type TextInput = Native.TextInput;
export const Pressable = forwardRef<
  ComponentRef<typeof Native.View>,
  Native.PressableProps
>((props, ref) => {
  const { dark } = useTheme();
  const style = props.style;
  return (
    <Native.Pressable
      {...props}
      ref={ref}
      style={
        typeof style === 'function'
          ? (state) => themedStyle(style(state), dark)
          : themedStyle(style, dark)
      }
    />
  );
});
export const ScrollView = forwardRef<Native.ScrollView, Native.ScrollViewProps>(
  (props, ref) => {
    const { dark } = useTheme();
    return (
      <Native.ScrollView
        {...props}
        ref={ref}
        style={themedStyle(props.style, dark)}
        contentContainerStyle={themedStyle(props.contentContainerStyle, dark)}
        indicatorStyle={dark ? 'white' : 'black'}
      />
    );
  },
);
export type ScrollView = Native.ScrollView;
export const FlatList = forwardRef<
  Native.FlatList,
  Native.FlatListProps<unknown>
>((props, ref) => {
  const { dark } = useTheme();
  return (
    <Native.FlatList
      {...props}
      ref={ref}
      style={themedStyle(props.style, dark)}
      contentContainerStyle={themedStyle(props.contentContainerStyle, dark)}
      indicatorStyle={dark ? 'white' : 'black'}
    />
  );
}) as unknown as typeof Native.FlatList;
export type FlatList<T> = Native.FlatList<T>;
export const SafeAreaView = forwardRef<
  ComponentRef<typeof OriginalSafeAreaView>,
  ComponentProps<typeof OriginalSafeAreaView>
>((props, ref) => {
  const { dark } = useTheme();
  return (
    <OriginalSafeAreaView
      {...props}
      ref={ref}
      style={themedStyle(props.style, dark)}
    />
  );
});
export function ActivityIndicator(props: Native.ActivityIndicatorProps) {
  const { dark } = useTheme();
  return (
    <Native.ActivityIndicator
      {...props}
      color={themeColor(props.color, dark)}
    />
  );
}
