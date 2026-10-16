# Coffee expert conversation and answer readability

The reported V60 preparation question lost its context when followed by “مثلج v60” and returned an unrelated coffee recommendation. Short brewer/serving replies now continue the calculation, preserving the dose and any explicit ratio. Arabic digits, v-60 spelling, standalone iced V60 and a requested numeric dose are covered. A new shopping request or taste complaint keeps its own intent.

Explicit hot and iced V60 answers provide quantities, numbered preparation steps, suggested pour amounts and grind guidance. The starting recipes use the published Bean Rock guides below, with proportional quantities and approximate timing. Ice is part of total water. Doses over 40 g receive total quantities and a batch-capacity explanation instead of single-cup timing.

- https://beanrockcoffee.com/coffee-recipes/v60-iced-coffee-japanese-style/
- https://beanrockcoffee.com/coffee-recipes/v60-4-6-method-advanced/

Every conversation answer stays visible; Show answer / Collapse answer controls are removed. Paragraphs, headings and quantity cards improve scanning, and new replies scroll to their beginning. The additional messages are translated in all six secondary language packs. Calculations remain local and require no catalog lookup or model provider.

Local validation: 183 assistant/quantity unit cases, root lint and TypeScript, mobile TypeScript and unit checks, shared-core synchronization and translation coverage. The 44-case browser suite passed 43 cases; its remaining error assertion was corrected to target the persistent error region. That case and the new 390 px / 1280 px reported-conversation cases then passed on the final export. The viewport cases check preserved history, no fold controls, correct dose/ice/water, answer positioning and no horizontal overflow or catalog/provider requests.

Publication follows the existing checked-main web release workflow. The PR records final CI and deployment receipts; local fixture exports are never deployed.
