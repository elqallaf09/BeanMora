import type { SupabaseClient } from '@supabase/supabase-js';
import { numberInput } from './guards';

export const ROAST_EVENTS = [
  'charge',
  'turning_point',
  'dry_end',
  'first_crack_start',
  'first_crack_end',
  'second_crack_start',
  'second_crack_end',
  'drop',
] as const;
export const eventNames: Record<string, [string, string]> = {
  charge: ['إدخال البن', 'Charge'],
  turning_point: ['نقطة التحول', 'Turning point'],
  dry_end: ['نهاية التجفيف', 'Drying end'],
  first_crack_start: ['بداية الفرقعة الأولى', 'First crack start'],
  first_crack_end: ['نهاية الفرقعة الأولى', 'First crack end'],
  second_crack_start: ['بداية الفرقعة الثانية', 'Second crack start'],
  second_crack_end: ['نهاية الفرقعة الثانية', 'Second crack end'],
  drop: ['إخراج البن', 'Drop'],
  custom: ['حدث إضافي', 'Custom event'],
};
export const controlNames: Record<string, [string, string]> = {
  power: ['القدرة', 'Power'],
  gas: ['الغاز', 'Gas'],
  airflow: ['تدفق الهواء', 'Airflow'],
  fan: ['المروحة', 'Fan'],
  drum_speed: ['سرعة الأسطوانة', 'Drum speed'],
  custom: ['إعداد إضافي', 'Custom control'],
};
export const roastNames: Record<string, [string, string]> = {
  light: ['فاتح', 'Light'],
  medium_light: ['متوسط فاتح', 'Medium light'],
  medium: ['متوسط', 'Medium'],
  medium_dark: ['متوسط داكن', 'Medium dark'],
  dark: ['داكن', 'Dark'],
};
export interface GreenCoffee {
  id: string;
  user_id: string;
  name: string;
  origin_country: string | null;
  origin_region: string | null;
  producer: string | null;
  farm: string | null;
  washing_station: string | null;
  lot_number: string | null;
  harvest_year: number | null;
  species: string | null;
  varietal: string | null;
  process: string | null;
  altitude_meters: number | null;
  moisture_pct: number | null;
  density_g_l: number | null;
  water_activity: number | null;
  screen_size: string | null;
  supplier: string | null;
  notes: string | null;
  remaining?: number;
}
export interface RoastEvent {
  event_type: string;
  elapsed_seconds: number;
  bean_temp_c: number | null;
  environment_temp_c?: number | null;
  notes?: string | null;
}
export interface RoastPoint {
  elapsed_seconds: number;
  bean_temp_c: number | null;
  environment_temp_c?: number | null;
  ror?: number | null;
}
export interface RoastControl {
  elapsed_seconds: number;
  control_type: string;
  value: number | null;
  unit: string | null;
  notes?: string | null;
}
export interface RoastTasting {
  id: string;
  rest_days: number | null;
  tasted_on: string | null;
  acidity: number | null;
  sweetness: number | null;
  body: number | null;
  aroma?: number | null;
  bitterness?: number | null;
  clarity?: number | null;
  aftertaste?: number | null;
  overall_score: number | null;
  flavor_notes: string[];
  notes: string | null;
  recipe_id?: string | null;
  brew_log_id?: string | null;
}
export interface RoastProfile {
  id: string;
  user_id: string;
  green_coffee_id: string;
  roaster_equipment_id: string | null;
  parent_roast_id: string | null;
  title: string | null;
  batch_number: number | null;
  roast_date: string;
  notes: string | null;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  visibility: 'private' | 'public' | 'unlisted';
  updated_at: string;
  green_weight_g: number | null;
  roasted_weight_g: number | null;
  total_time_seconds: number | null;
  charge_temp_c: number | null;
  drop_temp_c: number | null;
  ambient_temp_c: number | null;
  green_temp_c: number | null;
  target_roast_level: string | null;
  roast_level: string | null;
  agtron_whole: number | null;
  agtron_ground: number | null;
  weight_loss_percent: number | null;
  public_coffee?: {
    name?: string;
    origin?: string;
    process?: string;
    varietal?: string;
  };
  events: RoastEvent[];
  points?: RoastPoint[];
  controls?: RoastControl[];
  tastings?: RoastTasting[];
}
export const ROAST_FIELDS =
  'id,user_id,green_coffee_id,roaster_equipment_id,parent_roast_id,title,batch_number,roast_date,notes,status,visibility,updated_at,green_weight_g,roasted_weight_g,total_time_seconds,charge_temp_c,drop_temp_c,ambient_temp_c,green_temp_c,target_roast_level,roast_level,agtron_whole,agtron_ground,weight_loss_percent,public_coffee,events:roast_events(event_type,elapsed_seconds,bean_temp_c,environment_temp_c,notes)';
