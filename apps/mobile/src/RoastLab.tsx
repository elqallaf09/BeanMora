import { useContext, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  BackHandler,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { randomUUID } from 'expo-crypto';
import { supabase } from './client';
import { loadEquipment, type EquipmentItem } from './catalog';
import type { RecipeItem } from './data';
import { Disclosure } from './Disclosure';
import { RoastCurve } from './RoastCurve';
import { catalogName, processLabel } from './localizedContent';
import {
  clockTime,
  controlNames,
  eventNames,
  loadGreen,
  loadRoastDetails,
  loadRoasts,
  parseRoastNumber,
  parseRoastTime,
  validRoastDate,
  normalizedNumber,
  roastError,
  roastMetrics,
  roastNames,
  validateRoastSeries,
  ROAST_EVENTS,
  type GreenCoffee,
  type RoastControl,
  type RoastEvent,
  type RoastPoint,
  type RoastProfile,
} from './roastLab';
import { Action, Field, Icon, Language, Txt, colors, styles } from './ui';

type Section = 'own' | 'public' | 'new' | 'green' | 'gear';
type EventDraft = RoastEvent & { time: string; temperature: string };
interface Draft {
  id: string;
  green: string;
  machine: string;
  parent: string;
  expected: string;
  title: string;
  date: string;
  input: string;
  output: string;
  duration: string;
  level: string;
  target: string;
  notes: string;
  batch: string;
  ambient: string;
  greenTemp: string;
  agtronWhole: string;
  agtronGround: string;
  status: 'planned' | 'in_progress' | 'completed';
  publish?: boolean;
  events: EventDraft[];
  points: RoastPoint[];
  controls: RoastControl[];
}
const dateToday = () => {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
};
const emptyDraft = (): Draft => ({
  id: randomUUID(),
  green: '',
  machine: '',
  parent: '',
  expected: '',
  title: '',
  date: dateToday(),
  input: '',
  output: '',
  duration: '',
  level: '',
  target: '',
  notes: '',
  batch: '',
  ambient: '',
  greenTemp: '',
  agtronWhole: '',
  agtronGround: '',
  status: 'planned',
  events: ROAST_EVENTS.map((type) => ({
    event_type: type,
    elapsed_seconds: 0,
    bean_temp_c: null,
    time: '',
    temperature: '',
  })),
  points: [],
  controls: [],
});
const num = parseRoastNumber;
const errorText = (error: unknown) =>
  error && typeof error === 'object' && 'message' in error
    ? String(error.message)
    : String(error);
type GreenDraft = Record<string, string>;
const greenFields: {
  key: keyof GreenCoffee;
  ar: string;
  en: string;
  numeric?: boolean;
  range?: [number, number];
}[] = [
  { key: 'name', ar: 'اسم البن الأخضر', en: 'Green coffee name' },
  { key: 'origin_country', ar: 'بلد المنشأ', en: 'Origin country' },
  { key: 'origin_region', ar: 'المنطقة', en: 'Region' },
  { key: 'producer', ar: 'المنتج', en: 'Producer' },
  { key: 'farm', ar: 'المزرعة', en: 'Farm' },
  { key: 'washing_station', ar: 'محطة المعالجة', en: 'Washing station' },
  { key: 'lot_number', ar: 'رقم المحصول', en: 'Lot number' },
  {
    key: 'harvest_year',
    ar: 'سنة الحصاد',
    en: 'Harvest year',
    numeric: true,
    range: [1900, 2200],
  },
  { key: 'varietal', ar: 'السلالة', en: 'Varietal' },
  {
    key: 'altitude_meters',
    ar: 'الارتفاع (م)',
    en: 'Altitude (m)',
    numeric: true,
    range: [0, 3000],
  },
  {
    key: 'moisture_pct',
    ar: 'الرطوبة (%)',
    en: 'Moisture (%)',
    numeric: true,
    range: [0, 100],
  },
  {
    key: 'density_g_l',
    ar: 'الكثافة (غ/لتر)',
    en: 'Density (g/l)',
    numeric: true,
    range: [0.001, 1000],
  },
  {
    key: 'water_activity',
    ar: 'النشاط المائي (0–1)',
    en: 'Water activity (0–1)',
    numeric: true,
    range: [0, 1],
  },
  { key: 'screen_size', ar: 'مقاس الحبة', en: 'Screen size' },
  { key: 'supplier', ar: 'المورّد', en: 'Supplier' },
  { key: 'notes', ar: 'ملاحظات البن الأخضر', en: 'Green coffee notes' },
];
export function RoastLab({
  userId,
  login,
  recipes,
  openRecipe,
  initialId,
  initialSection = 'own',
}: {
  userId: string | null;
  login: () => void;
  recipes: RecipeItem[];
  openRecipe: (r: RecipeItem) => void;
  initialId?: string | null;
  initialSection?: 'own' | 'public';
}) {
  const locale = useContext(Language);
  const ar = locale === 'ar';
  const { width } = useWindowDimensions();
  const [section, setSection] = useState<Section>(initialSection);
  const [green, setGreen] = useState<GreenCoffee[]>([]);
  const [roasts, setRoasts] = useState<RoastProfile[]>([]);
  const [gear, setGear] = useState<
    { id: string; custom_name: string | null; model: { name: string } | null }[]
  >([]);
  const [catalog, setCatalog] = useState<EquipmentItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [revision, setRevision] = useState(0);
  const active = useRef(true);
  const inFlight = useRef(false);
  const [selected, setSelected] = useState<RoastProfile | null>(null);
  const [comparison, setComparison] = useState<string[]>([]);
  const [compared, setCompared] = useState<RoastProfile[]>([]);
  const [showCompare, setShowCompare] = useState(false);
  const comparisonScroll = useRef<ScrollView>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [restorable, setRestorable] = useState<Draft | null>(null);
  const [editing, setEditing] = useState(false);
  const [publish, setPublish] = useState(false);
  const [clock, setClock] = useState<{
    start: number | null;
    accumulated: number;
  }>({ start: null, accumulated: 0 });
  const [now, setNow] = useState(Date.now);
  const elapsed = Math.floor(
    (clock.accumulated + (clock.start ? now - clock.start : 0)) / 1000,
  );
  const [greenDraft, setGreenDraft] = useState<GreenDraft | null>(null);
  const [greenCreating, setGreenCreating] = useState(false);
  const [transactionId, setTransactionId] = useState(randomUUID);
  const [point, setPoint] = useState({
    time: '',
    bean: '',
    environment: '',
    ror: '',
  });
  const [control, setControl] = useState({
    time: '',
    type: 'power',
    value: '',
    unit: '%',
  });
  const [customMachine, setCustomMachine] = useState('');
  const [tasting, setTasting] = useState(false);
  const [taste, setTaste] = useState({
    acidity: '',
    sweetness: '',
    body: '',
    score: '',
    rest: '',
    notes: '',
    flavors: '',
    recipe: '',
    brew: '',
  });
  const [brews, setBrews] = useState<
    { id: string; recipe_id: string | null; created_at: string }[]
  >([]);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  useEffect(() => {
    if (clock.start === null) return;
    const tick = () => setNow(Date.now());
    const timer = setInterval(tick, 500);
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') tick();
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [clock.start]);
  useEffect(() => {
    let alive = true;
    if (!userId) return;
    void AsyncStorage.getItem('beanmora-roast-draft:' + userId)
      .then((raw) => {
        if (!alive || !raw) return;
        try {
          const value = JSON.parse(raw);
          if (
            typeof value.id === 'string' &&
            typeof value.title === 'string' &&
            Array.isArray(value.events) &&
            Array.isArray(value.points) &&
            Array.isArray(value.controls)
          )
            setRestorable(value);
        } catch {}
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [userId]);
  useEffect(() => {
    if (!userId || section !== 'new' || (!draft.title && !draft.green)) return;
    const timer = setTimeout(() => {
      void AsyncStorage.setItem(
        'beanmora-roast-draft:' + userId,
        JSON.stringify({ ...draft, publish }),
      ).catch(() => {});
    }, 400);
    return () => clearTimeout(timer);
  }, [draft, publish, userId, section]);
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (selected || showCompare || section === 'new') {
        setSelected(null);
        setShowCompare(false);
        setSection(initialSection);
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [selected, showCompare, section]);
  useEffect(() => {
    let alive = true;
    const db = supabase;
    if (!db) return;
    setBusy(true);
    setError('');
    const load = async () => {
      try {
        const [rows, beans, equipment, models] = await Promise.all([
          loadRoasts(db, userId, section === 'public' ? 'public' : 'own'),
          userId ? loadGreen(db, userId) : Promise.resolve([]),
          userId
            ? db
                .from('user_equipment')
                .select('id,custom_name,model:equipment_models(name)')
                .is('archived_at', null)
            .eq('user_id', userId)
                .eq('category', 'roaster')
            : Promise.resolve({ data: [], error: null }),
          loadEquipment(db, locale),
        ]);
        if (equipment.error) throw equipment.error;
        if (!alive) return;
        setRoasts(rows);
        setGreen(beans);
        setGear((equipment.data ?? []) as unknown as typeof gear);
        setCatalog(models.filter((m) => m.category === 'roaster'));
      } catch {
        if (alive)
          setError(
            ar
              ? 'تعذّر تحميل مختبر التحميص. أعد المحاولة.'
              : 'Could not load Roast Lab. Try again.',
          );
      } finally {
        if (alive) setBusy(false);
      }
    };
    void load();
    return () => {
      alive = false;
    };
  }, [userId, section === 'public', revision, locale]);
  useEffect(() => {
    if (initialId) void open(initialId);
  }, [initialId]);
  useEffect(() => {
    if (!tasting || !userId || !supabase) return;
    let alive = true;
    void supabase
      .from('brew_logs')
      .select('id,recipe_id,created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(12)
      .then(({ data }) => {
        if (alive) setBrews(data ?? []);
      });
    return () => {
      alive = false;
    };
  }, [tasting, userId]);
  const currentBean = green.find((g) => g.id === draft.green);
  const currentMachine = gear.find((g) => g.id === draft.machine);
  const choose = (next: Section) => {
    if ((next === 'new' || next === 'green' || next === 'gear') && !userId) {
      login();
      return;
    }
    setSelected(null);
    setShowCompare(false);
    setSection(next);
    setError('');
    setMessage('');
  };
  async function open(id: string) {
    if (!supabase) return;
    setBusy(true);
    setError('');
    try {
      const row = await loadRoastDetails(supabase, id);
      if (active.current) {
        setSelected(row);
        setTasting(false);
      }
    } catch {
      if (active.current)
        setError(ar ? 'تعذّر فتح الحمصة.' : 'Could not open roast.');
    } finally {
      if (active.current) setBusy(false);
    }
  }
  function makeDraft(row?: RoastProfile, fork = false) {
    const d = emptyDraft();
    if (row) {
      Object.assign(d, {
        id: fork ? d.id : row.id,
        green: row.user_id === userId ? row.green_coffee_id : '',
        machine: row.user_id === userId ? (row.roaster_equipment_id ?? '') : '',
        parent: fork ? row.id : (row.parent_roast_id ?? ''),
        expected: fork ? '' : row.updated_at,
        title: fork
          ? (ar ? 'نسخة من ' : 'Copy of ') + (row.title ?? '')
          : (row.title ?? ''),
        date: fork ? dateToday() : row.roast_date,
        input: String(row.green_weight_g ?? ''),
        output: fork ? '' : String(row.roasted_weight_g ?? ''),
        duration: fork
          ? ''
          : row.total_time_seconds
            ? clockTime(row.total_time_seconds)
            : '',
        level: fork ? '' : (row.roast_level ?? ''),
        target: row.target_roast_level ?? row.roast_level ?? '',
        notes: row.notes ?? '',
        batch: fork ? '' : String(row.batch_number ?? ''),
        ambient: fork ? '' : String(row.ambient_temp_c ?? ''),
        greenTemp: fork ? '' : String(row.green_temp_c ?? ''),
        agtronWhole: fork ? '' : String(row.agtron_whole ?? ''),
        agtronGround: fork ? '' : String(row.agtron_ground ?? ''),
        status: fork
          ? 'planned'
          : row.status === 'completed'
            ? 'completed'
            : 'planned',
        points: fork ? [] : (row.points ?? []),
        controls: fork ? [] : (row.controls ?? []),
      });
      if (!fork) {
        d.events = [
          ...ROAST_EVENTS.map((type) => {
            const e = row.events.find((e) => e.event_type === type);
            return {
              ...(e ?? {
                event_type: type,
                elapsed_seconds: 0,
                bean_temp_c: null,
              }),
              time: e ? clockTime(e.elapsed_seconds) : '',
              temperature:
                e?.bean_temp_c !== null && e?.bean_temp_c !== undefined
                  ? String(e.bean_temp_c)
                  : '',
            };
          }),
          ...row.events
            .filter(
              (e) =>
                !ROAST_EVENTS.includes(
                  e.event_type as (typeof ROAST_EVENTS)[number],
                ),
            )
            .map((e) => ({
              ...e,
              time: clockTime(e.elapsed_seconds),
              temperature: String(e.bean_temp_c ?? ''),
            })),
        ];
      }
    }
    setDraft(d);
    setEditing(!!row && !fork);
    setPublish(!!row && !fork && row.visibility === 'public');
    setSelected(null);
    setSection('new');
    setClock({ start: null, accumulated: 0 });
    setError('');
    setMessage('');
  }
  const edit = (key: keyof Draft, value: string) =>
    setDraft((d) => ({ ...d, [key]: value }));
  const eventEdit = (
    index: number,
    key: 'time' | 'temperature',
    value: string,
  ) =>
    setDraft((d) => ({
      ...d,
      events: d.events.map((e, i) =>
        i === index ? { ...e, [key]: value } : e,
      ),
    }));
  function addPoint() {
    const t = parseRoastTime(point.time || clockTime(elapsed)),
      bean = num(point.bean),
      env = num(point.environment),
      ror = num(point.ror);
    if (
      t === null ||
      bean === null ||
      bean < -50 ||
      bean > 400 ||
      (point.environment && (env === null || env < -50 || env > 600)) ||
      (point.ror && ror === null)
    ) {
      setError(
        ar
          ? 'أدخل وقت القراءة وحرارة صحيحة من الماكينة.'
          : 'Enter a valid timestamp and measured machine temperature.',
      );
      return;
    }
    setDraft((d) => ({
      ...d,
      points: [
        ...d.points.filter((p) => p.elapsed_seconds !== t),
        { elapsed_seconds: t, bean_temp_c: bean, environment_temp_c: env, ror },
      ].sort((a, b) => a.elapsed_seconds - b.elapsed_seconds),
    }));
    setPoint({ time: '', bean: '', environment: '', ror: '' });
    setError('');
  }
  function addControl() {
    const t = parseRoastTime(control.time || clockTime(elapsed)),
      value = num(control.value);
    if (t === null || value === null || control.unit.length > 30) {
      setError(
        ar
          ? 'أدخل وقتًا وقيمة صحيحة لإعداد الماكينة.'
          : 'Enter a valid control timestamp and value.',
      );
      return;
    }
    setDraft((d) => ({
      ...d,
      controls: [
        ...d.controls,
        {
          elapsed_seconds: t,
          control_type: control.type,
          value,
          unit: control.unit,
        },
      ].sort((a, b) => a.elapsed_seconds - b.elapsed_seconds),
    }));
    setControl((c) => ({ ...c, time: '', value: '' }));
    setError('');
  }
  async function saveRoast(completed: boolean) {
    const db = supabase;
    if (!userId || !db) {
      login();
      return;
    }
    if (inFlight.current) return;
    const events = draft.events
      .filter((e) => e.time.trim())
      .map((e) => ({
        event_type: e.event_type,
        elapsed_seconds: parseRoastTime(e.time) ?? -1,
        bean_temp_c: num(e.temperature),
        environment_temp_c: e.environment_temp_c ?? null,
        notes: e.notes ?? null,
      }))
      .sort((a, b) => a.elapsed_seconds - b.elapsed_seconds);
    const total =
      parseRoastTime(draft.duration) ??
      events.find((e) => e.event_type === 'drop')?.elapsed_seconds ??
      null;
    const input = num(draft.input),
      output = num(draft.output);
    if (
      draft.title.trim().length < 2 ||
      !currentBean ||
      input === null ||
      input <= 0 ||
      input > 1000000 ||
      draft.title.length > 160 ||
      draft.notes.length > 5000 ||
      !validRoastDate(draft.date) ||
      (!!draft.duration.trim() && parseRoastTime(draft.duration) === null) ||
      !validateRoastSeries(events, total, draft.points, draft.controls) ||
      draft.events.some(
        (e) =>
          e.temperature.trim() &&
          (!e.time.trim() || num(e.temperature) === null),
      ) ||
      (draft.output.trim() && output === null) ||
      (
        [
          'batch',
          'ambient',
          'greenTemp',
          'agtronWhole',
          'agtronGround',
        ] as const
      ).some((key) => {
        const v = num(draft[key]);
        return (
          !!draft[key].trim() &&
          (v === null ||
            (['batch', 'agtronWhole', 'agtronGround'].includes(key) &&
              !Number.isInteger(v)) ||
            (['ambient', 'greenTemp'].includes(key) && (v < -50 || v > 100)) ||
            (['agtronWhole', 'agtronGround'].includes(key) &&
              (v < 0 || v > 150)))
        );
      })
    ) {
      setError(
        ar
          ? 'أدخل اسم الحمصة والبن ووزن الدفعة، وراجع أوقات المراحل والحرارة.'
          : 'Enter title, green coffee and input weight; check stage times and temperatures.',
      );
      return;
    }
    if (
      completed &&
      (output === null || output <= 0 || output > input || !total)
    ) {
      setError(roastError('ROAST_RESULT', ar));
      return;
    }
    if (publish && !completed) {
      setError(roastError('ROAST_COMPLETE_FIRST', ar));
      return;
    }
    inFlight.current = true;
    setSaving(true);
    setError('');
    try {
      const { data, error } = await db.rpc('save_roast_profile', {
        p_data: {
          id: draft.id,
          expected_updated_at: draft.expected || null,
          green_coffee_id: draft.green,
          roaster_equipment_id: draft.machine || null,
          parent_roast_id: draft.parent || null,
          title: draft.title.trim(),
          roast_date: draft.date,
          green_weight_g: input,
          roasted_weight_g: output,
          total_time_seconds: total,
          roast_level: draft.level || null,
          target_roast_level: draft.target || null,
          batch_number: num(draft.batch),
          ambient_temp_c: num(draft.ambient),
          green_temp_c: num(draft.greenTemp),
          agtron_whole: num(draft.agtronWhole),
          agtron_ground: num(draft.agtronGround),
          charge_temp_c:
            events.find((e) => e.event_type === 'charge')?.bean_temp_c ?? null,
          drop_temp_c:
            events.find((e) => e.event_type === 'drop')?.bean_temp_c ?? null,
          notes: draft.notes,
          status: completed ? 'completed' : 'planned',
          visibility: publish ? 'public' : 'private',
          language: locale,
          events,
          points: draft.points,
          controls: draft.controls,
        },
      });
      if (error) throw error;
      if (!active.current) return;
      await AsyncStorage.removeItem('beanmora-roast-draft:' + userId);
      setRestorable(null);
      setDraft(emptyDraft());
      setSection('own');
      setClock({ start: null, accumulated: 0 });
      setRevision((r) => r + 1);
      setMessage(
        ar
          ? publish
            ? 'تم حفظ الحمصة ونشرها في المجتمع.'
            : 'تم حفظ الحمصة في سجلاتك الخاصة.'
          : publish
            ? 'Roast saved and shared with the community.'
            : 'Roast saved privately.',
      );
      await open(String(data));
    } catch (e) {
      if (active.current) setError(roastError(errorText(e), ar));
    } finally {
      inFlight.current = false;
      if (active.current) setSaving(false);
    }
  }
  function beginGreen(row?: GreenCoffee) {
    setGreenCreating(!row);
    setTransactionId(randomUUID());
    setGreenDraft({
      id: row?.id ?? randomUUID(),
      quantity_grams: '',
      species: row?.species ?? '',
      process: row?.process ?? '',
      ...Object.fromEntries(
        greenFields.map((f) => [f.key, String(row?.[f.key] ?? '')]),
      ),
    });
  }
  async function saveGreen() {
    if (!greenDraft || !supabase || !userId || inFlight.current) return;
    const d = greenDraft;
    if (
      d.name.trim().length < 2 ||
      greenFields.some(
        (f) =>
          f.numeric &&
          d[f.key]?.trim() &&
          (num(d[f.key]) === null ||
            num(d[f.key])! < f.range![0] ||
            num(d[f.key])! > f.range![1] ||
            (['harvest_year', 'altitude_meters'].includes(f.key) &&
              !Number.isInteger(num(d[f.key])))),
      ) ||
      (d.quantity_grams.trim() &&
        (num(d.quantity_grams) === null || num(d.quantity_grams)! <= 0))
    ) {
      setError(
        ar
          ? 'راجع اسم البن والكميات والقياسات المدخلة.'
          : 'Check the coffee name, quantity and measurements.',
      );
      return;
    }
    inFlight.current = true;
    setSaving(true);
    setError('');
    try {
      const { error } = await supabase.rpc('save_green_coffee', {
        p_data: {
          ...d,
          ...Object.fromEntries(
            greenFields
              .filter((f) => f.numeric)
              .map((f) => [
                f.key,
                d[f.key]?.trim() ? normalizedNumber(d[f.key]) : null,
              ]),
          ),
          quantity_grams: d.quantity_grams.trim()
            ? normalizedNumber(d.quantity_grams)
            : null,
          create: greenCreating,
          transaction_id: transactionId,
        },
      });
      if (error) throw error;
      if (active.current) {
        setGreenDraft(null);
        setRevision((r) => r + 1);
        setMessage(
          ar ? 'تم حفظ البن وتحديث المخزون.' : 'Green coffee and stock saved.',
        );
      }
    } catch (e) {
      if (active.current) setError(roastError(errorText(e), ar));
    } finally {
      inFlight.current = false;
      if (active.current) setSaving(false);
    }
  }
  async function addMachine(model?: EquipmentItem) {
    if (!supabase || !userId || inFlight.current) return;
    if (!model && customMachine.trim().length < 2) return;
    inFlight.current = true;
    setSaving(true);
    try {
      const { error } = await supabase.from('user_equipment').insert({
        user_id: userId,
        category: 'roaster',
        equipment_model_id: model?.id ?? null,
        custom_name: model ? null : customMachine.trim(),
      });
      if (error) throw error;
      if (active.current) {
        setCustomMachine('');
        setRevision((r) => r + 1);
        setMessage(
          ar
            ? 'تمت إضافة ماكينة التحميص إلى معداتك.'
            : 'Roaster added to your equipment.',
        );
      }
    } catch {
      if (active.current)
        setError(ar ? 'تعذّرت إضافة الماكينة.' : 'Could not add roaster.');
    } finally {
      inFlight.current = false;
      if (active.current) setSaving(false);
    }
  }
  async function compare() {
    if (!supabase || comparison.length < 2) return;
    setBusy(true);
    try {
      const values = await Promise.all(
        comparison.map((id) => loadRoastDetails(supabase!, id)),
      );
      if (active.current) {
        setCompared(values);
        setShowCompare(true);
      }
    } catch {
      if (active.current)
        setError(ar ? 'تعذّر تحميل المقارنة.' : 'Could not load comparison.');
    } finally {
      if (active.current) setBusy(false);
    }
  }
  async function saveTaste() {
    if (!supabase || !selected || !userId || inFlight.current) return;
    const measurements = [taste.acidity, taste.sweetness, taste.body];
    if (
      measurements.some(
        (v) =>
          v.trim() &&
          (num(v) === null ||
            !Number.isInteger(num(v)) ||
            num(v)! < 1 ||
            num(v)! > 10),
      ) ||
      (taste.score.trim() &&
        (num(taste.score) === null ||
          num(taste.score)! < 0 ||
          num(taste.score)! > 100)) ||
      (taste.rest.trim() &&
        (num(taste.rest) === null ||
          !Number.isInteger(num(taste.rest)) ||
          num(taste.rest)! < 0))
    ) {
      setError(
        ar
          ? 'درجات التذوق من 1 إلى 10، والتقييم الإجمالي من 0 إلى 100.'
          : 'Tasting attributes use 1–10; overall score uses 0–100.',
      );
      return;
    }
    inFlight.current = true;
    setSaving(true);
    try {
      const { error } = await supabase.rpc('save_roast_tasting', {
        p_roast_id: selected.id,
        p_data: {
          acidity: num(taste.acidity),
          sweetness: num(taste.sweetness),
          body: num(taste.body),
          overall_score: num(taste.score),
          rest_days: num(taste.rest),
          flavor_notes: taste.flavors
            .split(/[,،]/)
            .map((v) => v.trim())
            .filter(Boolean),
          notes: taste.notes,
          recipe_id: taste.recipe || null,
          brew_log_id: taste.brew || null,
        },
      });
      if (error) throw error;
      if (active.current) {
        setTasting(false);
        setTaste({
          acidity: '',
          sweetness: '',
          body: '',
          score: '',
          rest: '',
          notes: '',
          flavors: '',
          recipe: '',
          brew: '',
        });
        await open(selected.id);
        setMessage(ar ? 'تم حفظ نتيجة التذوق.' : 'Tasting saved.');
      }
    } catch (e) {
      if (active.current) setError(roastError(errorText(e), ar));
    } finally {
      inFlight.current = false;
      if (active.current) setSaving(false);
    }
  }
  const measured = (r: RoastProfile) =>
    r.points?.length
      ? r.points
      : r.events
          .filter((e) => e.bean_temp_c !== null)
          .map((e) => ({
            elapsed_seconds: e.elapsed_seconds,
            bean_temp_c: e.bean_temp_c,
          }));
  const draftEvents = draft.events
    .filter((e) => e.time && num(e.temperature) !== null)
    .map((e) => ({
      elapsed_seconds: parseRoastTime(e.time) ?? 0,
      bean_temp_c: num(e.temperature),
    }));
  const metrics =
    draft.input && draft.output
      ? roastMetrics({
          events: [],
          total_time_seconds: null,
          green_weight_g: num(draft.input),
          roasted_weight_g: num(draft.output),
        })
      : null;
  return (
    <ScrollView
      testID="roast-lab"
      contentContainerStyle={s.page}
      keyboardShouldPersistTaps="handled"
    >
      <View style={[s.hero, { flexDirection: ar ? 'row-reverse' : 'row' }]}>
        <View style={{ flex: 1, gap: 5 }}>
          <Txt style={{ color: '#D9B99D', fontSize: 12 }}>
            {ar ? 'من البن الأخضر إلى الكوب' : 'FROM GREEN COFFEE TO THE CUP'}
          </Txt>
          <Txt
            heading
            style={{
              color: '#FFF',
              fontSize: 28,
              lineHeight: 38,
              fontWeight: '700',
            }}
          >
            {ar ? 'مختبر التحميص' : 'Roast Lab'}
          </Txt>
          <Txt style={{ color: '#EFE0D1', fontSize: 13, lineHeight: 21 }}>
            {ar
              ? 'وثّق حمصتك، تابع مراحلها، وقارن المحاولات لتفهم الفرق في كوبك.'
              : 'Record your roast, follow its stages and compare attempts to understand your cup.'}
          </Txt>
        </View>
        <Icon name="bean" color="#DEAE82" size={45} />
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8 }}
      >
        {(
          [
            { id: 'own', ar: 'حمصاتي', en: 'My roasts' },
            { id: 'public', ar: 'حمصات المجتمع', en: 'Community roasts' },
            { id: 'new', ar: 'ابدأ حمصة', en: 'Start a roast' },
            { id: 'green', ar: 'البن الأخضر', en: 'Green coffee' },
            { id: 'gear', ar: 'معدات التحميص', en: 'Roasting equipment' },
          ] as { id: Section; ar: string; en: string }[]
        ).map((t) => (
          <Action
            key={t.id}
            title={ar ? t.ar : t.en}
            selected={section === t.id && !selected && !showCompare}
            onPress={() => {
              if (t.id === 'new') {
                if (!userId) {
                  login();
                  return;
                }
                if (section !== 'new') {
                  if (draft.title || draft.green) {
                    setSelected(null);
                    setShowCompare(false);
                    setSection('new');
                  } else makeDraft();
                }
              } else choose(t.id);
            }}
          />
        ))}
      </ScrollView>
      {message ? (
        <View accessibilityLiveRegion="polite">
          <Txt style={styles.success}>{message}</Txt>
        </View>
      ) : null}
      {error ? (
        <View style={styles.card}>
          <Txt style={styles.error}>{error}</Txt>
          <Action
            title={ar ? 'إعادة المحاولة' : 'Retry'}
            onPress={() => setRevision((r) => r + 1)}
          />
        </View>
      ) : null}
      {busy ? <ActivityIndicator color={colors.teal} /> : null}
      {showCompare ? (
        <>
          <Action
            title={ar ? 'إغلاق المقارنة' : 'Close comparison'}
            onPress={() => setShowCompare(false)}
          />
          <Txt heading style={styles.subtitle}>
            {ar ? 'مقارنة الحمصات' : 'Roast comparison'}
          </Txt>
          <RoastCurve
            series={compared.map((r) => ({
              name: r.title ?? (ar ? 'حمصة' : 'Roast'),
              points: measured(r),
            }))}
          />
          <ScrollView
            ref={comparisonScroll}
            horizontal
            onContentSizeChange={() => {
              if (ar)
                comparisonScroll.current?.scrollToEnd({ animated: false });
            }}
          >
            <View style={{ minWidth: compared.length * 190 + 125 }}>
              {[
                ar ? 'اسم الحمصة' : 'Roast',
                ar ? 'البن الأخضر' : 'Green coffee',
                ar ? 'وزن الدفعة' : 'Input weight',
                ar ? 'وزن الناتج' : 'Output weight',
                ar ? 'فقدان الوزن' : 'Weight loss',
                ar ? 'إجمالي الوقت' : 'Total time',
                ar ? 'التجفيف' : 'Drying',
                ar ? 'مرحلة ميلارد' : 'Maillard',
                ar ? 'التطوير' : 'Development',
                ar ? 'نسبة التطوير' : 'Development ratio',
              ].map((label, i) => (
                <View
                  key={label}
                  style={[
                    s.compareRow,
                    {
                      flexDirection: ar ? 'row-reverse' : 'row',
                      backgroundColor: i % 2 ? '#F5EDE2' : colors.paper,
                    },
                  ]}
                >
                  <Txt style={{ width: 125, fontSize: 12, fontWeight: '700' }}>
                    {label}
                  </Txt>
                  {compared.map((r) => {
                    const m = roastMetrics(r);
                    const values = [
                      r.title ?? '—',
                      r.public_coffee?.name ??
                        green.find((g) => g.id === r.green_coffee_id)?.name ??
                        '—',
                      r.green_weight_g !== null
                        ? r.green_weight_g + (ar ? ' غ' : ' g')
                        : '—',
                      r.roasted_weight_g !== null
                        ? r.roasted_weight_g + (ar ? ' غ' : ' g')
                        : '—',
                      m.loss !== null ? m.loss + '%' : '—',
                      m.total !== null ? clockTime(m.total) : '—',
                      m.drying !== null ? clockTime(m.drying) : '—',
                      m.maillard !== null ? clockTime(m.maillard) : '—',
                      m.development !== null ? clockTime(m.development) : '—',
                      m.dtr !== null ? m.dtr + '%' : '—',
                    ];
                    return (
                      <Txt key={r.id} style={{ width: 190, fontSize: 13 }}>
                        {values[i]}
                      </Txt>
                    );
                  })}
                </View>
              ))}
            </View>
          </ScrollView>
        </>
      ) : selected ? (
        <>
          <Action
            title={ar ? 'إغلاق الحمصة' : 'Close roast'}
            onPress={() => setSelected(null)}
          />
          <Txt heading style={styles.title}>
            {selected.title}
          </Txt>
          <Txt style={styles.muted}>
            {[
              selected.public_coffee?.name ??
                green.find((g) => g.id === selected.green_coffee_id)?.name,
              selected.roast_date,
              selected.visibility === 'public'
                ? ar
                  ? 'منشورة'
                  : 'Public'
                : ar
                  ? 'خاصة'
                  : 'Private',
            ]
              .filter(Boolean)
              .join(' · ')}
          </Txt>
          <RoastStats roast={selected} />
          <RoastCurve
            series={[
              {
                name: selected.title ?? (ar ? 'الحمصة' : 'Roast'),
                points: measured(selected),
              },
            ]}
          />
          <View style={styles.card}>
            <Txt heading style={styles.subtitle}>
              {ar ? 'مراحل الحمصة' : 'Roast milestones'}
            </Txt>
            {selected.events.map((e, i) => (
              <View
                key={e.event_type + i}
                style={[
                  styles.row,
                  {
                    justifyContent: 'space-between',
                    flexDirection: ar ? 'row-reverse' : 'row',
                  },
                ]}
              >
                <Txt>
                  {eventNames[e.event_type]?.[ar ? 0 : 1] ??
                    (ar ? 'حدث إضافي' : 'Custom event')}
                </Txt>
                <Txt>
                  {clockTime(e.elapsed_seconds)}
                  {e.bean_temp_c !== null ? ' · ' + e.bean_temp_c + '°C' : ''}
                </Txt>
              </View>
            ))}
          </View>
          {selected.notes ? <Txt>{selected.notes}</Txt> : null}
          {selected.controls?.length ? (
            <Disclosure
              title={
                ar ? 'إعدادات الماكينة المسجّلة' : 'Recorded machine controls'
              }
            >
              {selected.controls.map((c, i) => (
                <Txt key={i}>
                  {clockTime(c.elapsed_seconds)} ·{' '}
                  {controlNames[c.control_type]?.[ar ? 0 : 1] ?? c.control_type}{' '}
                  · {c.value} {c.unit}
                </Txt>
              ))}
            </Disclosure>
          ) : null}
          <View style={styles.row}>
            {selected.user_id === userId ? (
              <Action
                title={ar ? 'تعديل الحمصة' : 'Edit roast'}
                onPress={() => makeDraft(selected)}
              />
            ) : null}
            <Action
              title={ar ? 'نسخ الحمصة لمحاولة جديدة' : 'Fork for a new attempt'}
              onPress={() => {
                if (!userId) {
                  login();
                  return;
                }
                makeDraft(selected, true);
              }}
            />
            <Action
              title={ar ? 'أضف للمقارنة' : 'Add to comparison'}
              onPress={() => {
                setComparison((v) =>
                  v.includes(selected.id) ? v : [...v.slice(-2), selected.id],
                );
                setSelected(null);
              }}
            />
          </View>
          {selected.user_id === userId && selected.status === 'completed' ? (
            <Action
              title={ar ? 'سجّل التذوق' : 'Record tasting'}
              onPress={() => setTasting((v) => !v)}
              selected={tasting}
            />
          ) : null}
          {tasting ? (
            <View style={styles.card}>
              <Txt heading style={styles.subtitle}>
                {ar ? 'تذوقك لهذه الحمصة' : 'Your tasting of this roast'}
              </Txt>
              <Txt style={styles.muted}>
                {ar
                  ? 'درجاتك الشخصية من 1 إلى 10؛ اترك ما لم تقسه فارغًا.'
                  : 'Your personal 1–10 scores; leave unmeasured values blank.'}
              </Txt>
              <View style={s.fields}>
                {(
                  ['acidity', 'sweetness', 'body', 'score', 'rest'] as const
                ).map((key, i) => (
                  <View key={key} style={s.field}>
                    <Field
                      label={
                        (ar
                          ? [
                              'الحموضة',
                              'الحلاوة',
                              'القوام',
                              'التقييم من 100',
                              'أيام الراحة',
                            ]
                          : [
                              'Acidity',
                              'Sweetness',
                              'Body',
                              'Score out of 100',
                              'Rest days',
                            ])[i]
                      }
                      value={taste[key]}
                      onChangeText={(v) =>
                        setTaste((t) => ({ ...t, [key]: v }))
                      }
                      keyboardType="decimal-pad"
                    />
                  </View>
                ))}
              </View>
              <Field
                label={
                  ar
                    ? 'إيحاءات تذوقك (افصل بفاصلة)'
                    : 'Your tasting notes (comma separated)'
                }
                value={taste.flavors}
                onChangeText={(flavors) => setTaste((t) => ({ ...t, flavors }))}
              />
              <Field
                label={ar ? 'ملاحظات التذوق' : 'Tasting observations'}
                value={taste.notes}
                onChangeText={(notes) => setTaste((t) => ({ ...t, notes }))}
              />
              <Disclosure
                title={
                  ar
                    ? 'ربط التذوق بوصفة أو تحضير محفوظ'
                    : 'Link a recipe or saved brew'
                }
              >
                <ScrollView horizontal contentContainerStyle={{ gap: 8 }}>
                  <Action
                    title={ar ? 'دون وصفة' : 'No recipe'}
                    selected={!taste.recipe}
                    onPress={() => setTaste((t) => ({ ...t, recipe: '' }))}
                  />
                  {recipes.slice(0, 20).map((r) => (
                    <Action
                      key={r.id}
                      title={r.title}
                      selected={taste.recipe === r.id}
                      onPress={() => setTaste((t) => ({ ...t, recipe: r.id }))}
                    />
                  ))}
                </ScrollView>
                <ScrollView horizontal contentContainerStyle={{ gap: 8 }}>
                  <Action
                    title={ar ? 'دون تحضير' : 'No brew'}
                    selected={!taste.brew}
                    onPress={() => setTaste((t) => ({ ...t, brew: '' }))}
                  />
                  {brews.map((b, i) => (
                    <Action
                      key={b.id}
                      title={
                        (ar ? 'تحضير ' : 'Brew ') +
                        (i + 1) +
                        ' · ' +
                        new Date(b.created_at).toLocaleDateString(
                          locale + '-u-nu-latn',
                        )
                      }
                      selected={taste.brew === b.id}
                      onPress={() =>
                        setTaste((t) => ({
                          ...t,
                          brew: b.id,
                          recipe: b.recipe_id ?? t.recipe,
                        }))
                      }
                    />
                  ))}
                </ScrollView>
              </Disclosure>
              <Action
                title={ar ? 'حفظ التذوق' : 'Save tasting'}
                selected
                disabled={saving}
                onPress={() => void saveTaste()}
              />
            </View>
          ) : null}
          {selected.tastings?.map((t) => (
            <View key={t.id} style={styles.card}>
              <Txt heading style={{ fontSize: 16, fontWeight: '700' }}>
                {ar ? 'نتيجة التذوق' : 'Tasting result'}
                {t.tasted_on ? ' · ' + t.tasted_on : ''}
              </Txt>
              <Txt>
                {[
                  t.acidity !== null
                    ? (ar ? 'الحموضة ' : 'Acidity ') + t.acidity + '/10'
                    : null,
                  t.sweetness !== null
                    ? (ar ? 'الحلاوة ' : 'Sweetness ') + t.sweetness + '/10'
                    : null,
                  t.body !== null
                    ? (ar ? 'القوام ' : 'Body ') + t.body + '/10'
                    : null,
                  t.overall_score !== null
                    ? (ar ? 'التقييم ' : 'Score ') + t.overall_score + '/100'
                    : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Txt>
              <Txt>{t.flavor_notes.join(' · ')}</Txt>
              {t.notes ? <Txt>{t.notes}</Txt> : null}
              {t.recipe_id && recipes.find((r) => r.id === t.recipe_id) ? (
                <Action
                  title={ar ? 'فتح وصفة التذوق' : 'Open tasting recipe'}
                  onPress={() =>
                    openRecipe(recipes.find((r) => r.id === t.recipe_id)!)
                  }
                />
              ) : null}
            </View>
          ))}
        </>
      ) : section === 'new' ? (
        <>
          {restorable && !editing ? (
            <View style={[styles.card, { backgroundColor: '#EAF4F0' }]}>
              <Txt>
                {ar
                  ? 'لديك مسودة حمصة محفوظة على هذا الجهاز.'
                  : 'A roast draft is saved on this device.'}
              </Txt>
              <Action
                title={ar ? 'استكمال المسودة' : 'Resume saved draft'}
                onPress={() => {
                  setDraft(restorable);
                  setEditing(!!restorable.expected);
                  setPublish(restorable.publish ?? false);
                  setRestorable(null);
                }}
              />
            </View>
          ) : null}
          <View style={styles.card}>
            <Txt heading style={styles.subtitle}>
              {editing
                ? ar
                  ? 'تعديل الحمصة'
                  : 'Edit roast'
                : ar
                  ? 'دفعة جديدة'
                  : 'New batch'}
            </Txt>
            <View style={s.fields}>
              <View style={s.field}>
                <Field
                  label={ar ? 'اسم الحمصة' : 'Roast title'}
                  value={draft.title}
                  onChangeText={(v) => edit('title', v)}
                />
              </View>
              <View style={s.field}>
                <Field
                  label={
                    ar
                      ? 'تاريخ الحمصة (سنة-شهر-يوم)'
                      : 'Roast date (YYYY-MM-DD)'
                  }
                  value={draft.date}
                  onChangeText={(v) => edit('date', v)}
                />
              </View>
            </View>
            <Txt style={styles.label}>
              {ar ? 'اختَر البن الأخضر' : 'Choose green coffee'}
            </Txt>
            <ScrollView horizontal contentContainerStyle={{ gap: 8 }}>
              {green.map((g) => (
                <Action
                  key={g.id}
                  title={g.name + ' · ' + g.remaining + (ar ? ' غ' : ' g')}
                  selected={draft.green === g.id}
                  onPress={() => edit('green', g.id)}
                />
              ))}
            </ScrollView>
            {!green.length ? (
              <Action
                title={
                  ar ? 'أضف بنّك الأخضر أولًا' : 'Add your green coffee first'
                }
                onPress={() => {
                  choose('green');
                  beginGreen();
                }}
              />
            ) : null}
            <Txt style={styles.label}>
              {ar ? 'ماكينة التحميص' : 'Roasting machine'}
            </Txt>
            <ScrollView horizontal contentContainerStyle={{ gap: 8 }}>
              <Action
                title={ar ? 'دون ماكينة محددة' : 'Unspecified machine'}
                selected={!draft.machine}
                onPress={() => edit('machine', '')}
              />
              {gear.map((g) => (
                <Action
                  key={g.id}
                  title={catalogName(
                    g.custom_name ?? g.model?.name ?? '',
                    locale,
                  )}
                  selected={draft.machine === g.id}
                  onPress={() => edit('machine', g.id)}
                />
              ))}
            </ScrollView>
            <Action
              title={ar ? 'إدارة معدات التحميص' : 'Manage roasting equipment'}
              onPress={() => choose('gear')}
            />
            <View style={s.fields}>
              <View style={s.field}>
                <Field
                  label={ar ? 'وزن البن الأخضر (غ)' : 'Green input (g)'}
                  value={draft.input}
                  onChangeText={(v) => edit('input', v)}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={s.field}>
                <Field
                  label={ar ? 'الوزن بعد التحميص (غ)' : 'Roasted output (g)'}
                  value={draft.output}
                  onChangeText={(v) => edit('output', v)}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
            {metrics?.loss !== null && metrics?.loss !== undefined ? (
              <Txt style={{ fontWeight: '700', color: colors.teal }}>
                {ar ? 'فقدان الوزن: ' : 'Weight loss: '}
                {metrics.loss}%
              </Txt>
            ) : null}
          </View>
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.brown,
                borderColor: colors.brown,
                gap: 8,
              },
            ]}
          >
            <Txt heading style={{ color: '#FFF', fontWeight: '700' }}>
              {ar ? 'مؤقت الحمصة' : 'Roast timer'}
            </Txt>
            <Txt
              style={{
                fontSize: 38,
                lineHeight: 48,
                color: '#FFF',
                textAlign: 'center',
                writingDirection: 'ltr',
              }}
            >
              {clockTime(elapsed)}
            </Txt>
            <View style={styles.row}>
              <Action
                title={
                  clock.start
                    ? ar
                      ? 'إيقاف مؤقت'
                      : 'Pause timer'
                    : ar
                      ? 'تشغيل مؤقت الحمصة'
                      : 'Start roast timer'
                }
                onPress={() => {
                  const current = Date.now();
                  setNow(current);
                  setClock((c) =>
                    c.start
                      ? {
                          start: null,
                          accumulated: c.accumulated + current - c.start,
                        }
                      : { ...c, start: current },
                  );
                }}
              />
              <Action
                title={ar ? 'اعتماد الوقت الإجمالي' : 'Use elapsed time'}
                onPress={() => edit('duration', clockTime(elapsed))}
                disabled={elapsed === 0}
              />
            </View>
          </View>
          <Txt heading style={styles.subtitle}>
            {ar ? 'مراحل الحمصة' : 'Roast stages'}
          </Txt>
          <Txt style={styles.muted}>
            {ar
              ? 'سجّل الأوقات والحرارات الفعلية، أو اضغط «سجّل الآن» مع المؤقت.'
              : 'Enter actual timestamps and temperatures, or mark the running timer.'}
          </Txt>
          <View style={s.fields}>
            {draft.events.map((e, i) => (
              <View
                key={e.event_type + i}
                style={[
                  styles.card,
                  s.stage,
                  { width: width >= 700 ? '48%' : '100%' },
                ]}
              >
                <Txt heading style={{ fontWeight: '700' }}>
                  {eventNames[e.event_type]?.[ar ? 0 : 1] ??
                    (ar ? 'حدث إضافي' : 'Custom event')}
                </Txt>
                <View
                  style={{ flexDirection: ar ? 'row-reverse' : 'row', gap: 10 }}
                >
                  <View style={{ flex: 1 }}>
                    <Field
                      label={
                        (ar ? 'وقت ' : 'Time ') +
                        (eventNames[e.event_type]?.[ar ? 0 : 1] ??
                          String(i + 1))
                      }
                      placeholder="0:00"
                      value={e.time}
                      onChangeText={(v) => eventEdit(i, 'time', v)}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Field
                      label={
                        (ar ? 'حرارة ' : 'Temperature ') +
                        (eventNames[e.event_type]?.[ar ? 0 : 1] ??
                          String(i + 1)) +
                        ' (°C)'
                      }
                      value={e.temperature}
                      onChangeText={(v) => eventEdit(i, 'temperature', v)}
                      keyboardType="decimal-pad"
                    />
                  </View>
                </View>
                {e.event_type !== 'charge' ? (
                  <Action
                    title={
                      (ar ? 'سجّل الآن: ' : 'Mark now: ') +
                      (eventNames[e.event_type]?.[ar ? 0 : 1] ?? String(i + 1))
                    }
                    onPress={() => {
                      eventEdit(i, 'time', clockTime(elapsed));
                      if (e.event_type === 'drop')
                        edit('duration', clockTime(elapsed));
                    }}
                    disabled={elapsed === 0}
                  />
                ) : null}
              </View>
            ))}
          </View>
          <View style={styles.card}>
            <Field
              label={
                ar
                  ? 'إجمالي الوقت (دقائق:ثواني)'
                  : 'Total time (minutes:seconds)'
              }
              placeholder="10:30"
              value={draft.duration}
              onChangeText={(v) => edit('duration', v)}
            />
            <Txt style={styles.label}>
              {ar ? 'درجة التحميص الفعلية' : 'Actual roast level'}
            </Txt>
            <View style={styles.row}>
              <Action
                title={ar ? 'غير محددة' : 'Unspecified'}
                selected={!draft.level}
                onPress={() => edit('level', '')}
              />
              {Object.entries(roastNames).map(([id, label]) => (
                <Action
                  key={id}
                  title={label[ar ? 0 : 1]}
                  selected={draft.level === id}
                  onPress={() => edit('level', id)}
                />
              ))}
            </View>
            <Field
              label={ar ? 'ملاحظات الحمصة' : 'Roast notes'}
              value={draft.notes}
              onChangeText={(v) => edit('notes', v)}
              multiline
            />
          </View>
          <Disclosure
            title={
              ar
                ? 'منحنى الحرارة وقراءات الماكينة'
                : 'Temperature curve and measurements'
            }
          >
            <RoastCurve
              series={[
                {
                  name: draft.title || (ar ? 'هذه الحمصة' : 'This roast'),
                  points: draft.points.length ? draft.points : draftEvents,
                },
              ]}
            />
            <View style={s.fields}>
              {(['time', 'bean', 'environment', 'ror'] as const).map(
                (key, i) => (
                  <View key={key} style={s.field}>
                    <Field
                      label={
                        (ar
                          ? [
                              'وقت القراءة (دقائق:ثواني)',
                              'حرارة البن (°C)',
                              'حرارة البيئة (°C)',
                              'معدل ارتفاع الحرارة (°C/دقيقة)',
                            ]
                          : [
                              'Sample time (minutes:seconds)',
                              'Bean temperature (°C)',
                              'Environment temperature (°C)',
                              'Rate of rise (°C/min)',
                            ])[i]
                      }
                      value={point[key]}
                      onChangeText={(v) =>
                        setPoint((p) => ({ ...p, [key]: v }))
                      }
                      keyboardType={key === 'time' ? 'default' : 'decimal-pad'}
                    />
                  </View>
                ),
              )}
            </View>
            <Action
              title={ar ? 'إضافة قراءة' : 'Add measurement'}
              onPress={addPoint}
            />
            {draft.points.map((p, i) => (
              <View key={p.elapsed_seconds} style={styles.row}>
                <Txt style={{ flex: 1, fontSize: 12 }}>
                  {clockTime(p.elapsed_seconds)} · {p.bean_temp_c}°C
                  {p.environment_temp_c !== null &&
                  p.environment_temp_c !== undefined
                    ? ' · ' +
                      (ar ? 'البيئة ' : 'Environment ') +
                      p.environment_temp_c +
                      '°C'
                    : ''}
                  {p.ror !== null && p.ror !== undefined
                    ? ' · ' + p.ror + '°C/' + (ar ? 'د' : 'min')
                    : ''}
                </Txt>
                <Action
                  title={(ar ? 'حذف القراءة ' : 'Remove sample ') + (i + 1)}
                  onPress={() =>
                    setDraft((d) => ({
                      ...d,
                      points: d.points.filter((_, j) => j !== i),
                    }))
                  }
                />
              </View>
            ))}
          </Disclosure>
          <Disclosure
            title={
              ar
                ? 'إعدادات الغاز والهواء والقدرة'
                : 'Gas, airflow and power settings'
            }
          >
            <View style={styles.row}>
              {Object.entries(controlNames).map(([id, label]) => (
                <Action
                  key={id}
                  title={label[ar ? 0 : 1]}
                  selected={control.type === id}
                  onPress={() => setControl((c) => ({ ...c, type: id }))}
                />
              ))}
            </View>
            <View style={s.fields}>
              {(['time', 'value', 'unit'] as const).map((key, i) => (
                <View key={key} style={s.field}>
                  <Field
                    label={
                      (ar
                        ? ['وقت تغيير الإعداد', 'قيمة الإعداد', 'وحدة القياس']
                        : ['Control change time', 'Control value', 'Unit'])[i]
                    }
                    value={control[key]}
                    onChangeText={(v) =>
                      setControl((c) => ({ ...c, [key]: v }))
                    }
                  />
                </View>
              ))}
            </View>
            <Action
              title={ar ? 'إضافة إعداد' : 'Add control setting'}
              onPress={addControl}
            />
            {draft.controls.map((c, i) => (
              <View key={i} style={styles.row}>
                <Txt style={{ flex: 1, fontSize: 12 }}>
                  {clockTime(c.elapsed_seconds)} ·{' '}
                  {controlNames[c.control_type]?.[ar ? 0 : 1] ?? c.control_type}{' '}
                  · {c.value} {c.unit}
                </Txt>
                <Action
                  title={(ar ? 'حذف الإعداد ' : 'Remove control ') + (i + 1)}
                  onPress={() =>
                    setDraft((d) => ({
                      ...d,
                      controls: d.controls.filter((_, j) => j !== i),
                    }))
                  }
                />
              </View>
            ))}
          </Disclosure>
          <Disclosure
            title={
              ar
                ? 'بيانات الدفعة واللون المستهدف'
                : 'Batch and target color details'
            }
          >
            <View style={s.fields}>
              {(
                [
                  'batch',
                  'ambient',
                  'greenTemp',
                  'agtronWhole',
                  'agtronGround',
                ] as const
              ).map((key, i) => (
                <View key={key} style={s.field}>
                  <Field
                    label={
                      (ar
                        ? [
                            'رقم الدفعة',
                            'حرارة الجو (°C)',
                            'حرارة البن قبل التحميص (°C)',
                            'قياس لون الحبة (0–150)',
                            'قياس لون المطحون (0–150)',
                          ]
                        : [
                            'Batch number',
                            'Ambient temperature (°C)',
                            'Green temperature (°C)',
                            'Whole-bean Agtron (0–150)',
                            'Ground Agtron (0–150)',
                          ])[i]
                    }
                    value={draft[key]}
                    onChangeText={(v) => edit(key, v)}
                    keyboardType="decimal-pad"
                  />
                </View>
              ))}
            </View>
            <Txt>{ar ? 'درجة التحميص المستهدفة' : 'Target roast level'}</Txt>
            <View style={styles.row}>
              <Action
                title={ar ? 'غير محددة' : 'Unspecified'}
                selected={!draft.target}
                onPress={() => edit('target', '')}
              />
              {Object.entries(roastNames).map(([id, label]) => (
                <Action
                  key={id}
                  title={label[ar ? 0 : 1]}
                  selected={draft.target === id}
                  onPress={() => edit('target', id)}
                />
              ))}
            </View>
          </Disclosure>
          <View
            style={[
              styles.card,
              { backgroundColor: publish ? '#EAF4F0' : colors.paper },
            ]}
          >
            <Txt heading style={{ fontWeight: '700' }}>
              {ar ? 'حفظ الحمصة' : 'Save this roast'}
            </Txt>
            <View style={styles.row}>
              <Action
                title={ar ? 'حمصة خاصة' : 'Private roast'}
                selected={!publish}
                onPress={() => setPublish(false)}
              />
              <Action
                title={ar ? 'نشر في المجتمع' : 'Share with community'}
                selected={publish}
                onPress={() => setPublish(true)}
              />
            </View>
            {publish ? (
              <Txt style={styles.muted}>
                {ar
                  ? 'سيظهر عنوان الحمصة واسم البن ومنشؤه ومراحلها وقياساتها وملاحظاتك ونتائج التذوق في المجتمع. مخزونك وبيانات مورّد البن تبقى خاصة.'
                  : 'Your roast title, coffee name and origin, stages, measurements, notes and tastings will appear in the community. Stock and supplier details stay private.'}
              </Txt>
            ) : null}
            <View style={styles.row}>
              {draft.status !== 'completed' && !publish ? (
                <Action
                  title={ar ? 'حفظ المسودة' : 'Save planned roast'}
                  disabled={saving}
                  onPress={() => void saveRoast(false)}
                />
              ) : null}
              <Action
                title={
                  saving
                    ? ar
                      ? 'جارٍ الحفظ…'
                      : 'Saving…'
                    : publish
                      ? ar
                        ? 'حفظ ونشر الحمصة'
                        : 'Save and publish roast'
                      : ar
                        ? 'حفظ الحمصة المكتملة'
                        : 'Save completed roast'
                }
                selected
                disabled={saving}
                onPress={() => void saveRoast(true)}
              />
            </View>
          </View>
        </>
      ) : section === 'green' ? (
        <>
          {greenDraft ? (
            <View style={styles.card}>
              <Txt heading style={styles.subtitle}>
                {greenCreating
                  ? ar
                    ? 'إضافة بنّي الأخضر'
                    : 'Add my green coffee'
                  : ar
                    ? 'بيانات البن والمخزون'
                    : 'Green coffee and stock'}
              </Txt>
              <View style={s.fields}>
                {greenFields.slice(0, 3).map((f) => (
                  <View key={f.key} style={s.field}>
                    <Field
                      label={ar ? f.ar : f.en}
                      value={greenDraft[f.key] ?? ''}
                      onChangeText={(v) =>
                        setGreenDraft((d) => (d ? { ...d, [f.key]: v } : null))
                      }
                    />
                  </View>
                ))}
                <View style={s.field}>
                  <Field
                    label={
                      ar
                        ? 'كمية شراء لإضافتها (غ)'
                        : 'Purchase quantity to add (g)'
                    }
                    value={greenDraft.quantity_grams}
                    onChangeText={(v) =>
                      setGreenDraft((d) =>
                        d ? { ...d, quantity_grams: v } : null,
                      )
                    }
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>
              <Disclosure
                title={
                  ar
                    ? 'تفاصيل المحصول والقياسات'
                    : 'Lot details and measurements'
                }
              >
                <View style={s.fields}>
                  {greenFields.slice(3).map((f) => (
                    <View key={f.key} style={s.field}>
                      <Field
                        label={ar ? f.ar : f.en}
                        value={greenDraft[f.key] ?? ''}
                        onChangeText={(v) =>
                          setGreenDraft((d) =>
                            d ? { ...d, [f.key]: v } : null,
                          )
                        }
                        keyboardType={f.numeric ? 'decimal-pad' : 'default'}
                      />
                    </View>
                  ))}
                </View>
                <Txt style={styles.label}>{ar ? 'النوع' : 'Species'}</Txt>
                <View style={styles.row}>
                  {[
                    '',
                    'arabica',
                    'robusta',
                    'liberica',
                    'excelsa',
                    'blend',
                    'other',
                  ].map((id) => (
                    <Action
                      key={id}
                      title={
                        !id
                          ? ar
                            ? 'غير محدد'
                            : 'Unspecified'
                          : id === 'other'
                            ? ar
                              ? 'نوع آخر'
                              : 'Other'
                            : catalogName(id, locale)
                      }
                      selected={greenDraft.species === id}
                      onPress={() =>
                        setGreenDraft((d) => (d ? { ...d, species: id } : null))
                      }
                    />
                  ))}
                </View>
                <Txt style={styles.label}>{ar ? 'المعالجة' : 'Processing'}</Txt>
                <View style={styles.row}>
                  {[
                    '',
                    'washed',
                    'natural',
                    'honey',
                    'anaerobic',
                    'wet_hulled',
                    'other',
                  ].map((id) => (
                    <Action
                      key={id}
                      title={
                        id
                          ? processLabel(id, locale)
                          : ar
                            ? 'غير محددة'
                            : 'Unspecified'
                      }
                      selected={greenDraft.process === id}
                      onPress={() =>
                        setGreenDraft((d) => (d ? { ...d, process: id } : null))
                      }
                    />
                  ))}
                </View>
              </Disclosure>
              <View style={styles.row}>
                <Action
                  title={ar ? 'حفظ البن الأخضر' : 'Save green coffee'}
                  selected
                  disabled={saving}
                  onPress={() => void saveGreen()}
                />
                <Action
                  title={ar ? 'إلغاء' : 'Cancel'}
                  disabled={saving}
                  onPress={() => setGreenDraft(null)}
                />
              </View>
            </View>
          ) : (
            <Action
              title={ar ? 'إضافة بنّي الأخضر' : 'Add my green coffee'}
              selected
              onPress={() => beginGreen()}
            />
          )}
          <View style={s.grid}>
            {green.map((g) => (
              <View
                key={g.id}
                style={[styles.card, { width: width >= 700 ? '48%' : '100%' }]}
              >
                <Icon name="bean" color={colors.teal} />
                <Txt heading style={styles.subtitle}>
                  {g.name}
                </Txt>
                <Txt style={styles.muted}>
                  {[
                    catalogName(g.origin_country, locale),
                    g.process ? processLabel(g.process, locale) : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </Txt>
                <Txt
                  style={{
                    fontSize: 26,
                    fontWeight: '700',
                    color: colors.teal,
                  }}
                >
                  {g.remaining} {ar ? 'غ متبقية' : 'g remaining'}
                </Txt>
                <Action
                  title={
                    (ar ? 'تعديل أو إضافة كمية: ' : 'Edit or add stock: ') +
                    g.name
                  }
                  onPress={() => beginGreen(g)}
                />
                <Action
                  title={
                    (ar ? 'حمّص هذا البن: ' : 'Roast this coffee: ') + g.name
                  }
                  onPress={() => {
                    makeDraft();
                    setDraft((d) => ({ ...d, green: g.id, title: g.name }));
                  }}
                />
              </View>
            ))}
          </View>
          {!green.length && !busy ? (
            <EmptyLab
              ar={ar}
              title={ar ? 'ابدأ ببنّك الأخضر' : 'Start with your green coffee'}
              note={
                ar
                  ? 'أضف اسم المحصول والكمية المتوفرة، ثم سجّل حمصاتك منه.'
                  : 'Add the lot name and available quantity, then record your roasts.'
              }
            />
          ) : null}
        </>
      ) : section === 'gear' ? (
        <>
          <Txt heading style={styles.subtitle}>
            {ar ? 'ماكينات التحميص المسجّلة' : 'My roasting machines'}
          </Txt>
          {gear.map((g) => (
            <View key={g.id} style={styles.card}>
              <Txt style={{ fontWeight: '700' }}>
                {catalogName(g.custom_name ?? g.model?.name ?? '', locale)}
              </Txt>
            </View>
          ))}
          <View style={styles.card}>
            <Field
              label={
                ar
                  ? 'اسم ماكينة التحميص الخاصة بي'
                  : 'My custom roasting machine'
              }
              value={customMachine}
              onChangeText={setCustomMachine}
            />
            <Action
              title={ar ? 'إضافة ماكينة التحميص' : 'Add roasting machine'}
              disabled={saving || customMachine.trim().length < 2}
              onPress={() => void addMachine()}
            />
          </View>
          <Txt heading style={styles.subtitle}>
            {ar ? 'من دليل الماكينات' : 'From the equipment catalog'}
          </Txt>
          {catalog.map((m) => (
            <View key={m.id} style={styles.card}>
              <Txt heading style={{ fontSize: 18, fontWeight: '700' }}>
                {m.name}
              </Txt>
              <Txt style={styles.muted}>{m.description}</Txt>
              <Action
                title={(ar ? 'أضف إلى معداتي: ' : 'Add to my gear: ') + m.name}
                disabled={saving}
                onPress={() => void addMachine(m)}
              />
            </View>
          ))}
        </>
      ) : (
        <>
          {section === 'own' && !userId ? (
            <View style={styles.card}>
              <Txt>
                {ar
                  ? 'سجّل الدخول لعرض حمصاتك والبن الأخضر الخاص بك.'
                  : 'Sign in to view your own roasts and green coffee.'}
              </Txt>
              <Action
                title={ar ? 'تسجيل الدخول' : 'Sign in'}
                selected
                onPress={login}
              />
            </View>
          ) : null}
          {comparison.length ? (
            <View style={[styles.card, { backgroundColor: '#EAF4F0' }]}>
              <Txt>
                {ar ? 'حمصات محددة للمقارنة: ' : 'Roasts selected: '}
                {comparison.length}
              </Txt>
              <View style={styles.row}>
                <Action
                  title={ar ? 'قارن الحمصات' : 'Compare roasts'}
                  disabled={comparison.length < 2 || busy}
                  selected
                  onPress={() => void compare()}
                />
                <Action
                  title={ar ? 'مسح المقارنة' : 'Clear comparison'}
                  onPress={() => setComparison([])}
                />
              </View>
            </View>
          ) : null}
          <View style={s.grid}>
            {roasts.map((r) => (
              <View
                key={r.id}
                style={[
                  styles.card,
                  {
                    width: width >= 700 ? '48%' : '100%',
                    marginBottom: 0,
                    gap: 9,
                  },
                ]}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    r.title ?? (ar ? 'فتح الحمصة' : 'Open roast')
                  }
                  onPress={() => void open(r.id)}
                >
                  <View
                    style={[
                      styles.row,
                      {
                        justifyContent: 'space-between',
                        flexDirection: ar ? 'row-reverse' : 'row',
                      },
                    ]}
                  >
                    <Icon name="bean" color={colors.copper} />
                    <Txt style={{ fontSize: 11, color: colors.teal }}>
                      {r.status === 'completed'
                        ? ar
                          ? 'مكتملة'
                          : 'Completed'
                        : ar
                          ? 'مسودة'
                          : 'Planned'}
                    </Txt>
                  </View>
                  <Txt
                    heading
                    style={{ fontSize: 20, lineHeight: 29, fontWeight: '700' }}
                  >
                    {r.title}
                  </Txt>
                  <Txt style={styles.muted}>
                    {[
                      r.public_coffee?.name ??
                        green.find((g) => g.id === r.green_coffee_id)?.name,
                      r.roast_date,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </Txt>
                  <RoastStats roast={r} compact />
                </Pressable>
                <Action
                  title={
                    (comparison.includes(r.id)
                      ? ar
                        ? 'إزالة من المقارنة: '
                        : 'Remove from comparison: '
                      : ar
                        ? 'قارن: '
                        : 'Compare: ') + (r.title ?? '')
                  }
                  selected={comparison.includes(r.id)}
                  disabled={
                    !comparison.includes(r.id) && comparison.length >= 3
                  }
                  onPress={() =>
                    setComparison((v) =>
                      v.includes(r.id)
                        ? v.filter((id) => id !== r.id)
                        : [...v, r.id],
                    )
                  }
                />
              </View>
            ))}
          </View>
          {!roasts.length && !busy ? (
            <EmptyLab
              ar={ar}
              title={
                section === 'public'
                  ? ar
                    ? 'مساحة لتبادل الحمصات'
                    : 'A place to share roasts'
                  : ar
                    ? 'حمصتك الأولى تبدأ هنا'
                    : 'Your first roast starts here'
              }
              note={
                section === 'public'
                  ? ar
                    ? 'عند نشر حمصة مكتملة، يظهر منحناها ومراحلها ونتائجها هنا للمقارنة.'
                    : 'Published completed roasts bring their curves, stages and results here for comparison.'
                  : ar
                    ? 'أضف البن الأخضر، حدّد دفعتك، وسجّل الوقت والمراحل من ماكينة التحميص.'
                    : 'Add green coffee, choose your batch and record times and stages from your roaster.'
              }
            />
          ) : null}
          {!roasts.length ? (
            <Action
              title={ar ? 'ابدأ تسجيل حمصة' : 'Record a roast'}
              selected
              onPress={() => {
                if (!userId) {
                  login();
                  return;
                }
                makeDraft();
              }}
            />
          ) : null}
        </>
      )}
    </ScrollView>
  );
}
function EmptyLab({
  ar,
  title,
  note,
}: {
  ar: boolean;
  title: string;
  note: string;
}) {
  return (
    <View style={[styles.card, { alignItems: 'center', gap: 9, padding: 24 }]}>
      <Icon name="bean" size={38} color={colors.copper} />
      <Txt heading style={[styles.subtitle, { textAlign: 'center' }]}>
        {title}
      </Txt>
      <Txt style={[styles.muted, { textAlign: 'center' }]}>{note}</Txt>
    </View>
  );
}
function RoastStats({
  roast,
  compact = false,
}: {
  roast: RoastProfile;
  compact?: boolean;
}) {
  const ar = useContext(Language) === 'ar';
  const m = roastMetrics(roast);
  const facts = [
    {
      label: ar ? 'وزن البن الأخضر' : 'Input',
      value:
        roast.green_weight_g !== null
          ? roast.green_weight_g + (ar ? ' غ' : ' g')
          : '—',
    },
    {
      label: ar ? 'فقدان الوزن' : 'Weight loss',
      value: m.loss !== null ? m.loss + '%' : '—',
    },
    {
      label: ar ? 'الوقت' : 'Time',
      value: m.total !== null ? clockTime(m.total) : '—',
    },
    {
      label: ar ? 'نسبة التطوير' : 'Development ratio',
      value: m.dtr !== null ? m.dtr + '%' : '—',
    },
    ...(!compact
      ? [
          {
            label: ar ? 'التجفيف' : 'Drying',
            value: m.drying !== null ? clockTime(m.drying) : '—',
          },
          {
            label: ar ? 'ميلارد' : 'Maillard',
            value: m.maillard !== null ? clockTime(m.maillard) : '—',
          },
          {
            label: ar ? 'التطوير' : 'Development',
            value: m.development !== null ? clockTime(m.development) : '—',
          },
          {
            label: ar ? 'درجة التحميص' : 'Roast level',
            value: roastNames[roast.roast_level ?? '']?.[ar ? 0 : 1] ?? '—',
          },
        ]
      : []),
  ];
  return (
    <View
      style={{
        flexDirection: ar ? 'row-reverse' : 'row',
        flexWrap: 'wrap',
        gap: 7,
        marginTop: 8,
      }}
    >
      {facts.map((f) => (
        <View
          key={f.label}
          style={{
            flexBasis: '46%',
            flexGrow: 1,
            padding: 9,
            borderRadius: 12,
            backgroundColor: '#F1E8DA',
          }}
        >
          <Txt style={{ fontSize: 11, color: colors.muted }}>{f.label}</Txt>
          <Txt style={{ fontSize: 16, fontWeight: '700' }}>{f.value}</Txt>
        </View>
      ))}
    </View>
  );
}
const s = StyleSheet.create({
  page: {
    width: '100%',
    maxWidth: 1000,
    alignSelf: 'center',
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 30,
    gap: 14,
  },
  hero: {
    backgroundColor: colors.brown,
    borderRadius: 22,
    padding: 22,
    gap: 16,
    alignItems: 'center',
  },
  fields: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  field: { flexBasis: '45%', minWidth: 125, flexGrow: 1 },
  stage: { marginBottom: 0, padding: 12, gap: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  compareRow: {
    padding: 12,
    gap: 10,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: colors.line,
  },
});
