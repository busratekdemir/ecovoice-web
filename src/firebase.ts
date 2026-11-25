import { initializeApp } from 'firebase/app'
import { initializeAuth, browserLocalPersistence } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: 'AIzaSyBAzauabAccbZb-4DvGsrJVs838syJoRjo',
  authDomain: 'ecovoice-da355.firebaseapp.com',
  projectId: 'ecovoice-da355',
  storageBucket: 'ecovoice-da355.firebasestorage.app',
  messagingSenderId: '815335464907',
  appId: '1:815335464907:web:adc7abbf570e751729604e',
}

const app = initializeApp(firebaseConfig)

export const auth = initializeAuth(app, { persistence: browserLocalPersistence })
export const db = getFirestore(app)
export const storage = getStorage(app)
