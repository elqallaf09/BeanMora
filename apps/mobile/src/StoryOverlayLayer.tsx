import { useRef, useState } from 'react';
import { PanResponder, Pressable, StyleSheet, View } from './native';
import { Icon, Txt, useLabels, type IconName } from './ui';
import { STORY_TEXT_SIZES, type StoryItem, type StoryOverlays, type StorySticker } from './storyOverlays';

const STICKER_ICON: Record<StorySticker['ref'], IconName> = { recipe: 'v60', coffee: 'bean', roaster: 'roaster' };
const dark = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return ((n >> 16) & 255) * 0.299 + ((n >> 8) & 255) * 0.587 + (n & 255) * 0.114 < 140;
};

function ItemBody({ item, frameWidth }: { item: StoryItem; frameWidth: number }) {
  const L = useLabels();
  if (item.kind === 'text') {
    const light = !dark(item.color);
    return (
      <View style={{ maxWidth: frameWidth * 0.88, paddingHorizontal: item.plate ? 12 : 4, paddingVertical: item.plate ? 7 : 2, borderRadius: 12,
        backgroundColor: item.plate ? (light ? '#000000A6' : '#FFFFFFD9') : 'transparent' }}>
        <Txt style={{ color: item.color, fontSize: STORY_TEXT_SIZES[item.size], lineHeight: STORY_TEXT_SIZES[item.size] * 1.35, fontWeight: '700', textAlign: 'center',
          ...(item.plate ? {} : { textShadowColor: light ? '#000000B3' : '#FFFFFFB3', textShadowRadius: 6, textShadowOffset: { width: 0, height: 1 } }) }}>
          {item.text}
        </Txt>
      </View>
    );
  }
  const kind = item.ref === 'recipe' ? L('وصفة', 'Recipe') : item.ref === 'coffee' ? L('بن', 'Coffee') : L('محمصة', 'Roastery');
  return (
    <View style={{ maxWidth: frameWidth * 0.8, minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8,
      borderRadius: 16, backgroundColor: '#FFFDF7F2', borderWidth: 1, borderColor: '#167B7F' }}>
      <Icon name={STICKER_ICON[item.ref]} size={22} color="#167B7F" />
      <View style={{ flexShrink: 1 }}>
        <Txt style={{ fontSize: 10, lineHeight: 14, color: '#796958' }}>{kind}</Txt>
        <Txt numberOfLines={1} style={{ fontSize: 14, lineHeight: 20, fontWeight: '700', color: '#2B1D14' }}>{item.label}</Txt>
      </View>
    </View>
  );
}

function Placed({ item, index, frame, editable, selected, onMove, onSelect, onSticker }: {
  item: StoryItem; index: number; frame: { width: number; height: number }; editable: boolean; selected: boolean;
  onMove?: (index: number, x: number, y: number) => void; onSelect?: (index: number) => void; onSticker?: (sticker: StorySticker) => void;
}) {
  const L = useLabels();
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [drag, setDrag] = useState<{ dx: number; dy: number } | null>(null);
  const latest = useRef({ item, index, frame, onMove, onSelect });
  latest.current = { item, index, frame, onMove, onSelect };
  const responder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) + Math.abs(g.dy) > 3,
    onPanResponderGrant: () => latest.current.onSelect?.(latest.current.index),
    onPanResponderMove: (_, g) => setDrag({ dx: g.dx, dy: g.dy }),
    onPanResponderRelease: (_, g) => {
      const now = latest.current;
      setDrag(null);
      if (now.frame.width && now.frame.height && Math.abs(g.dx) + Math.abs(g.dy) > 3)
        now.onMove?.(now.index, now.item.x + g.dx / now.frame.width, now.item.y + g.dy / now.frame.height);
    },
    onPanResponderTerminate: () => setDrag(null),
  })).current;
  const position = {
    position: 'absolute' as const,
    left: item.x * frame.width - size.width / 2 + (drag?.dx ?? 0),
    top: item.y * frame.height - size.height / 2 + (drag?.dy ?? 0),
    opacity: size.width ? 1 : 0,
  };
  const measure = (event: { nativeEvent: { layout: { width: number; height: number } } }) => {
    const { width, height } = event.nativeEvent.layout;
    if (Math.abs(width - size.width) > 0.5 || Math.abs(height - size.height) > 0.5) setSize({ width, height });
  };
  if (editable)
    return (
      <View {...responder.panHandlers} onLayout={measure} accessible accessibilityRole="adjustable"
        accessibilityLabel={(item.kind === 'text' ? item.text : item.label) + L(' — اسحب لتحريكه', ' — drag to move')}
        style={[position, selected ? { borderWidth: 1, borderColor: '#FFFFFF', borderStyle: 'dashed', borderRadius: 14, margin: -1 } : null]}>
        <ItemBody item={item} frameWidth={frame.width} />
      </View>
    );
  if (item.kind === 'sticker' && onSticker)
    return (
      <Pressable onLayout={measure} accessibilityRole="button"
        accessibilityLabel={L('فتح: ', 'Open: ') + item.label} onPress={() => onSticker(item)} style={position}>
        <ItemBody item={item} frameWidth={frame.width} />
      </Pressable>
    );
  return <View pointerEvents="none" onLayout={measure} style={position}><ItemBody item={item} frameWidth={frame.width} /></View>;
}

/** Draws a story's text and stickers over its media. In the editor the items
 * can be dragged; in the viewer only stickers respond, and they open their target. */
export function StoryOverlayLayer({ overlays, editable = false, selected = -1, onMove, onSelect, onSticker }: {
  overlays: StoryOverlays | null; editable?: boolean; selected?: number;
  onMove?: (index: number, x: number, y: number) => void; onSelect?: (index: number) => void; onSticker?: (sticker: StorySticker) => void;
}) {
  const [frame, setFrame] = useState({ width: 0, height: 0 });
  if (!overlays?.items.length) return null;
  return (
    <View testID="story-overlays" pointerEvents="box-none" style={StyleSheet.absoluteFill}
      onLayout={(event) => setFrame({ width: event.nativeEvent.layout.width, height: event.nativeEvent.layout.height })}>
      {frame.width ? overlays.items.map((item, index) => (
        <Placed key={index + item.kind + (item.kind === 'text' ? item.text : item.id)} item={item} index={index} frame={frame}
          editable={editable} selected={selected === index} onMove={onMove} onSelect={onSelect} onSticker={onSticker} />
      )) : null}
    </View>
  );
}
