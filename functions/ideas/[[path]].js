import {fetchArticles, ContentError} from '../../content/sanity.mjs';
import {renderIndex, renderArticle, renderTool, renderError, assetURL, escapeHTML} from '../../content/ideas-render.mjs';

export async function onRequest(context) {
  const {request,env} = context; const url = new URL(request.url); const origin = url.origin;
  const isProduction = url.hostname === 'orgintelligence.io' || url.hostname === 'www.orgintelligence.io';
  const headers = {'Content-Type':'text/html; charset=utf-8','Cache-Control':'public, max-age=0, s-maxage=60','X-Content-Type-Options':'nosniff',...(!isProduction ? {'X-Robots-Tag':'noindex, nofollow'} : {})};
  if (!['GET','HEAD'].includes(request.method)) return new Response('Method not allowed',{status:405,headers:{Allow:'GET, HEAD'}});
  const respond = (html,status=200) => new Response(request.method === 'HEAD' ? null : html,{status,headers});
  try {
    const path = url.pathname.replace(/^\/ideas\/?/,'').replace(/\/$/,'');
    if (url.pathname.endsWith('/') && url.pathname !== '/ideas') return new Response(null,{status:308,headers:{Location:url.pathname.replace(/\/$/,'')+url.search}});
    if (!path) {
      const topic = url.searchParams.get('topic') || ''; const q = (url.searchParams.get('q') || '').trim();
      const page = Number(url.searchParams.get('page') || 1);
      if (!Number.isInteger(page) || page < 1 || page > 417 || q.length > 120) throw new ContentError('Invalid filters.',400);
      const articles = await fetchArticles({env,topic:topic || undefined,q:q || undefined,limit:25,offset:(page-1)*24});
      return respond(renderIndex({articles:articles.slice(0,24),topic,q,page,hasNext:articles.length>24,origin}));
    }
    if (path === 'sitemap.xml') {
      const all = [];
      for (let offset=0; offset<=10000; offset+=100) {const batch=await fetchArticles({env,limit:100,offset}); all.push(...batch); if(batch.length<100) break;}
      headers['Content-Type']='application/xml; charset=utf-8';
      return respond(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${escapeHTML(origin)}/ideas</loc></url>${all.map(a=>`<url><loc>${escapeHTML(origin)}/ideas/${escapeHTML(a.slug)}</loc><lastmod>${escapeHTML(a._updatedAt || a.publishedAt)}</lastmod></url>`).join('')}</urlset>`);
    }
    const tool = path.startsWith('tools/'); const slug = tool ? path.slice(6) : path;
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new ContentError('Not found.',404);
    const [article] = await fetchArticles({env,slug});
    if (!article || (tool && !assetURL(article.resource?.url))) throw new ContentError('Not found.',404);
    if (tool) return respond(renderTool({article,origin}));
    let related = (article.relatedArticles || []).filter(a => a._id !== article._id).slice(0,3);
    if (!related.length) {try {related=(await fetchArticles({env,limit:4})).filter(a => a._id !== article._id).slice(0,3);} catch {/* Keep the article readable when recommendations fail. */}}
    return respond(renderArticle({article,related,origin}));
  } catch(error) {
    const status = error instanceof ContentError ? error.status : 502;
    headers['Cache-Control']='no-store'; headers['X-Robots-Tag']='noindex, nofollow';
    return respond(renderError({status,origin}),status);
  }
}
