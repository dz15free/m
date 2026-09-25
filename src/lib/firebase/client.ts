"use client";

import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, getAuth, type Auth } from "firebase/auth";
import {
  connectFirestoreEmulator,
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from "firebase/firestore";

/* تهيئة Firebase في المتصفح فقط، وعند أول استعمال (لا عند تحميل الصفحة).
   قيم الإعداد عامّة بطبيعتها؛ الحماية في Security Rules. */
const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
};

export const isFirebaseConfigured = Boolean(config.apiKey && config.projectId && config.appId);

type FirebaseClients = { app: FirebaseApp; auth: Auth; db: Firestore };
let clients: FirebaseClients | null = null;

export function getFirebase(): FirebaseClients {
  if (clients) return clients;
  if (!isFirebaseConfigured) {
    throw new Error("Firebase is not configured: fill NEXT_PUBLIC_FIREBASE_* in .env.local");
  }

  const app = getApps().length ? getApp() : initializeApp(config);

  /* كاش دائم في IndexedDB: البيانات المقروءة تُخدم محليًا (قراءات أقل)،
     والكتابات دون إنترنت (الحضور، الدفتر) تُصفّ وتُزامن تلقائيًا. */
  let db: Firestore;
  try {
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    });
  } catch {
    // سبق تهيئتها (إعادة التحميل السريع أثناء التطوير)
    db = getFirestore(app);
  }

  const auth = getAuth(app);

  // التطوير والاختبار على المحاكيات المحلية بدل المشروع الحقيقي
  if (process.env.NEXT_PUBLIC_FIREBASE_EMULATORS === "true") {
    connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    connectFirestoreEmulator(db, "127.0.0.1", 8080);
  }

  clients = { app, auth, db };
  return clients;
}
