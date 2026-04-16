// ─────────────────────────────────────────────────────────────
// StadiumPulse — Firebase Admin helpers
// Stores SOS alerts and chat transcripts in Firestore.
// Uses Application Default Credentials via GOOGLE_APPLICATION_CREDENTIALS.
// ─────────────────────────────────────────────────────────────

import admin from 'firebase-admin';

import config from '../config.js';
import { createLogger } from '../lib/logger.js';

const log = createLogger('firebase');
let firestore = null;

function hasCredentials() {
  return Boolean(process.env.GOOGLE_APPLICATION_CREDENTIALS || config.firebase.projectId || process.env.FIREBASE_APPLICATION_CREDENTIALS);
}

function ensureApp() {
  if (firestore) return firestore;
  if (!hasCredentials()) return null;

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: config.firebase.projectId || undefined,
    });
  }

  firestore = admin.firestore();
  return firestore;
}

function cleanSessionId(sessionId) {
  return String(sessionId || 'anonymous').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80);
}

export function isFirebaseEnabled() {
  return Boolean(ensureApp());
}

export async function saveSosAlertToFirebase(alert) {
  const db = ensureApp();
  if (!db) return null;

  try {
    const docRef = await db.collection('sosAlerts').add({
      ...alert,
      createdAt: Date.now(),
    });
    return { id: docRef.id, ...alert };
  } catch (error) {
    log.warn('failed to save SOS alert to Firestore', { error: error.message });
    return null;
  }
}

export async function saveChatMessageToFirebase(sessionId, message) {
  const db = ensureApp();
  if (!db) return null;

  try {
    const cleanId = cleanSessionId(sessionId);
    const collectionRef = db.collection('chatSessions').doc(cleanId).collection('messages');
    const docRef = await collectionRef.add({
      ...message,
      createdAt: Date.now(),
    });
    return { id: docRef.id, ...message };
  } catch (error) {
    log.warn('failed to save chat message to Firestore', { error: error.message });
    return null;
  }
}

export async function saveChatTranscriptToFirebase(sessionId, history) {
  const db = ensureApp();
  if (!db) return null;

  try {
    const cleanId = cleanSessionId(sessionId);
    const batch = db.batch();
    const sessionRef = db.collection('chatSessions').doc(cleanId);
    batch.set(sessionRef, { sessionId: cleanId, updatedAt: Date.now() }, { merge: true });
    for (const message of history.slice(-10)) {
      const messageRef = sessionRef.collection('messages').doc();
      batch.set(messageRef, {
        ...message,
        createdAt: message.timestamp || Date.now(),
      });
    }
    await batch.commit();
    return { sessionId: cleanId };
  } catch (error) {
    log.warn('failed to save chat transcript to Firestore', { error: error.message });
    return null;
  }
}
