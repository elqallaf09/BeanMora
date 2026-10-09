// Read durations from the actual containers produced by expo-audio. Unknown or
// malformed files fail closed. WebM block timing uses the maximum Opus packet
// length (120 ms), so the recorder leaves a 500 ms margin below one minute.
export function voiceDuration(bytes: Uint8Array): number {
  if (bytes.length < 16 || bytes.length > 8388608) throw new Error('VOICE_SIZE');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const text = (start: number, count: number) => String.fromCharCode(...bytes.slice(start, start + count));
  if (text(4, 4) === 'ftyp') {
    type Track = { scale: number; duration: number; samples: number; ticks: number; rate: number; handler: string; codec: string };
    const tracks: Track[] = [];
    let movieSeconds = 0;
    const walk = (start: number, end: number, track: Track | null = null, depth = 0) => {
      if (depth > 8) throw new Error('VOICE_FORMAT');
      for (let offset = start; offset + 8 <= end;) {
        let length = view.getUint32(offset), header = 8;
        if (length === 1) { if (offset + 16 > end) throw new Error('VOICE_FORMAT'); length = Number(view.getBigUint64(offset + 8)); header = 16; }
        if (length === 0) length = end - offset;
        if (length < header || offset + length > end) throw new Error('VOICE_FORMAT');
        const kind = text(offset + 4, 4), data = offset + header, finish = offset + length;
        if (kind === 'mvhd' || kind === 'mdhd') {
          const version = bytes[data], scaleAt = data + (version === 1 ? 20 : 12);
          if (version > 1 || scaleAt + (version === 1 ? 12 : 8) > finish) throw new Error('VOICE_FORMAT');
          const scale = view.getUint32(scaleAt), duration = version === 1 ? Number(view.getBigUint64(scaleAt + 4)) : view.getUint32(scaleAt + 4);
          if (!scale) throw new Error('VOICE_FORMAT');
          if (kind === 'mvhd') movieSeconds = duration / scale;
          else if (track) { track.scale = scale; track.duration = duration; }
        } else if (kind === 'hdlr' && track) {
          if (data + 12 > finish) throw new Error('VOICE_FORMAT');
          track.handler = text(data + 8, 4);
        } else if (kind === 'stts' && track) {
          if (data + 8 > finish) throw new Error('VOICE_FORMAT');
          const count = view.getUint32(data + 4);
          if (data + 8 + count * 8 > finish) throw new Error('VOICE_FORMAT');
          for (let n = 0; n < count; n++) { const samples = view.getUint32(data + 8 + n * 8), delta = view.getUint32(data + 12 + n * 8); track.samples += samples; track.ticks += samples * delta; }
        } else if (kind === 'stsd' && track) {
          // expo-audio's native preset and Safari record AAC in an mp4a entry.
          const entry = data + 8;
          if (data + 8 > finish || view.getUint32(data + 4) !== 1 || entry + 36 > finish || view.getUint32(entry) < 36) throw new Error('VOICE_FORMAT');
          track.codec = text(entry + 4, 4); track.rate = view.getUint32(entry + 32) / 65536;
        } else if (kind === 'trak') {
          const next: Track = { scale: 0, duration: 0, samples: 0, ticks: 0, rate: 0, handler: '', codec: '' };
          tracks.push(next); walk(data, finish, next, depth + 1);
        } else if (['moov', 'mdia', 'minf', 'stbl'].includes(kind)) walk(data, finish, track, depth + 1);
        offset = finish;
      }
    };
    walk(0, bytes.length);
    if (!tracks.length || tracks.some(t => t.handler !== 'soun' || t.codec !== 'mp4a' || !t.scale || !t.rate || !t.samples)) throw new Error('VOICE_FORMAT');
    // Check movie metadata, track metadata, sample timing and AAC frame count.
    // Changing only mvhd (or compression timestamps) cannot disguise long audio.
    const seconds = Math.max(movieSeconds, ...tracks.flatMap(t => [t.duration / t.scale, t.ticks / t.scale, t.samples * 1024 / t.rate]));
    if (!Number.isFinite(seconds) || seconds <= 0 || seconds > 60) throw new Error('VOICE_LIMIT');
    return Math.round(seconds * 1000) / 1000;
  }
  if (bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) {
    const vint = (at: number, keepMarker: boolean) => {
      let mask = 0x80, size = 1;
      while (size <= 8 && !(bytes[at] & mask)) { size++; mask >>= 1; }
      if (size > 8 || at + size > bytes.length) throw new Error('VOICE_FORMAT');
      let value = keepMarker ? bytes[at] : bytes[at] & (mask - 1);
      for (let n = 1; n < size; n++) value = value * 256 + bytes[at + n];
      const unknown = !keepMarker && value === 2 ** (7 * size) - 1;
      return { value, size, unknown };
    };
    let scale = 1000000, duration: number | null = null, maxTime = -1, blocks = 0, packetMillis = 0;
    const opusTracks = new Set<number>();
    const walk = (start: number, end: number, cluster = 0, depth = 0) => {
      if (depth > 8) throw new Error('VOICE_FORMAT');
      for (let offset = start; offset < end;) {
        const id = vint(offset, true), length = vint(offset + id.size, false), data = offset + id.size + length.size;
        const finish = length.unknown ? end : data + length.value;
        if (finish > end || finish < data || data === finish) throw new Error('VOICE_FORMAT');
        if (id.value === 0xae) {
          let number = 0, kind = 0, codec = '';
          for (let at = data; at < finish;) {
            const field = vint(at, true), size = vint(at + field.size, false), content = at + field.size + size.size, limit = content + size.value;
            if (size.unknown || limit > finish || limit <= content) throw new Error('VOICE_FORMAT');
            if (field.value === 0x86) codec = text(content, size.value);
            else if (field.value === 0xd7 || field.value === 0x83) { let value = 0; for (let i = content; i < limit; i++) value = value * 256 + bytes[i]; if (field.value === 0xd7) number = value; else kind = value; }
            at = limit;
          }
          if (kind !== 2 || codec !== 'A_OPUS' || !number) throw new Error('VOICE_FORMAT');
          opusTracks.add(number);
        } else if (id.value === 0x2ad7b1 || id.value === 0xe7) {
          if (finish - data > 8) throw new Error('VOICE_FORMAT');
          let number = 0; for (let i = data; i < finish; i++) number = number * 256 + bytes[i];
          if (id.value === 0x2ad7b1) scale = number; else cluster = number;
        } else if (id.value === 0x4489) {
          if (finish - data !== 4 && finish - data !== 8) throw new Error('VOICE_FORMAT');
          duration = finish - data === 4 ? view.getFloat32(data) : view.getFloat64(data);
        } else if (id.value === 0xa3 || id.value === 0xa1) {
          const track = vint(data, false);
          if (data + track.size + 3 > finish) throw new Error('VOICE_FORMAT');
          const flags = bytes[data + track.size + 2], packet = data + track.size + 3;
          if (!opusTracks.has(track.value) || (flags & 6) || packet >= finish) throw new Error('VOICE_FORMAT');
          const toc = bytes[packet], config = toc >> 3, code = toc & 3;
          const frameMillis = config >= 16 ? 2.5 * 2 ** (config & 3) : config >= 12 ? 10 * 2 ** (config & 1) : (config & 3) === 3 ? 60 : 10 * 2 ** (config & 3);
          if (code === 3 && packet + 1 >= finish) throw new Error('VOICE_FORMAT');
          const frames = code === 0 ? 1 : code < 3 ? 2 : bytes[packet + 1] & 63;
          if (!frames || frameMillis * frames > 120) throw new Error('VOICE_FORMAT');
          packetMillis += frameMillis * frames;
          maxTime = Math.max(maxTime, cluster + view.getInt16(data + track.size)); blocks++;
        } else if ([0x18538067, 0x1549a966, 0x1654ae6b, 0x1f43b675, 0xa0].includes(id.value)) walk(data, finish, cluster, depth + 1);
        offset = finish;
      }
    };
    walk(0, bytes.length);
    if (!blocks || !opusTracks.size || scale <= 0) throw new Error('VOICE_FORMAT');
    const seconds = Math.max(duration === null ? 0 : duration * scale / 1e9, maxTime * scale / 1e9 + 0.12, packetMillis / 1000);
    if (!Number.isFinite(seconds) || seconds <= 0 || seconds > 60) throw new Error('VOICE_LIMIT');
    return Math.round(seconds * 1000) / 1000;
  }
  throw new Error('VOICE_FORMAT');
}
