import { useId } from 'react';
import Svg, { Defs, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { StyleSheet, View } from './native';

// Recreate the approved home mockup's copper engraving, steam and flowing
// espresso background as local vectors. Copy and the CTA remain real controls.
export function HomeHeroBackground({ rtl }: { rtl: boolean }) {
  const gradient = `hero-background-${useId().replace(/:/g, '')}`;
  return (
    <View pointerEvents="none" accessible={false} accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%" viewBox="0 0 740 250" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id={gradient} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#51311E" />
            <Stop offset="0.55" stopColor="#352014" />
            <Stop offset="1" stopColor="#45291B" />
          </LinearGradient>
        </Defs>
        <Rect width="740" height="250" fill={`url(#${gradient})`} />
        <G transform={rtl ? undefined : 'translate(740 0) scale(-1 1)'}>
          <Path d="M0 148 C38 139 47 196 85 223 C145 269 199 215 258 196 C314 176 359 212 415 245 C339 218 298 207 249 226 C176 256 121 279 63 241 C29 220 18 193 0 188Z" fill="#9B603C" opacity={0.18} />
          <Path d="M0 188 C48 202 55 247 118 246 C182 246 217 208 277 211 C331 212 370 233 415 250 L0 250Z" fill="#B7784D" opacity={0.12} />
        </G>
      </Svg>
    </View>
  );
}

export function HomeHeroBean() {
  return (
    <View pointerEvents="none" accessible={false} accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants" style={artStyle.bean}>
      <Svg width="100%" height="100%" viewBox="0 0 240 265" preserveAspectRatio="xMidYMid meet">
        <G fill="#C88A61">
          <Path d="M63 113 C84 83 55 68 70 35 C46 62 74 82 63 113Z" />
          <Path d="M93 83 C115 54 88 40 106 10 C79 37 104 54 93 83Z" />
        </G>
        <G fill="none" stroke="#C88A61" strokeLinecap="round" strokeLinejoin="round">
          <Path strokeWidth="5" d="M37 224 C17 196 48 148 87 119 C123 91 177 67 201 88 C227 111 221 163 197 201 C177 235 143 252 101 252 C70 253 48 242 37 224Z" />
          <Path strokeWidth="3.5" d="M40 219 C31 195 60 151 96 124 C132 97 170 82 194 88 M201 92 C180 102 176 128 160 143 C131 170 88 183 62 212 C54 222 52 231 57 239" />
          <Path strokeWidth="5" d="M188 86 C191 109 161 135 133 152 C105 170 79 184 61 204 C49 217 45 228 48 236" />
          <Path strokeWidth="2.5" d="M177 89 C171 115 145 132 119 149 C86 170 67 183 50 207 M202 105 C181 126 184 137 163 158 C139 181 111 198 98 222 C92 233 91 242 96 248 M211 124 C204 166 180 210 150 231 C130 245 111 248 97 247 M206 156 C192 189 178 213 153 230 M196 178 C185 204 163 225 139 236 M71 236 C65 214 97 189 120 176 M80 241 C73 224 91 205 109 192" />
          <Path strokeWidth="1.5" opacity={0.75} d="M63 170 C87 141 119 117 151 103 M53 186 C79 153 107 132 134 118 M108 237 C110 220 129 203 147 187 M121 237 C139 224 157 207 167 187" />
        </G>
      </Svg>
    </View>
  );
}

const artStyle = StyleSheet.create({
  bean: { width: '34%', maxWidth: 240, height: 174, alignSelf: 'center' },
});
