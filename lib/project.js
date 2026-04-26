// Определение типа проекта по cwd.
// Парсим package.json или известные файлы, возвращаем { kind, label, version }.
const fs = require('fs');
const path = require('path');

const cache = new Map(); // cwd -> { result, at }
const TTL = 5 * 60_000;

function detectFromPackageJson(pkg) {
  const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
  if (deps.next) return { kind: 'next', label: 'Next.js', version: deps.next };
  if (deps.nuxt || deps.nuxt3) return { kind: 'nuxt', label: 'Nuxt', version: deps.nuxt || deps.nuxt3 };
  if (deps.astro) return { kind: 'astro', label: 'Astro', version: deps.astro };
  if (deps['@sveltejs/kit']) return { kind: 'svelte', label: 'SvelteKit', version: deps['@sveltejs/kit'] };
  if (deps.svelte) return { kind: 'svelte', label: 'Svelte', version: deps.svelte };
  if (deps.remix || deps['@remix-run/react']) return { kind: 'remix', label: 'Remix' };
  if (deps.vite) return { kind: 'vite', label: 'Vite', version: deps.vite };
  if (deps['react-scripts']) return { kind: 'cra', label: 'CRA' };
  if (deps['@angular/core']) return { kind: 'angular', label: 'Angular' };
  if (deps.vue || deps['@vue/cli-service']) return { kind: 'vue', label: 'Vue' };
  if (deps.express) return { kind: 'express', label: 'Express' };
  if (deps.fastify) return { kind: 'fastify', label: 'Fastify' };
  if (deps.koa) return { kind: 'koa', label: 'Koa' };
  if (deps.hapi || deps['@hapi/hapi']) return { kind: 'hapi', label: 'Hapi' };
  if (deps.electron) return { kind: 'electron', label: 'Electron' };
  return { kind: 'node', label: 'Node' };
}

function detect(cwd) {
  if (!cwd) return null;
  const c = cache.get(cwd);
  if (c && Date.now() - c.at < TTL) return c.result;

  let result = null;
  try {
    const pj = path.join(cwd, 'package.json');
    if (fs.existsSync(pj)) {
      const pkg = JSON.parse(fs.readFileSync(pj, 'utf8'));
      result = detectFromPackageJson(pkg);
      result.name = pkg.name;
    } else if (fs.existsSync(path.join(cwd, 'Cargo.toml'))) {
      result = { kind: 'rust', label: 'Rust' };
    } else if (fs.existsSync(path.join(cwd, 'go.mod'))) {
      result = { kind: 'go', label: 'Go' };
    } else if (fs.existsSync(path.join(cwd, 'requirements.txt')) || fs.existsSync(path.join(cwd, 'pyproject.toml'))) {
      result = { kind: 'python', label: 'Python' };
    } else if (fs.existsSync(path.join(cwd, 'Gemfile'))) {
      result = { kind: 'ruby', label: 'Ruby' };
    } else if (fs.existsSync(path.join(cwd, 'composer.json'))) {
      result = { kind: 'php', label: 'PHP' };
    }
  } catch { /* ignore */ }

  cache.set(cwd, { result, at: Date.now() });
  return result;
}

module.exports = { detect };
