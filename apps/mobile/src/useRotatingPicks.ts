import { useEffect, useRef, useState } from "react";
import { Animated, AppState, Platform } from "./native";
import { useReducedMotion } from "./Motion";

export function useRotatingPicks(count: number, pageSize: number) {
  const [offset, setOffset] = useState(0);
  const [foreground, setForeground] = useState(
    AppState.currentState !== "background",
  );
  const held = useRef(false),
    focused = useRef(false);
  const progress = useRef(new Animated.Value(1)).current;
  const reduced = useReducedMotion();
  useEffect(() => {
    const event = AppState.addEventListener("change", (state) =>
      setForeground(state === "active"),
    );
    return () => event.remove();
  }, []);
  useEffect(() => {
    if (!foreground || count <= pageSize) return;
    let active = true;
    const timer = setInterval(() => {
      if (held.current || focused.current) return;
      if (reduced) {
        setOffset((n) => (n + pageSize) % count);
        return;
      }
      Animated.timing(progress, {
        toValue: 0,
        duration: 120,
        useNativeDriver: Platform.OS !== "web",
        isInteraction: false,
      }).start(({ finished }) => {
        if (!active || !finished) return;
        if (!held.current && !focused.current)
          setOffset((n) => (n + pageSize) % count);
        Animated.timing(progress, {
          toValue: 1,
          duration: 220,
          useNativeDriver: Platform.OS !== "web",
          isInteraction: false,
        }).start();
      });
    }, 3000);
    return () => {
      active = false;
      clearInterval(timer);
      progress.stopAnimation();
      progress.setValue(1);
    };
  }, [count, pageSize, foreground, progress, reduced]);
  return {
    offset,
    style: {
      opacity: progress,
      transform: [
        {
          translateY: progress.interpolate({
            inputRange: [0, 1],
            outputRange: [5, 0],
          }),
        },
      ],
    },
    hold: () => {
      held.current = true;
    },
    release: () => {
      held.current = false;
    },
    focus: () => {
      focused.current = true;
    },
    blur: () => {
      focused.current = false;
    },
  };
}
