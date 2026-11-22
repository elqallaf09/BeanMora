type Environment = (name: string) => string | undefined;
const value = (env: Environment, name: string) => env(name)?.trim() || undefined;
const identifier = (text: string | undefined) => text === undefined || /^[a-zA-Z0-9_.:/-]{1,200}$/.test(text);
function scoped(env: Environment, dedicated: string, fallback: string) {
  const selected = env(dedicated);
  // An explicitly broken dedicated configuration must not bill a different project.
  return (selected === undefined ? env(fallback) : selected)?.trim();
}

export function coffeeAssistantConfig(env: Environment) {
  const apiKey = scoped(env, 'COFFEE_ASSISTANT_OPENAI_API_KEY', 'OPENAI_API_KEY');
  const organizationId = scoped(env, 'COFFEE_ASSISTANT_OPENAI_ORGANIZATION_ID', 'OPENAI_ORGANIZATION_ID');
  const projectId = scoped(env, 'COFFEE_ASSISTANT_OPENAI_PROJECT_ID', 'OPENAI_PROJECT_ID');
  // Require an explicit supported model; never silently invoke a retired default.
  const model = value(env, 'COFFEE_ASSISTANT_MODEL');
  const effort = value(env, 'COFFEE_ASSISTANT_REASONING_EFFORT');
  const reasoningEffort: 'none' | 'low' | 'medium' | undefined = effort === 'none' || effort === 'low' || effort === 'medium' ? effort : undefined;
  const pilot = value(env, 'COFFEE_ASSISTANT_PILOT_USER_IDS');
  const pilotUserIds = pilot ? pilot.split(',').map(id => id.trim()).filter(Boolean) : null;
  const pilotValid = !pilotUserIds || (pilotUserIds.length > 0 && pilotUserIds.every(id => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)));
  const enabled = env('COFFEE_ASSISTANT_ENABLED') === 'true' && !!apiKey && !/\s/.test(apiKey) && !!model
    && [model, organizationId, projectId].every(identifier) && (!effort || !!reasoningEffort) && pilotValid;
  return { apiKey, model, organizationId, projectId, reasoningEffort, pilotUserIds, enabled };
}
