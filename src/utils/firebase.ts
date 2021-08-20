import { initializeApp } from 'firebase/app'
import { initializePerformance } from 'firebase/performance'
import { initializeAnalytics, isSupported } from 'firebase/analytics'
import {
  initializeFirestore,
  connectFirestoreEmulator,
  Firestore
} from 'firebase/firestore/lite'
import {
  initializeAuth,
  browserLocalPersistence,
  connectAuthEmulator
} from 'firebase/auth'
import { getMessaging, onMessage, Messaging } from 'firebase/messaging'
import { firebaseOptions } from '@/../config/constants'

import type { FirebaseState } from '@/types/firebase'
import { isProd } from '@/utils/environment'

const initializeFirebase = (): FirebaseState => {
  const app = initializeApp(firebaseOptions)
  const firestore = initializeFirestore(app, {})
  const auth = initializeAuth(app, {
    persistence: browserLocalPersistence
  })
  const messaging = getMessaging(app)

  onMessage(messaging, (payload) => {
    console.log(payload)
  })

  if (!isProd) {
    connectFirestoreEmulator(firestore, 'localhost', 8081)
    connectAuthEmulator(auth, 'http://localhost:9099')
  }

  if (isProd) {
    initializePerformance(app)

    isSupported().then((e) => {
      if (e) {
        console.info('Initialize: analytics')
        initializeAnalytics(app)
      }
    })
  }

  return {
    app,
    firestore,
    auth,
    messaging
  }
}

const requestFcmToken = async (
  messaging: Messaging,
  sw: ServiceWorkerRegistration
): Promise<string | void> => {
  const { getToken } = await import('firebase/messaging')

  return getToken(messaging, {
    serviceWorkerRegistration: sw
  }).catch(console.error)
}

const getServiceWorker = async (
  clientURL: Parameters<typeof navigator.serviceWorker.getRegistration>[number]
): Promise<ServiceWorkerRegistration | void> => {
  return window.navigator.serviceWorker
    .getRegistration(clientURL)
    .then((_sw) => {
      if (_sw) {
        return _sw
      }

      console.error(`Service worker[${clientURL}] is not exists$`)
    })
    .catch(() => {
      console.error(`Service worker[${clientURL}] is not exists$`)
    })
}

type FCMData = {
  token: string
  topics: ('article' | 'en' | 'ja')[]
}

const postFCMToken = async (
  firestore: Firestore,
  { token, topics }: FCMData
): Promise<boolean> => {
  const { doc, setDoc, arrayUnion, serverTimestamp } = await import(
    'firebase/firestore/lite'
  )

  const _doc = doc(firestore, 'fcm', token)
  return setDoc(_doc, {
    token,
    topics: arrayUnion(...topics),
    createdAt: serverTimestamp()
  })
    .then(() => true)
    .catch((e) => {
      console.error(e)
      return false
    })
}

export { initializeFirebase, requestFcmToken, postFCMToken, getServiceWorker }