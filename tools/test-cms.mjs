import assert from 'node:assert/strict';
import {fetchArticles, contentConfig} from '../content/sanity.mjs';
import {onRequestGet} from '../functions/api/ideas.js';

const env = {SANITY_PROJECT_ID: 'test1234', SANITY_DATASET: 'production'};
const article = {_id: 'article.one', title: 'A better meeting', slug: 'a-better-meeting', publishedAt: '2026-01-01T00:00:00Z'};
let calls = 0;
const goodFetch = async (url, options) => {
  calls++;
  assert.equal(url.origin, 'https://test1234.api.sanity.io');
  assert.equal(url.searchParams.get('perspective'), 'published');
  assert.equal(options.headers.Authorization, undefined);
  assert.match(url.searchParams.get('query'), /drafts/);
  assert.match(url.searchParams.get('query'), /versions/);
  assert.match(url.searchParams.get('query'), /dateTime\(now\(\)\)/);
  return Response.json({result: [article]});
};
assert.equal((await fetchArticles({env, fetchImpl: goodFetch}))[0].title, article.title);
await fetchArticles({env, slug: article.slug, fetchImpl: async (url, options) => {
  assert.equal(url.searchParams.get('$slug'), JSON.stringify(article.slug));
  return goodFetch(url, options);
}});
assert.equal(calls, 2);
const filtered = await fetchArticles({env, fetchImpl: async () => Response.json({result: [
  {...article, _id: 'drafts.one'}, {...article, _id: 'versions.release.one'},
  {...article, publishedAt: '2999-01-01'}, {...article, publishedAt: 'invalid'},
  {...article, slug: '../bad'}, {...article, relatedArticles: [{...article, _id: 'drafts.related'}, article], topics: [null]},
]})});
assert.equal(filtered.length, 1);
assert.equal(filtered[0].relatedArticles.length, 1);
assert.deepEqual(filtered[0].topics, []);
for (const options of [{slug: 'bad" ]'}, {slug: ''}, {topic: '..'}, {limit: 101}, {limit: 1.5}, {offset: -1}]) {
  await assert.rejects(fetchArticles({env, ...options, fetchImpl: goodFetch}), error => error.status === 400);
}
assert.throws(() => contentConfig({SANITY_PROJECT_ID: 'bad.example.com'}), error => error.status === 503);
for (const fetchImpl of [async () => new Response('', {status: 401}), async () => Response.json({result: null}), async () => {throw new Error('network');}]) {
  await assert.rejects(fetchArticles({env, fetchImpl}), error => error.status === 502 && !error.message.includes('401'));
}
const originalFetch = globalThis.fetch;
try {
  globalThis.fetch = goodFetch;
  const request = suffix => new Request('https://orgintelligence.io/api/ideas' + suffix);
  const response = await onRequestGet({env, request: request('')});
  assert.equal(response.status, 200);
  assert.match(response.headers.get('cache-control'), /s-maxage=60/);
  for (const suffix of ['?perspective=drafts', '?token=secret', '?slug=one&slug=two', '?offset=-1']) {
    const rejected = await onRequestGet({env, request: request(suffix)});
    assert.equal(rejected.status, 400);
    assert.equal(rejected.headers.get('cache-control'), 'no-store');
  }
  globalThis.fetch = async () => Response.json({result: []});
  assert.equal((await onRequestGet({env, request: request('?slug=missing')})).status, 404);
  assert.equal((await onRequestGet({env, request: request('')})).status, 200);
  globalThis.fetch = async () => {throw new Error('unavailable');};
  assert.equal((await onRequestGet({env, request: request('')})).status, 502);
} finally {globalThis.fetch = originalFetch;}
console.log('CMS checks passed: published-only data, draft/future exclusions, safe queries, pagination, and failure handling.');
