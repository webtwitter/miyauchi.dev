import functions from 'firebase-functions'
import type { Post } from '@/types'
import type { Locale } from '@/../../config/types'
import type { Config } from '@/types'
import Twitter from 'twitter-api-v2'
import { ellipsisContent } from '@/twitter/util'

import { templateName } from '@/twitter/util'

type Params = {
  locale: Locale
  slug: string
}

export const onCreateMetaPost = functions
  .region('asia-northeast1')
  .runWith({
    memory: '128MB'
  })
  .firestore.document('meta/{slug}/locales/{locale}')
  .onCreate(async (snapshot, { params }) => {
    const { locale } = params as Params
    const { url, title, description } = snapshot.data() as Partial<Post>

    if (!url || !title || !description) {
      functions.logger.error('Something data is undefined')
      return
    }
    const template = templateName(locale)

    const content = await ellipsisContent(template, {
      url,
      title,
      description
    })

    if (!content) return
    const {
      app_key: appKey,
      app_secret: appSecret,
      access_token: accessToken,
      access_secret: accessSecret
    } = (functions.config() as Config).twitter
    const client = new Twitter({
      appKey,
      appSecret,
      accessToken,
      accessSecret
    })

    return client.v1.tweet(content).catch((e) => {
      functions.logger.error(e)
    })
  })
