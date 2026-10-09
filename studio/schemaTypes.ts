import {defineArrayMember, defineField, defineType} from 'sanity'

const slug = defineField({
  name: 'slug', type: 'slug', title: 'URL slug',
  description: 'Use Generate. After publishing, keep this unchanged so existing links continue to work.',
  options: {source: 'title', maxLength: 96},
  validation: Rule => Rule.required().custom(value =>
    !value?.current || /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.current)
      ? true : 'Use lowercase letters, numbers, and single hyphens.'),
})

const imageFields = [
  defineField({name: 'alt', type: 'string', title: 'Image description',
    description: 'Describe the image for readers using a screen reader.',
    validation: Rule => Rule.required().max(250)}),
  defineField({name: 'caption', type: 'string', title: 'Caption / credit'}),
]

const editorialImage = defineType({
  name: 'editorialImage', type: 'image', title: 'Image',
  options: {hotspot: true}, fields: imageFields,
})

const articleBody = defineType({
  name: 'articleBody', type: 'array', title: 'Article body',
  of: [
    defineArrayMember({
      type: 'block',
      styles: [
        {title: 'Paragraph', value: 'normal'},
        {title: 'Heading', value: 'h2'},
        {title: 'Subheading', value: 'h3'},
        {title: 'Quote', value: 'blockquote'},
      ],
      lists: [{title: 'Bullet list', value: 'bullet'}, {title: 'Numbered list', value: 'number'}],
      marks: {
        decorators: [{title: 'Bold', value: 'strong'}, {title: 'Italic', value: 'em'}],
        annotations: [{
          name: 'link', type: 'object', title: 'Link',
          fields: [defineField({name: 'href', type: 'url', title: 'Destination',
            validation: Rule => Rule.required().uri({scheme: ['https', 'http', 'mailto'], allowRelative: true})})],
        }],
      },
    }),
    defineArrayMember({type: 'editorialImage'}),
  ],
})

const author = defineType({
  name: 'author', type: 'document', title: 'Author',
  fields: [
    defineField({name: 'name', type: 'string', title: 'Name', validation: Rule => Rule.required()}),
    defineField({name: 'role', type: 'string', title: 'Role'}),
    defineField({name: 'bio', type: 'text', title: 'Short biography', rows: 4, validation: Rule => Rule.max(600)}),
    defineField({name: 'photo', type: 'editorialImage', title: 'Portrait'}),
  ],
  preview: {select: {title: 'name', subtitle: 'role', media: 'photo'}},
})

const topic = defineType({
  name: 'topic', type: 'document', title: 'Topic',
  fields: [
    defineField({name: 'title', type: 'string', title: 'Name', validation: Rule => Rule.required().max(60)}),
    slug,
    defineField({name: 'description', type: 'text', title: 'Description', rows: 3, validation: Rule => Rule.max(240)}),
  ],
})

const article = defineType({
  name: 'article', type: 'document', title: 'Article',
  groups: [
    {name: 'content', title: 'Writing', default: true},
    {name: 'details', title: 'Details'},
    {name: 'seo', title: 'Search & sharing'},
  ],
  fields: [
    defineField({name: 'title', type: 'string', title: 'Title', group: 'content', validation: Rule => Rule.required().max(140)}),
    {...slug, group: 'details'},
    defineField({name: 'excerpt', type: 'text', title: 'Short summary', group: 'content', rows: 3,
      description: 'Shown on the Ideas page and below the article title.', validation: Rule => Rule.required().max(240)}),
    defineField({name: 'heroImage', type: 'editorialImage', title: 'Cover image', group: 'content'}),
    defineField({name: 'body', type: 'articleBody', title: 'Article', group: 'content', validation: Rule => Rule.required().min(1)}),
    defineField({name: 'author', type: 'reference', to: [{type: 'author'}], title: 'Author', group: 'details',
      validation: Rule => Rule.required()}),
    defineField({name: 'topics', type: 'array', title: 'Topics', group: 'details',
      of: [defineArrayMember({type: 'reference', to: [{type: 'topic'}]})], validation: Rule => Rule.required().min(1).max(3).unique()}),
    defineField({name: 'publishedAt', type: 'datetime', title: 'Publication date', group: 'details',
      description: 'The date readers will see. On the free plan, publish manually; this field does not schedule publication.',
      validation: Rule => Rule.required().custom(value => !value || (Number.isFinite(Date.parse(value)) && Date.parse(value) <= Date.now())
        ? true : 'Choose today or an earlier date. Scheduled publishing requires a different workflow/plan.')}),
    defineField({name: 'featured', type: 'boolean', title: 'Feature on the Ideas page', group: 'details', initialValue: false}),
    defineField({name: 'relatedArticles', type: 'array', title: 'Related articles', group: 'details',
      of: [defineArrayMember({type: 'reference', to: [{type: 'article'}]})], validation: Rule => Rule.max(3).unique()}),
    defineField({name: 'resource', type: 'file', title: 'Optional downloadable PDF', group: 'details',
      options: {accept: 'application/pdf'}, fields: [
        defineField({name: 'label', type: 'string', title: 'Download link text', validation: Rule => Rule.required()}),
      ]}),
    defineField({name: 'seoTitle', type: 'string', title: 'Search title', group: 'seo',
      description: 'Optional. Uses the article title when empty.', validation: Rule => Rule.max(70).warning()}),
    defineField({name: 'seoDescription', type: 'text', title: 'Search description', group: 'seo', rows: 3,
      description: 'Optional. Uses the short summary when empty.', validation: Rule => Rule.max(160).warning()}),
    defineField({name: 'socialImage', type: 'editorialImage', title: 'Social sharing image', group: 'seo',
      description: 'Optional. Uses the cover image when empty. Recommended: 1200 × 630 pixels.'}),
  ],
  initialValue: () => ({publishedAt: new Date().toISOString(), featured: false}),
  orderings: [{title: 'Newest first', name: 'publishedAtDesc', by: [{field: 'publishedAt', direction: 'desc'}]}],
  preview: {select: {title: 'title', subtitle: 'author.name', media: 'heroImage'}},
})

export const schemaTypes = [article, author, topic, articleBody, editorialImage]