export const clockTime = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
export const normalizedNumber = (value: string) =>
  value
    .trim()
    .replace(/[٠-٩]/g, (x) => String(x.charCodeAt(0) - 1632))
    .replace(/[۰-۹]/g, (x) => String(x.charCodeAt(0) - 1776))
    .replace(/٫/g, '.');
export function parseRoastNumber(value: string): number | null {
  const v = normalizedNumber(value);
  if (!/^-?\d+(?:\.\d+)?$/.test(v)) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
export function validRoastDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + 'T00:00:00Z');
  return (
    Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}
export function parseRoastTime(value: string): number | null {
  const v = normalizedNumber(value);
  if (!v) return null;
  const parts = v.split(':');
  let n: number | null = null;
  if (
    parts.length === 2 &&
    /^\d{1,4}$/.test(parts[0]) &&
    /^\d{1,2}$/.test(parts[1]) &&
    Number(parts[1]) < 60
  )
    n = Number(parts[0]) * 60 + Number(parts[1]);
  else if (parts.length === 1) n = numberInput(v);
  return n !== null && Number.isInteger(n) && n >= 0 && n <= 172800 ? n : null;
}
export function roastMetrics(
  roast: Pick<
    RoastProfile,
    'events' | 'total_time_seconds' | 'green_weight_g' | 'roasted_weight_g'
  >,
) {
  const at = (type: string) =>
    roast.events.find((e) => e.event_type === type)?.elapsed_seconds ?? null;
  const charge = at('charge') ?? 0;
  const dry = at('dry_end');
  const crack = at('first_crack_start');
  const drop = at('drop');
  const total = drop ?? roast.total_time_seconds;
  const difference = (a: number | null, b: number | null) =>
    a !== null && b !== null && a >= b ? a - b : null;
  const development = difference(drop, crack);
  const before = Number(roast.green_weight_g),
    after = Number(roast.roasted_weight_g);
  return {
    total,
    drying: difference(dry, charge),
    maillard: difference(crack, dry),
    development,
    dtr:
      development !== null && total !== null && total > 0
        ? Math.round((development / total) * 1000) / 10
        : null,
    loss:
      before > 0 && after > 0 && after <= before
        ? Math.round(((before - after) / before) * 10000) / 100
        : null,
  };
}
export function validateRoastSeries(
  events: RoastEvent[],
  total: number | null,
  points: RoastPoint[] = [],
  controls: RoastControl[] = [],
): boolean {
  if (
    total !== null &&
    (!Number.isInteger(total) || total < 0 || total > 172800)
  )
    return false;
  const drop = events.find((e) => e.event_type === 'drop');
  if (drop && total !== null && drop.elapsed_seconds !== total) return false;
  let previous = -1,
    rank = -1;
  const used = new Set<string>();
  for (const e of events) {
    const index = ROAST_EVENTS.indexOf(
      e.event_type as (typeof ROAST_EVENTS)[number],
    );
    if (
      !Number.isInteger(e.elapsed_seconds) ||
      e.elapsed_seconds < 0 ||
      (total !== null && e.elapsed_seconds > total) ||
      e.elapsed_seconds < previous ||
      (e.event_type === 'charge' && e.elapsed_seconds !== 0) ||
      (index >= 0 && (used.has(e.event_type) || index <= rank)) ||
      !tempValid(e.bean_temp_c, -50, 400) ||
      !tempValid(e.environment_temp_c ?? null, -50, 600)
    )
      return false;
    if (index >= 0) {
      rank = index;
      used.add(e.event_type);
    }
    previous = e.elapsed_seconds;
  }
  return (
    events.length <= 30 &&
    points.length <= 3000 &&
    controls.length <= 200 &&
    [...points, ...controls].every(
      (e) =>
        Number.isInteger(e.elapsed_seconds) &&
        e.elapsed_seconds >= 0 &&
        e.elapsed_seconds <= 172800 &&
        (total === null || e.elapsed_seconds <= total),
    ) &&
    points.every(
      (p) =>
        tempValid(p.bean_temp_c, -50, 400) &&
        tempValid(p.environment_temp_c ?? null, -50, 600) &&
        tempValid(p.ror ?? null, -1000, 1000),
    ) &&
    controls.every(
      (c) =>
        tempValid(c.value, -1000000, 1000000) &&
        (!c.unit || c.unit.length <= 30),
    )
  );
}
const tempValid = (v: number | null, min: number, max: number) =>
  v === null || (Number.isFinite(v) && v >= min && v <= max);
