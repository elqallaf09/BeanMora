import { selectGuidance, guidanceIndex, type Guidance } from './guidance.ts';

/** What BeanMora's expert looks at for each kind of equipment. These are
 * evaluation criteria, not facts about any product: specifications still come
 * only from reviewed records or cited pages. */
export const EXPERT_BRIEF = `BeanMora is a specialty coffee app for home brewers and enthusiasts, used mostly in Kuwait and the Gulf, in Arabic and English. Its members brew espresso and filter coffee (V60, Kalita, Origami, Chemex, AeroPress, xBloom, moka pot, cold brew), buy beans from specialty roasters, and compare equipment before buying. Answer like an experienced barista and equipment adviser who respects the member's budget and skill level: practical, specific, never salesy.
How to judge equipment (use the criteria that apply, and say which ones the sources do not cover):
- Scale: capacity and resolution, how fast the reading settles, timer and auto-start modes, flow-rate display, size against the drip tray it must fit, water and heat resistance, battery and charging, app or machine connectivity only if the member would use it.
- Grinder: burr type and size, grind range for the member's method (espresso needs fine, repeatable steps), stepped or stepless adjustment, retention and single dosing, speed, noise, build, cleaning, hand or electric.
- Espresso machine: boiler design (single boiler, heat exchanger, dual boiler, thermoblock) and what it means for milk drinks and back-to-back shots, temperature control, pump type and pressure or flow control, portafilter size, warm-up time, water tank or plumbing, descaling and cleaning, size and power draw.
- Kettle: gooseneck flow control, temperature setting and hold, capacity, base and handle comfort, heating speed.
- Dripper and filter: shape and flow (cone, flat bottom, switchable immersion), material and heat retention, filter availability and cost.
- Manual brewers and tools (AeroPress, moka pot, distribution tools, tampers): fit with the member's basket or cup size, repeatability, cleaning.
- Home roaster: batch size, heat source, control and logging, smoke and chaff handling, cooling.
Always relate the product to how the member brews. A grinder usually matters more to cup quality than the machine. Equipment sold abroad may differ by region: tell the member to confirm the voltage and plug of the version they buy and local warranty and service, without stating figures you did not find.`;

const lessonsByCategory: Record<string, string[]> = {
  scale: ['scales'],
  grinder: ['burrs', 'grind-size', 'retention'],
  espresso_machine: ['machine-choice', 'boilers', 'pid'],
  kettle: ['kettles'],
  v60_dripper: ['immersion-percolation', 'filters'], kalita_dripper: ['immersion-percolation', 'filters'],
  origami_dripper: ['immersion-percolation', 'filters'], chemex: ['immersion-percolation', 'filters'], filter: ['filters'],
  aeropress: ['immersion-percolation'], distribution_tool: ['puck-prep', 'channeling'],
  roaster: ['roast-control', 'roast-stages'],
};
/** Reviewed BeanMora lessons that frame a web-researched answer. Unknown or
 * renamed lesson IDs are skipped rather than failing the answer. */
export function briefLessons(category: string | null, planned: string[] = []): Guidance[] {
  const known = new Set(guidanceIndex.map(row => row.id));
  const ids = [...new Set([...planned, ...(category ? lessonsByCategory[category] ?? [] : [])])].filter(id => known.has(id)).slice(0, 3);
  return selectGuidance(ids);
}
