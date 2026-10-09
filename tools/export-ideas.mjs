import {mkdir, writeFile, rename} from 'node:fs/promises';
import {resolve, join} from 'node:path';
import {fetchArticles} from '../content/sanity.mjs';

// Prepared for the future static blog build. This does not deploy or change live pages.
const articles = [];
for (let offset = 0; offset <= 10000; offset += 100) {
  const batch = await fetchArticles({env: process.env, limit: 100, offset, full: true});
  articles.push(...batch);
  if (batch.length < 100) break;
  if (offset === 10000) throw new Error('Export exceeded 10,000 articles. Use cursor pagination before expanding.');
}
const directory = resolve('output/content');
await mkdir(directory, {recursive: true});
const target = join(directory, 'ideas.json');
await writeFile(`${target}.tmp`, JSON.stringify({generatedAt: new Date().toISOString(), articles}, null, 2) + '\n');
await rename(`${target}.tmp`, target);
console.log(`Exported ${articles.length} published articles to ${target}.`);
