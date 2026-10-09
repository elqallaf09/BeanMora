import { expect, it } from "vitest";
import {
  emptyGrinderContext,
  grinderStart,
  parseGrinderContext,
  saveConfiguredBrew,
} from "./grinder-context";
const id = "11111111-1111-4111-8111-111111111111";
const payload = {
  recipe_id: id,
  bean_id: null,
  brew_method: "v60",
  dose_grams: 18,
  water_grams: 300,
  actual_time_seconds: 180,
  outcome: "good",
  status: "brewed_as_written",
  share_with_community: false,
  next_grind_adjustment: null,
  taste_scores: {},
  brewed: true,
};
it("rejects impossible roast dates and malformed or unbounded model context", () => {
  for (const change of [
    { roast_date: "2026-02-30" },
    { grinder_model_id: "not-a-model" },
    { grind_setting: "x".repeat(101) },
    { roast_level: "green" },
    { taste_signal: "made_up" },
    { user_id: id },
  ])
    expect(
      parseGrinderContext({ ...emptyGrinderContext(), ...change }),
    ).toBeNull();
  expect(
    parseGrinderContext({
      ...emptyGrinderContext(),
      roast_date: "2024-02-29",
      grind_setting: "٣",
      calibration: "standard burrs, zero checked",
    }),
  ).not.toBeNull();
});
it("retries the exact cup and model context together and requires the confirmed request ID", async () => {
  const calls: unknown[] = [];
  const context = {
    ...emptyGrinderContext(),
    grinder_model_id: id,
    grind_setting: "8",
    roast_level: "light" as const,
  };
  const db = {
    rpc: async (name: string, args: unknown) => {
      calls.push([name, args]);
      return calls.length === 1
        ? { data: null, error: { message: "temporary" } }
        : { data: id, error: null };
    },
  };
  expect(await saveConfiguredBrew(db, id, payload, context)).toEqual({
    ok: false,
    error: "retry",
  });
  expect(await saveConfiguredBrew(db, id, payload, context)).toEqual({
    ok: true,
    id,
  });
  expect(calls[0]).toEqual(calls[1]);
  expect(calls[0]).toEqual([
    "record_configured_brew_v1",
    { p_request_id: id, p_payload: payload, p_context: context },
  ]);
});
it("manufacturer starts never cross grinder generations or Aiden’s brewer scope", () => {
  expect(grinderStart("Baratza Encore", "espresso")).toBeNull();
  expect(grinderStart("Baratza Encore ESP", "espresso")?.note.en).toContain(
    "18 g medium-roast",
  );
  expect(grinderStart("Comandante C40 MK4", "v60")?.setting).toBe("18–35");
  expect(grinderStart("Fellow Ode Gen 2", "v60")).toBeNull();
  expect(
    grinderStart(
      "Fellow Ode Gen 2",
      "auto_drip",
      "Fellow Aiden Precision Coffee Maker",
    )?.note.en,
  ).toContain("150–450 mL");
  expect(
    grinderStart(
      "Fellow Opus 2 Conical Burr Grinder",
      "auto_drip",
      "Fellow Aiden Precision Coffee Maker",
    ),
  ).toBeNull();
});
