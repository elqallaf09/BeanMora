import { useContext } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line, Polyline, Text as SvgText } from 'react-native-svg';
import { Language, Txt, colors, styles } from './ui';
import { clockTime, type RoastPoint } from './roastLab';

export function RoastCurve({
  series,
}: {
  series: { name: string; points: RoastPoint[] }[];
}) {
  const ar = useContext(Language) === 'ar';
  const lines = series.map((s) => ({
    ...s,
    points: s.points
      .filter(
        (p) =>
          p.bean_temp_c !== null &&
          Number.isFinite(Number(p.bean_temp_c)) &&
          p.elapsed_seconds >= 0,
      )
      .sort((a, b) => a.elapsed_seconds - b.elapsed_seconds),
  }));
  const all = lines.flatMap((s) => s.points);
  if (!all.length)
    return (
      <View style={[styles.card, { backgroundColor: '#F6F0E8' }]}>
        <Txt style={styles.muted}>
          {ar
            ? 'أضف قراءات الحرارة من الماكينة ليظهر منحنى الحمصة.'
            : 'Add measured machine temperatures to display the roast curve.'}
        </Txt>
      </View>
    );
  const duration = Math.max(60, ...all.map((p) => p.elapsed_seconds));
  const low = Math.min(0, ...all.map((p) => Number(p.bean_temp_c)));
  const high = Math.max(100, ...all.map((p) => Number(p.bean_temp_c))) + 10;
  const palette = [colors.teal, colors.copper, '#775C94'];
  const x = (t: number) => 42 + (t / duration) * 500;
  const y = (t: number) => 184 - ((t - low) / (high - low)) * 160;
  return (
    <View
      testID="roast-curve"
      style={[styles.card, { marginBottom: 0, padding: 10 }]}
    >
      <Txt heading style={{ fontWeight: '700', fontSize: 16 }}>
        {ar ? 'منحنى حرارة البن' : 'Bean temperature curve'}
      </Txt>
      <Svg
        width="100%"
        height={210}
        viewBox="0 0 566 218"
        accessibilityLabel={
          ar
            ? 'منحنى القراءات المسجلة للحرارة مقابل الوقت'
            : 'Recorded bean temperature against time'
        }
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <Line
            key={i}
            x1={42}
            x2={542}
            y1={24 + i * 40}
            y2={24 + i * 40}
            stroke={colors.line}
          />
        ))}
        {[low, (high + low) / 2, high].map((v) => (
          <SvgText
            key={v}
            x={37}
            y={y(v) + 4}
            textAnchor="end"
            fontSize={10}
            fill={colors.muted}
          >
            {Math.round(v)}°
          </SvgText>
        ))}
        {[0, duration / 2, duration].map((v) => (
          <SvgText
            key={v}
            x={x(v)}
            y={205}
            textAnchor="middle"
            fontSize={10}
            fill={colors.muted}
          >
            {clockTime(Math.round(v))}
          </SvgText>
        ))}
        {lines.map((s, i) => (
          <Polyline
            key={s.name + i}
            points={s.points
              .map((p) => x(p.elapsed_seconds) + ',' + y(Number(p.bean_temp_c)))
              .join(' ')}
            fill="none"
            stroke={palette[i % palette.length]}
            strokeWidth={2.5}
          />
        ))}
        {lines.map((s, i) =>
          s.points.length < 40
            ? s.points.map((p, j) => (
                <Circle
                  key={`${i}-${j}`}
                  cx={x(p.elapsed_seconds)}
                  cy={y(Number(p.bean_temp_c))}
                  r={3.5}
                  fill={palette[i % palette.length]}
                />
              ))
            : null,
        )}
      </Svg>
      <View
        style={{
          flexDirection: ar ? 'row-reverse' : 'row',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        {lines.map((s, i) => (
          <View
            key={s.name + i}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}
          >
            <View
              style={{
                width: 10,
                height: 10,
                borderRadius: 5,
                backgroundColor: palette[i % palette.length],
              }}
            />
            <Txt style={{ fontSize: 12 }}>{s.name}</Txt>
          </View>
        ))}
      </View>
      <Txt style={{ fontSize: 11, color: colors.muted }}>
        {ar
          ? 'النقاط هي قراءاتك المسجّلة؛ الخط يصل بينها.'
          : 'Points are your recorded measurements; lines connect them.'}
      </Txt>
    </View>
  );
}