export function roastError(code: string, ar: boolean) {
  const errors: Record<string, [string, string]> = {
    ROAST_INVENTORY: [
      'كمية البن الأخضر أقل من وزن الدفعة. أضف الكمية المتوفرة إلى المخزون.',
      'This batch exceeds your green stock. Add your actual available quantity.',
    ],
    ROAST_ORDER: [
      'راجع ترتيب مراحل الحمصة وأوقاتها ودرجات الحرارة.',
      'Check roast stage order, timestamps and temperatures.',
    ],
    ROAST_RESULT: [
      'أدخل مدة الحمصة ووزنها بعد التحميص، على ألا يتجاوز وزن البن الأخضر.',
      'Enter roast duration and output weight, no greater than input weight.',
    ],
    ROAST_STALE: [
      'هذه الحمصة تغيّرت في جلسة أخرى. أعد فتحها قبل التعديل.',
      'This roast changed in another session. Reopen it before editing.',
    ],
    ROAST_COMPLETE_FIRST: [
      'أكمل بيانات الحمصة قبل نشرها.',
      'Complete the roast before publishing.',
    ],
  };
  return (
    errors[code]?.[ar ? 0 : 1] ??
    (ar
      ? 'تعذّر حفظ البيانات. راجع الحقول وحاول مرة أخرى.'
      : 'Could not save. Check your entries and try again.')
  );
}
export async function loadGreen(
  db: SupabaseClient,
  userId: string,
): Promise<GreenCoffee[]> {
  const [g, b] = await Promise.all([
    db
      .from('green_coffees')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(200),
    db
      .from('green_coffee_balances')
      .select('green_coffee_id,remaining_grams')
      .eq('user_id', userId)
      .limit(200),
  ]);
  if (g.error || b.error) throw g.error ?? b.error;
  const balances = new Map(
    (b.data ?? []).map((r) => [r.green_coffee_id, Number(r.remaining_grams)]),
  );
  return (g.data ?? []).map((r) => ({
    ...r,
    remaining: balances.get(r.id) ?? 0,
  })) as GreenCoffee[];
}
export async function loadRoasts(
  db: SupabaseClient,
  userId: string | null,
  scope: 'own' | 'public',
): Promise<RoastProfile[]> {
  if (scope === 'own' && !userId) return [];
  let query = db
    .from('roast_profiles')
    .select(ROAST_FIELDS)
    .order('roast_date', { ascending: false })
    .order('id')
    .limit(60);
  query =
    scope === 'own'
      ? query.eq('user_id', userId!)
      : query.eq('visibility', 'public').eq('status', 'completed');
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as RoastProfile[];
}
export async function loadRoastDetails(
  db: SupabaseClient,
  id: string,
): Promise<RoastProfile> {
  const { data, error } = await db
    .from('roast_profiles')
    .select(
      `${ROAST_FIELDS},points:roast_curve_points(elapsed_seconds,bean_temp_c,environment_temp_c,ror),controls:roast_control_events(elapsed_seconds,control_type,value,unit,notes),tastings:roast_tastings(id,rest_days,tasted_on,acidity,sweetness,body,aroma,bitterness,clarity,aftertaste,overall_score,flavor_notes,notes,recipe_id,brew_log_id)`,
    )
    .eq('id', id)
    .single();
  if (error || !data) throw error ?? new Error('missing');
  const row = data as unknown as RoastProfile;
  row.events.sort((a, b) => a.elapsed_seconds - b.elapsed_seconds);
  row.points?.sort((a, b) => a.elapsed_seconds - b.elapsed_seconds);
  row.controls?.sort((a, b) => a.elapsed_seconds - b.elapsed_seconds);
  return row;
}
