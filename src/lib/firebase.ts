import { initializeApp } from 'firebase/app'
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  type User,
} from 'firebase/auth'
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import type { Watch, UserProfile, AlertRecord } from '@/types'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app, 'permits')

// ─── Auth helpers ────────────────────────────────────────────────────────────

export async function signUp(email: string, password: string): Promise<User> {
  const cred = await createUserWithEmailAndPassword(auth, email, password)
  // Create user profile in Firestore
  const trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  await setDoc(doc(db, 'users', cred.user.uid), {
    uid: cred.user.uid,
    email,
    plan: 'trial',
    trialEndsAt,
    createdAt: new Date().toISOString(),
  } satisfies UserProfile)
  return cred.user
}

export async function signIn(email: string, password: string): Promise<User> {
  const cred = await signInWithEmailAndPassword(auth, email, password)
  return cred.user
}

export async function signInWithGoogle(): Promise<User> {
  const provider = new GoogleAuthProvider()
  const cred = await signInWithPopup(auth, provider)

  // Create Firestore profile if this is their first Google sign-in
  const userRef = doc(db, 'users', cred.user.uid)
  const existing = await getDoc(userRef)
  if (!existing.exists()) {
    const trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    await setDoc(userRef, {
      uid: cred.user.uid,
      email: cred.user.email ?? '',
      displayName: cred.user.displayName ?? '',
      plan: 'trial',
      trialEndsAt,
      createdAt: new Date().toISOString(),
    } satisfies UserProfile)
  }

  return cred.user
}

export async function logOut(): Promise<void> {
  await signOut(auth)
}

export { onAuthStateChanged }

// ─── User profile ────────────────────────────────────────────────────────────

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, 'users', uid))
  return snap.exists() ? (snap.data() as UserProfile) : null
}

// ─── Watches ─────────────────────────────────────────────────────────────────

export async function getWatches(userId: string): Promise<Watch[]> {
  const q = query(
    collection(db, 'watches'),
    where('userId', '==', userId),
    where('active', '==', true),
    orderBy('createdAt', 'desc')
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Watch))
}

export async function addWatch(watch: Omit<Watch, 'id'>): Promise<string> {
  // Strip undefined fields — Firestore doesn't accept them
  const data = Object.fromEntries(
    Object.entries({ ...watch, createdAt: new Date().toISOString(), active: true })
      .filter(([, v]) => v !== undefined)
  )
  const ref = await addDoc(collection(db, 'watches'), data)
  return ref.id
}

export async function deleteWatch(watchId: string): Promise<void> {
  await updateDoc(doc(db, 'watches', watchId), { active: false })
}

// ─── Alerts ──────────────────────────────────────────────────────────────────

export async function getRecentAlerts(userId: string, count = 20): Promise<AlertRecord[]> {
  const q = query(
    collection(db, 'alerts'),
    where('userId', '==', userId),
    orderBy('sentAt', 'desc'),
    limit(count)
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as AlertRecord))
}

export async function markAlertSeen(alertId: string): Promise<void> {
  await updateDoc(doc(db, 'alerts', alertId), {
    seenAt: new Date().toISOString(),
  })
}

// Re-export Firestore utilities needed by functions
export {
  collection, doc, getDoc, getDocs, setDoc, addDoc,
  updateDoc, deleteDoc, query, where, orderBy, limit,
  serverTimestamp, Timestamp,
}
