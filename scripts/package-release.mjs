import { readFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
const manifest = JSON.parse(readFileSync('dist/manifest.json','utf8'));
const pkg = JSON.parse(readFileSync('package.json','utf8'));
assert.equal(manifest.version, pkg.version);
assert.equal(manifest.manifest_version, 3);
assert.deepEqual(manifest.permissions, []);
assert.equal(manifest.web_accessible_resources, undefined);
for (const script of manifest.content_scripts) {
  for (const file of [...script.js, ...(script.css ?? [])]) {
    assert.ok(existsSync(`dist/${file}`), file);
    if (file.endsWith('.js')) {
      const code = readFileSync(`dist/${file}`, 'utf8');
      assert.ok(!/^\s*(import |export )/m.test(code), `Content script must be standalone: ${file}`);
      assert.ok(!/\beval\(/.test(code), 'No eval in release');
    }
  }
}
for (const icon of Object.values(manifest.icons)) assert.ok(existsSync(`dist/${icon}`));
assert.ok(!readdirSync('dist').some(f => f.endsWith('.map')));
mkdirSync('release', {recursive:true});
const archive = `ps-randbats-assistant-${pkg.version}.zip`;
// Explicit allowlist: development fixtures, tests and private files cannot ship.
execFileSync('zip', ['-q','-r',`../release/${archive}`, 'manifest.json','content.js','content.css','page-bridge.js','icons','THIRD_PARTY_NOTICES.txt'], {cwd:'dist'});
console.log(`Validated release/${archive}`);
