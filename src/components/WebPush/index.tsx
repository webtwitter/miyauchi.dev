import WebPush from '@/components/WebPush/WebPush'
import { useFirebase } from '@/hooks/firebase'
import { useNotice } from '@/hooks/notice'
import { useUnsubscribe } from '@/components/WebPush/hooks'
import { useAuth } from '@/hooks/auth'
import { useLocalization } from 'gatsby-theme-i18n'
import { useSafeLogEvent } from '@/hooks/analytics'

import type { FC } from 'react'
import type { Locale } from 'config/types'

const Index: FC = () => {
  const [{ messaging, firestore }] = useFirebase()
  const [_, notice] = useNotice()
  const [{ uid, isLoggedIn }] = useAuth()
  const [hasSubscribed, changeHasSubscribed] = useUnsubscribe()
  const { locale } = useLocalization()
  const { safeLogEvent } = useSafeLogEvent()

  const handleSubscribe = async (locale: Locale): Promise<void> => {
    if (!messaging || !firestore) {
      return
    }
    const { requestFcmToken, getServiceWorker, postFCMToken } = await import(
      '@/utils/firebase'
    )
    const sw = await getServiceWorker('/sw.js')

    if (!sw) {
      return
    }

    const token = await requestFcmToken(messaging, sw)
    if (!token) {
      notice({
        type: 'alert',
        field: (
          <div>
            The notification permission was not granted. Please check browser
            settings
          </div>
        )
      })
      return
    }

    const result = await postFCMToken(
      firestore,
      {
        token,
        topics: ['article', locale]
      },
      uid!
    )
    await changeHasSubscribed()

    if (result) {
      notice({
        type: 'success',
        field: <div>Success subscription Web Push</div>
      })
    } else {
      notice({
        type: 'alert',
        field: <span>Already subscribed</span>
      })
    }
  }

  const handleUnsubscribe = async () => {
    const { collection, getDocs, deleteDoc } = await import(
      'firebase/firestore/lite'
    )
    const { deleteToken } = await import('firebase/messaging')
    const col = collection(firestore!, 'users', uid!, 'fcm')
    const { docs } = await getDocs(col)

    await Promise.all(
      Array.from(docs).map(async (doc) => {
        await deleteDoc(doc.ref)
      })
    )
    await deleteToken(messaging!)
    notice({
      type: 'success',
      field: <div>Unsubscribed push message</div>
    })
    changeHasSubscribed()
  }

  const handleError = ({ name, message }: Error) => {
    notice({
      type: 'alert',
      field: <div>Something went wrong. This error has reported.</div>
    })

    safeLogEvent((analytics, logEvent) => {
      logEvent(analytics, 'exception', {
        description: message,
        name
      })
    })
  }

  return (
    <WebPush
      isLoggedIn={isLoggedIn}
      locale={locale as Locale}
      hasSubscribed={hasSubscribed}
      onSubscribe={handleSubscribe}
      onUnsubscribe={handleUnsubscribe}
      onSuccess={() => {}}
      onError={handleError}
    />
  )
}

export default Index
