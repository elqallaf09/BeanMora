import { expect, it } from "vitest";
import {
  converseLocally,
  type LocalAssistantDependencies,
} from "./local-coffee-assistant";
const offline: LocalAssistantDependencies = {
  search: async () => {
    throw new Error("Unexpected catalog request");
  },
};
it.each([
  ["شلون أخزن البن؟", "storage", "وعاء محكم"],
  ["شنو الفرق بين المغسول والعسلي؟", "processing", "لا يعني إضافة عسل"],
  ["أفضل ماء للقهوة؟", "water", "TDS وحده"],
  ["ليش نسوي بلوم؟", "bloom", "غازات التحميص"],
  ["كم راحة البن بعد التحميص؟", "rest", "ليس قاعدة لكل المحامص"],
  ["التحميص الفاتح والغامق", "roast", "تختلف بين المحامص"],
])(
  "answers %s offline with the appropriate source",
  async (question, topic, fact) => {
    const turn = await converseLocally(question, "ar", [], offline);
    expect(turn.knowledgeTopic).toBe(topic);
    expect(turn.answer).toContain(fact);
    expect(turn.sources?.[0].url).toMatch(/^https:\/\//);
  },
);
it("keeps educational follow-ups, calculation units and shopping separate", async () => {
  const a = await converseLocally(
    "How should I store beans?",
    "en",
    [],
    offline,
  );
  const b = await converseLocally("Tell me more", "en", [a], offline);
  expect(b.knowledgeTopic).toBe("storage");
  const c = await converseLocally("Calculate 18 g at 1:16", "en", [b], offline);
  expect(c.answer).toContain("Brew water: 288 g");
  let searched = false;
  await converseLocally("أبي بن معالجة عسلية", "ar", [a], {
    search: async () => {
      searched = true;
      return { documents: [], rates: [] };
    },
  });
  expect(searched).toBe(true);
});
