import {fetchArticles, ContentError} from '../../content/sanity.mjs';

export async function onRequestGet({request, env}) {
  const params = new URL(request.url).searchParams;
  try {
    for (const key of params.keys()) {
      if (!['slug', 'topic', 'limit', 'offset'].includes(key)) throw new ContentError('Unsupported query parameter.', 400);
      if (params.getAll(key).length !== 1) throw new ContentError('Repeated query parameter.', 400);
    }
    const articles = await fetchArticles({
      env, slug: params.has('slug') ? params.get('slug') : undefined,
      topic: params.has('topic') ? params.get('topic') : undefined,
      limit: params.has('limit') ? Number(params.get('limit')) : 24,
      offset: params.has('offset') ? Number(params.get('offset')) : 0,
    });
    if (params.has('slug') && !articles.length) throw new ContentError('Article not found.', 404);
    return Response.json({articles}, {headers: {
      'Cache-Control': 'public, max-age=0, s-maxage=60',
      'X-Content-Type-Options': 'nosniff',
    }});
  } catch (error) {
    return Response.json({error: error instanceof ContentError ? error.message : 'Ideas are temporarily unavailable.'}, {
      status: error instanceof ContentError ? error.status : 502,
      headers: {'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff'},
    });
  }
}
