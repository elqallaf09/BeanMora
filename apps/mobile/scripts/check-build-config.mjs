import { pathToFileURL } from 'node:url';

const urlName = 'EXPO_PUBLIC_SUPABASE_URL';
const keyName = 'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY';
const placeholderProject = /^(?:mobilefixture|fixture|test|example|placeholder|dummy|mock|yourproject|yourprojectref|changeme)$/i;
const placeholderKey = /(?:^|[_-])(?:fixture|test|example|placeholder|dummy|mock|your[_-]?key|change[_-]?me)(?:[_-]|$)/i;

// Runs before dependencies are installed. Read only the supplied environment:
// no .env files, network calls, credential logging, or production key fixtures.
export function checkBuildConfig(env) {
  const issues = [];
  const url = typeof env[urlName] === 'string' ? env[urlName] : '';
  const key = typeof env[keyName] === 'string' ? env[keyName] : '';
  // Keep this consistent with src/client.ts; paths, ports and trailing slashes
  // would otherwise pass a URL parser but leave the mobile client unconfigured.
  const project = /^https:\/\/([a-z0-9]+)\.supabase\.co$/.exec(url)?.[1];

  if (!url.trim()) {
    issues.push(`${urlName} is required.`);
  } else if (!project) {
    issues.push(`${urlName} must be a bare HTTPS Supabase project URL, without a path, port, or surrounding whitespace.`);
  } else if (placeholderProject.test(project)) {
    issues.push(`${urlName} must not use a fixture or placeholder project.`);
  }

  if (!key.trim()) {
    issues.push(`${keyName} is required.`);
    return issues;
  }
  if (key.startsWith('sb_secret_')) {
    issues.push(`${keyName} must never contain a secret key.`);
    return issues;
  }
  if (/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)) {
    if (placeholderKey.test(key.slice('sb_publishable_'.length))) {
      issues.push(`${keyName} must not use a fixture or placeholder key.`);
    }
    return issues;
  }

  try {
    const parts = key.split('.');
    if (parts.length !== 3 || !parts.every(part => /^[A-Za-z0-9_-]+$/.test(part))) throw new Error();
    const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    if (!header || typeof header.alg !== 'string' || header.alg.toLowerCase() === 'none' || !header.alg
      || !payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error();
    if (payload.role !== 'anon') {
      issues.push(`${keyName} must be a publishable or legacy anon key; service_role and user session tokens are not allowed.`);
    } else if (Object.hasOwn(payload, 'ref') && (typeof payload.ref !== 'string' || !payload.ref)) {
      issues.push(`${keyName} contains a malformed project reference.`);
    } else if (project && payload.ref && payload.ref !== project) {
      issues.push(`${keyName} and ${urlName} refer to different Supabase projects.`);
    }
  } catch {
    issues.push(`${keyName} must be a valid publishable key or a complete legacy anon JWT.`);
  }
  return issues;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const issues = checkBuildConfig(process.env);
  if (issues.length) {
    console.error('BeanMora build configuration failed. Check the public variables in the selected EAS environment:');
    for (const issue of issues) console.error(`- ${issue}`);
    process.exitCode = 1;
  } else {
    console.log('BeanMora build configuration passed. Key format checked locally; Supabase was not contacted.');
  }
}
