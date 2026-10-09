import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {projectId, dataset} from './config'
import {schemaTypes} from './schemaTypes'
import {ArticlePreview} from './src/ArticlePreview'

export default defineConfig({
  name: 'oi', title: 'Organizational Intelligence', projectId, dataset,
  plugins: [structureTool({
    title: 'Ideas',
    structure: S => S.list().title('OI Content').items([
      S.documentTypeListItem('article').title('Articles'),
      S.divider(),
      S.documentTypeListItem('author').title('Authors'),
      S.documentTypeListItem('topic').title('Topics'),
    ]),
    defaultDocumentNode: (S, {schemaType}) => schemaType === 'article'
      ? S.document().views([S.view.form(), S.view.component(ArticlePreview).title('Reading preview')])
      : S.document().views([S.view.form()]),
  })],
  schema: {types: schemaTypes},
})
