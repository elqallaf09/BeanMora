import {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useVideoPlayer, VideoView } from "expo-video";
import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  AppState,
  Image,
  Modal,
  PanResponder,
  Pressable,
  SafeAreaView,
  StyleSheet,
  View,
} from "./native";
import { IconButton, Language, Txt } from "./ui";
import { MemberAvatar } from "./MemberAvatar";
import { useContentMedia } from "./useContentMedia";
import type { CoffeeStory } from "./core/community-social";
import type { MemberIdentity } from "./core/member-social";

export function StoryViewer({
  stories,
  initialId,
  profiles,
  owner,
  close,
  remove,
  report,
  busy,
  suspended,
  overlay,
}: {
  stories: CoffeeStory[];
  initialId: string;
  profiles: Record<string, MemberIdentity>;
  owner: string | null;
  close: () => void;
  remove: (story: CoffeeStory) => void;
  report: (story: CoffeeStory) => void;
  busy: boolean;
  suspended?: boolean;
  overlay?: ReactNode;
}) {
  const ar = useContext(Language) === "ar";
  const [index, setIndex] = useState(
    Math.max(
      0,
      stories.findIndex((s) => s.id === initialId),
    ),
  );
  const [held, setHeld] = useState(false),
    [foreground, setForeground] = useState(
      AppState.currentState !== "background",
    ),
    [progress, setProgress] = useState(0);
  const current = stories[index];
  const paused = held || busy || suspended || !foreground;
  const step = useCallback(
    (direction: number) => {
      setHeld(false);
      if (index + direction >= stories.length) close();
      else if (index + direction >= 0) {
        setProgress(0);
        setIndex(index + direction);
      }
    },
    [index, stories.length, close],
  );
  useEffect(() => {
    const event = AppState.addEventListener("change", (state) =>
      setForeground(state === "active"),
    );
    return () => event.remove();
  }, []);
  useEffect(() => {
    if (!current?.expires_at) {
      close();
      return;
    }
    const remaining = Date.parse(current.expires_at) - Date.now();
    if (remaining <= 0) {
      step(1);
      return;
    }
    const timer = setTimeout(() => step(1), Math.min(remaining, 2147483647));
    return () => clearTimeout(timer);
  }, [current, step, close]);
  const swipe = PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 25 || g.dy > 35,
    onPanResponderRelease: (_, g) => {
      if (g.dy > 70) close();
      else if (Math.abs(g.dx) > 60) step((g.dx < 0 ? 1 : -1) * (ar ? -1 : 1));
    },
  });
  if (!current) return null;
  const member = profiles[current.user_id];
  return (
    <Modal
      visible
      animationType="fade"
      presentationStyle="fullScreen"
      onRequestClose={() => {
        if (!suspended && !busy) close();
      }}
      statusBarTranslucent
    >
      <SafeAreaProvider>
        <SafeAreaView
          testID="story-viewer"
          accessibilityViewIsModal
          style={{ flex: 1, backgroundColor: "#090909" }}
        >
          <View
            style={{
              flex: 1,
              width: "100%",
              maxWidth: 600,
              alignSelf: "center",
            }}
            {...swipe.panHandlers}
          >
            <StoryMedia
              key={current.id}
              story={current}
              paused={Boolean(paused)}
              next={() => step(1)}
              progress={setProgress}
            />
            <View style={[StyleSheet.absoluteFill, { flexDirection: "row" }]}>
              {[ar ? 1 : -1, ar ? -1 : 1].map((direction) => (
                <Pressable
                  key={direction}
                  accessibilityRole="button"
                  accessibilityLabel={
                    direction === 1
                      ? ar
                        ? "القصة التالية"
                        : "Next story"
                      : ar
                        ? "القصة السابقة"
                        : "Previous story"
                  }
                  onPress={() => step(direction)}
                  onLongPress={() => setHeld(true)}
                  onPressOut={() => setHeld(false)}
                  style={{ flex: direction === 1 ? 2 : 1 }}
                />
              ))}
            </View>
            <View
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                padding: 12,
                gap: 10,
                backgroundColor: "#0007",
              }}
            >
              <View
                testID="story-progress"
                style={{ flexDirection: ar ? "row-reverse" : "row", gap: 4 }}
              >
                {stories.map((s, i) => (
                  <View
                    key={s.id}
                    style={{
                      flex: 1,
                      height: 3,
                      backgroundColor: "#FFFFFF55",
                      borderRadius: 3,
                      overflow: "hidden",
                    }}
                  >
                    <View
                      style={{
                        height: 3,
                        width: `${i < index ? 100 : i === index ? progress * 100 : 0}%`,
                        backgroundColor: "#FFFFFF",
                      }}
                    />
                  </View>
                ))}
              </View>
              <View
                style={{
                  flexDirection: ar ? "row-reverse" : "row",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <MemberAvatar
                  name={member?.name ?? ""}
                  url={member?.avatar_url}
                  size={34}
                />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Txt
                    numberOfLines={1}
                    style={{
                      fontWeight: "700",
                      fontSize: 14,
                      color: "#FFFFFF",
                    }}
                  >
                    {member?.name ?? (ar ? "عضو" : "Member")}
                  </Txt>
                  <Txt style={{ fontSize: 11, color: "#FFFFFF" }}>
                    {new Date(current.created_at).toLocaleTimeString(
                      ar ? "ar-KW-u-nu-latn" : "en",
                      { hour: "2-digit", minute: "2-digit" },
                    )}
                  </Txt>
                </View>
                <IconButton
                  name={paused ? "play" : "pause"}
                  label={
                    paused
                      ? ar
                        ? "تشغيل القصة"
                        : "Play story"
                      : ar
                        ? "إيقاف القصة مؤقتًا"
                        : "Pause story"
                  }
                  color="#FFFFFF"
                  onPress={() => setHeld((v) => !v)}
                />
                {current.user_id === owner ? (
                  <IconButton
                    name="trash"
                    color="#FFFFFF"
                    label={ar ? "حذف القصة" : "Delete story"}
                    onPress={() => remove(current)}
                  />
                ) : owner ? (
                  <IconButton
                    name="more"
                    color="#FFFFFF"
                    label={
                      ar ? "بلاغ: خارج موضوع القهوة" : "Report off-topic story"
                    }
                    onPress={() => report(current)}
                  />
                ) : null}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={ar ? "إغلاق القصة" : "Close story"}
                  onPress={close}
                  style={{
                    minWidth: 44,
                    minHeight: 44,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Txt style={{ fontSize: 27, color: "#FFFFFF" }}>×</Txt>
                </Pressable>
              </View>
            </View>
            {current.caption ? (
              <View
                pointerEvents="none"
                style={{
                  position: "absolute",
                  bottom: 30,
                  left: 16,
                  right: 16,
                  backgroundColor: "#0007",
                  padding: 12,
                  borderRadius: 12,
                }}
              >
                <Txt
                  numberOfLines={5}
                  style={{ color: "#FFFFFF", fontSize: 16 }}
                >
                  {current.caption}
                </Txt>
              </View>
            ) : null}
          </View>
          {overlay}
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}
function StoryMedia({
  story,
  paused,
  next,
  progress,
}: {
  story: CoffeeStory;
  paused: boolean;
  next: () => void;
  progress: (n: number) => void;
}) {
  const ar = useContext(Language) === "ar";
  const url = useContentMedia("storage://coffee-stories/" + story.media_path);
  const [ready, setReady] = useState(false),
    [failed, setFailed] = useState(false);
  const elapsed = useRef(0),
    advance = useRef(next);
  advance.current = next;
  useEffect(() => {
    if (story.media_type !== "image" || paused || !ready || failed) return;
    let last = Date.now();
    const timer = setInterval(() => {
      const now = Date.now();
      elapsed.current += now - last;
      last = now;
      progress(Math.min(1, elapsed.current / 7000));
      if (elapsed.current >= 7000) {
        clearInterval(timer);
        advance.current();
      }
    }, 100);
    return () => clearInterval(timer);
  }, [paused, ready, failed, progress, story.media_type]);
  if (failed)
    return (
      <View style={{ flex: 1, justifyContent: "center", padding: 20 }}>
        <Txt accessibilityRole="alert" style={{ color: "#FFFFFF" }}>
          {ar
            ? "تعذّر عرض هذه القصة. انتقل للقصة التالية."
            : "Could not display this story. Tap for the next story."}
        </Txt>
      </View>
    );
  if (!url)
    return (
      <View style={{ flex: 1, justifyContent: "center", padding: 20 }}>
        <Txt style={{ color: "#FFFFFF" }}>
          {ar ? "جارٍ تحميل القصة…" : "Loading story…"}
        </Txt>
      </View>
    );
  return story.media_type === "video" ? (
    <StoryVideo
      url={url}
      paused={paused}
      next={next}
      progress={progress}
      failed={() => setFailed(true)}
    />
  ) : (
    <Image
      source={{ uri: url }}
      resizeMode="contain"
      accessibilityLabel={story.caption || (ar ? "قصة قهوة" : "Coffee story")}
      style={{ flex: 1, width: "100%" }}
      onLoad={() => setReady(true)}
      onError={() => setFailed(true)}
    />
  );
}
function StoryVideo({
  url,
  paused,
  next,
  progress,
  failed,
}: {
  url: string;
  paused: boolean;
  next: () => void;
  progress: (n: number) => void;
  failed: () => void;
}) {
  const player = useVideoPlayer(url, (p) => {
    p.loop = false;
    p.timeUpdateEventInterval = 0.1;
    p.play();
  });
  const advance = useRef(next),
    onFail = useRef(failed);
  advance.current = next;
  onFail.current = failed;
  useEffect(() => {
    if (paused) player.pause();
    else player.play();
    return () => player.pause();
  }, [player, paused]);
  useEffect(() => {
    const end = player.addListener("playToEnd", () => advance.current());
    const time = player.addListener("timeUpdate", (event) => {
      if (player.duration > 0)
        progress(Math.min(1, event.currentTime / player.duration));
    });
    const status = player.addListener("statusChange", (event) => {
      if (event.status === "error") onFail.current();
    });
    return () => {
      end.remove();
      time.remove();
      status.remove();
    };
  }, [player, progress]);
  return (
    <VideoView
      player={player}
      nativeControls={false}
      contentFit="contain"
      style={{ flex: 1, width: "100%" }}
    />
  );
}
