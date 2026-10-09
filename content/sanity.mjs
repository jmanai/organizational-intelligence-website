import defaults from './sanity.json' with {type: 'json'};

export class ContentError extends Error {
  constructor(message, status = 502) { super(message); this.status = status; }
}

export function contentConfig(env = {}) {
  const projectId = env.SANITY_PROJECT_ID || defaults.projectId;
  const dataset = env.SANITY_DATASET || defaults.dataset;
  if (!/^[a-z0-9]{1,32}$/.test(projectId) || !/^[a-z0-9][a-z0-9_-]{0,63}$/.test(dataset)) {
    throw new ContentError('The Ideas content service is not configured yet.', 503);
  }
  return {projectId, dataset, apiVersion: defaults.apiVersion};
}

const published = `_type == "article" && !(_id in path("drafts.**")) && !(_id in path("versions.**"))
  && defined(slug.current) && defined(publishedAt) && dateTime(publishedAt) <= dateTime(now())`;
const image = `{alt, caption, crop, hotspot, "url": asset->url, "dimensions": asset->metadata.dimensions}`;
const summary = `_id, title, "slug": slug.current, excerpt, publishedAt, _updatedAt, featured,
  heroImage${image}, author->{_id, name, role, bio, photo${image}},
  topics[]->{_id, title, "slug": slug.current}`;
const detail = `${summary}, seoTitle, seoDescription, socialImage${image},
  body[]{..., _type == "editorialImage" => {"url": asset->url, "dimensions": asset->metadata.dimensions}},
  resource{label, "url": asset->url, "filename": asset->originalFilename, "size": asset->size},
  "relatedArticles": relatedArticles[]->{${summary}}`;

function isPublishedArticle(article, now = Date.now()) {
  return article && typeof article._id === 'string' && !/^(drafts|versions)\./.test(article._id)
    && typeof article.title === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(article.slug)
    && Number.isFinite(Date.parse(article.publishedAt)) && Date.parse(article.publishedAt) <= now;
}

// Drafts never require a website token: the authenticated Studio handles its own preview.
// Website queries always use the published perspective and never forward caller credentials.
export async function fetchArticles({env = {}, slug, topic, q, limit = 24, offset = 0, full = false, fetchImpl = fetch} = {}) {
  const config = contentConfig(env);
  if (slug !== undefined && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new ContentError('Invalid article slug.', 400);
  if (topic !== undefined && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(topic)) throw new ContentError('Invalid topic.', 400);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100 || !Number.isInteger(offset) || offset < 0 || offset > 10000) {
    throw new ContentError('Invalid pagination.', 400);
  }
  if (q !== undefined && (typeof q !== 'string' || q.length > 120)) throw new ContentError('Invalid search.', 400);
  const conditions = `${published}${slug ? ' && slug.current == $slug' : ''}${topic ? ' && $topic in topics[]->slug.current' : ''}${q ? ' && (title match $search || excerpt match $search || pt::text(body) match $search)' : ''}`;
  const query = `*[${conditions}] | order(publishedAt desc, _id asc) [${offset}...${offset + limit}]{${full || slug ? detail : summary}}`;
  const url = new URL(`https://${config.projectId}.api.sanity.io/v${config.apiVersion}/data/query/${config.dataset}`);
  url.searchParams.set('query', query);
  url.searchParams.set('perspective', 'published');
  if (slug) url.searchParams.set('$slug', JSON.stringify(slug));
  if (topic) url.searchParams.set('$topic', JSON.stringify(topic));
  if (q) url.searchParams.set('$search', JSON.stringify(q.replace(/[\*?]/g, '').trim()));
  let result;
  try {
    const response = await fetchImpl(url, {headers: {Accept: 'application/json'}, signal: AbortSignal.timeout(8000)});
    if (!response.ok) throw new Error('Sanity query failed');
    ({result} = await response.json());
    if (!Array.isArray(result)) throw new Error('Unexpected Sanity result');
  } catch {
    throw new ContentError('Ideas are temporarily unavailable. Please try again shortly.');
  }
  return result.filter(article => isPublishedArticle(article)).map(article => ({
    ...article,
    topics: Array.isArray(article.topics) ? article.topics.filter(Boolean) : [],
    ...(article.relatedArticles ? {relatedArticles: article.relatedArticles.filter(item => isPublishedArticle(item))} : {}),
  }));
}
