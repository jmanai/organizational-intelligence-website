import {cp, mkdir, readdir, copyFile, rm} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = join(root, 'dist', 'site');
// Only this generated directory is replaced. Never copy the repository root:
// it also contains the Studio, scripts, and ignored local credentials.
await rm(output, {recursive: true, force: true});
await mkdir(output, {recursive: true});
const publicFiles = new Set(['robots.txt', 'sitemap.xml', '_redirects', '_routes.json', '_headers', 'favicon.ico']);
for (const entry of await readdir(root, {withFileTypes: true})) {
  if (entry.isFile() && (entry.name.endsWith('.html') || publicFiles.has(entry.name))) {
    await copyFile(join(root, entry.name), join(output, entry.name));
  }
}
await cp(join(root, 'assets'), join(output, 'assets'), {recursive: true});
console.log(`Public website assets are ready in ${output}. Cloudflare bundles functions/ separately.`);
