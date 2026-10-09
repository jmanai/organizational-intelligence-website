import {useEffect, useState} from 'react'
import {PortableText, type PortableTextBlock} from '@portabletext/react'
import {useClient} from 'sanity'
import {apiVersion, projectId, dataset} from '../config'
import './preview.css'

type ImageValue = {asset?: {_ref?: string}; alt?: string; caption?: string}
type Article = {
  title?: string; excerpt?: string; body?: PortableTextBlock[]; heroImage?: ImageValue;
  author?: {_ref?: string}; publishedAt?: string; resource?: {asset?: {_ref?: string}; label?: string};
}

function imageUrl(value?: ImageValue) {
  const match = value?.asset?._ref?.match(/^image-([a-f0-9]+)-(\d+x\d+)-(jpg|jpeg|png|webp|gif|avif)$/)
  return match ? `https://cdn.sanity.io/images/${projectId}/${dataset}/${match[1]}-${match[2]}.${match[3]}?w=1200&fit=max&auto=format` : ''
}

function safeLink(value: unknown) {
  if (typeof value !== 'string') return undefined
  try {
    const url = new URL(value, 'https://orgintelligence.io')
    return ['https:', 'http:', 'mailto:'].includes(url.protocol) ? url.href : undefined
  } catch { return undefined }
}

function EditorialImage({value}: {value: ImageValue}) {
  const src = imageUrl(value)
  return src ? <figure><img src={src} alt={value.alt || ''}/>{value.caption && <figcaption>{value.caption}</figcaption>}</figure> : null
}

export function ArticlePreview({document}: {document: {displayed: Article}}) {
  const article = document.displayed
  const client = useClient({apiVersion})
  const [author, setAuthor] = useState('')
  useEffect(() => {
    let active = true
    setAuthor('')
    if (article.author?._ref) {
      client.withConfig({useCdn: false, perspective: 'drafts'}).fetch<string | null>(
        '*[_id == $id][0].name', {id: article.author._ref},
      ).then(name => {if (active) setAuthor(name || '')}).catch(() => {})
    }
    return () => {active = false}
  }, [client, article.author?._ref])
  const date = article.publishedAt && !Number.isNaN(Date.parse(article.publishedAt))
    ? new Date(article.publishedAt).toLocaleDateString('en-US', {month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC'}) : ''

  return <div className="oi-preview">
    <aside className="oi-preview-note">Private reading preview · Final website layout pending customer approval</aside>
    <article>
      <p className="oi-preview-kicker">Organizational Intelligence / Ideas</p>
      <h1>{article.title || 'Your article title'}</h1>
      <p className="oi-preview-summary">{article.excerpt}</p>
      <p className="oi-preview-meta">{[author, date].filter(Boolean).join(' · ')}</p>
      {article.heroImage && <EditorialImage value={article.heroImage}/>}
      <div className="oi-preview-body">
        {article.body?.length ? <PortableText value={article.body} components={{
          types: {editorialImage: EditorialImage},
          marks: {link: ({value, children}) => <a href={safeLink(value?.href)} target="_blank" rel="noopener noreferrer">{children}</a>},
        }}/> : <p>Your writing will appear here as you type.</p>}
      </div>
      {article.resource?.asset && <aside className="oi-preview-resource">Download: {article.resource.label || 'Attached PDF'}</aside>}
    </article>
  </div>
}
