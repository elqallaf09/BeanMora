import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AccessibilityInfo, Animated, Easing, Platform } from "react-native";
const ReducedMotion = createContext(false);
export function MotionProvider({ children }: { children: ReactNode }) {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (active) setReduced(v);
    });
    const event = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduced,
    );
    return () => {
      active = false;
      event.remove();
    };
  }, []);
  return (
    <ReducedMotion.Provider value={reduced}>{children}</ReducedMotion.Provider>
  );
}
export function usePressMotion() {
  const reduced = useContext(ReducedMotion);
  const scale = useRef(new Animated.Value(1)).current;
  const animate = (value: number) => {
    if (reduced) return;
    Animated.spring(scale, {
      toValue: value,
      useNativeDriver: Platform.OS !== "web",
      speed: 35,
      bounciness: 3,
    }).start();
  };
  return {
    style: { transform: [{ scale }] },
    pressIn: () => animate(0.97),
    pressOut: () => animate(1),
  };
}
export function ScreenTransition({ children }: { children: ReactNode }) {
  const reduced = useContext(ReducedMotion);
  const progress = useRef(new Animated.Value(reduced ? 1 : 0)).current;
  useEffect(() => {
    if (reduced) {
      progress.setValue(1);
      return;
    }
    const a = Animated.timing(progress, {
      toValue: 1,
      duration: 190,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== "web",
    });
    a.start();
    return () => a.stop();
  }, [progress, reduced]);
  return (
    <Animated.View
      style={{
        flex: 1,
        opacity: progress,
        transform: [
          {
            translateY: progress.interpolate({
              inputRange: [0, 1],
              outputRange: [7, 0],
            }),
          },
        ],
      }}
    >
      {children}
    </Animated.View>
  );
}
