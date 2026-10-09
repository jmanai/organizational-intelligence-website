import {defineCliConfig} from 'sanity/cli'
import {projectId, dataset} from './config'

export default defineCliConfig({
  api: {projectId, dataset},
  studioHost: 'orgintelligence',
  deployment: {appId: 'pwe2gfsx6txn1ituw60czwa7', autoUpdates: false},
})
