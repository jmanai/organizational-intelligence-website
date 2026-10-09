import config from '../content/sanity-config.mjs'

export const projectId = process.env.SANITY_STUDIO_PROJECT_ID || config.projectId
export const dataset = process.env.SANITY_STUDIO_DATASET || config.dataset
export const apiVersion = config.apiVersion

if (!projectId) {
  throw new Error('Connect the OI Sanity project first: set projectId in content/sanity-config.mjs. See SANITY.md.')
}
