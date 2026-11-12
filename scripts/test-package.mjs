import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cp, mkdir, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const consumer = join(root, '.consumer');
const npmCli = process.env.npm_execpath;
assert.ok(npmCli, 'Run package verification through npm test');
const published = process.argv[2] === '--published';
assert.equal(process.argv.length, published ? 3 : 2, 'Only --published is supported');

function run(args, cwd = root, capture = false) {
  const result = spawnSync(process.execPath, [npmCli, ...args], {
    cwd, encoding: 'utf8', stdio: capture ? ['ignore', 'pipe', 'inherit'] : 'inherit',
  });
  if (result.error) throw result.error;
  assert.equal(result.status, 0, `npm ${args.join(' ')} failed`);
  return result.stdout;
}

await mkdir(join(root, '.artifacts'), { recursive: true });
const [pack] = JSON.parse(run(['pack', '--ignore-scripts', '--json', '--pack-destination', '.artifacts'], root, true));
assert.ok(pack.files.every(({ path }) => path.startsWith('dist/') || ['package.json', 'README.md', 'LICENSE'].includes(path)), 'Unexpected files in package');
for (const path of ['dist/index.js', 'dist/index.d.ts', 'dist/plots.js', 'dist/plots.d.ts', 'dist/numerics.js', 'dist/numerics.d.ts', 'dist/styles.css', 'dist/THIRD_PARTY_NOTICES.txt']) {
  assert.ok(pack.files.some(file => file.path === path), `Missing ${path}`);
}
await rm(consumer, { recursive: true, force: true });
await cp(join(root, 'examples', 'basic'), consumer, { recursive: true, filter: source => !source.includes('node_modules') && !source.includes(`${join('basic', 'dist')}`) });
const manifestPath = join(consumer, 'package.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
manifest.dependencies['@amitport/react-scrollytelling'] = published ? pack.version : `file:../.artifacts/${pack.filename}`;
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
run(['install', '--ignore-scripts', '--no-audit', '--no-fund'], consumer);
const installed = await realpath(join(consumer, 'node_modules', '@amitport', 'react-scrollytelling'));
assert.ok(!relative(consumer, installed).startsWith('..'), 'Consumer must install a package, not link to source');
const installedManifest = JSON.parse(await readFile(join(installed, 'package.json'), 'utf8'));
assert.equal(installedManifest.version, pack.version, 'Consumer must use the exact release version');
const css = await readFile(join(installed, 'dist', 'styles.css'), 'utf8');
assert.match(css, /data:.*?base64,/, 'Math fonts must be embedded');
assert.doesNotMatch(css, /url\(["']?(?!data:)/, 'Styles must not reference unpackaged fonts');
assert.doesNotMatch(css, /svd-/, 'Styles must use the neutral public namespace');
run(['run', 'build'], consumer);
run(['exec', '--', 'playwright', 'test']);
console.log(`Verified ${published ? 'published' : 'packed'} package: ${pack.name}@${pack.version}`);
