// ─────────────────────────────────────────────────────────────
// StadiumPulse — Vertex AI Gemini helpers
// Uses Google service-account credentials via Application Default Credentials.
// ─────────────────────────────────────────────────────────────

import { GoogleAuth } from 'google-auth-library';

import config from '../config.js';

const SCOPES = ['https://www.googleapis.com/auth/cloud-platform'];

function clampText(text, maxLength = 900) {
  if (typeof text !== 'string') return '';
  const normalized = text.replace(/```[\s\S]*?```/g, ' ').replace(/\s+/g, ' ').trim();
  return normalized.length > maxLength ? normalized.slice(0, maxLength).trim() : normalized;
}

function limitSentences(text, maxSentences = 3) {
  const trimmed = clampText(text);
  if (!trimmed) return '';
  const sentences = trimmed.match(/[^.!?]+[.!?]+/g) || [trimmed];
  return sentences.slice(0, maxSentences).join(' ').trim();
}

function buildSectionSummary(context) {
  return Object.entries(context.sections ?? {})
    .sort((a, b) => b[1].density - a[1].density)
    .slice(0, 3)
    .map(([id, section]) => `Section ${id} (${section.concession}, density ${Math.round(section.density * 100)}%, food ${section.waitFood}m, drinks ${section.waitDrinks}m, bathrooms ${section.waitBathroom}m)`)
    .join('\n');
}

function buildSystemPrompt(context) {
  return [
    `You are StadiumPulse AI, a real-time crowd guide at ${context.venueName}.`,
    `Today's event is ${context.eventName}.`,
    'Use only the stadium data provided below.',
    'Be concise: 1 to 3 sentences maximum.',
    'Always give a specific recommendation or route when possible.',
    'Do not invent queue times or crowd conditions.',
    `Current venue snapshot updated at ${new Date(context.updatedAt).toLocaleTimeString()}:`,
    `- Food stands average wait: ${context.avgWaitFood} min`,
    `- Drink stands average wait: ${context.avgWaitDrinks} min`,
    `- Bathrooms average wait: ${context.avgWaitBathroom} min`,
    `- Avg crowd density: ${Math.round(context.avgDensity * 100)}%`,
    `- Busiest sections: ${context.topSections.join(', ')}`,
    `- Quietest exits: ${context.quietExits.join(', ')}`,
    `Section-level details:\n${buildSectionSummary(context)}`,
  ].join('\n');
}

function buildContents(history, message) {
  const recent = history.slice(-8).map((entry) => ({
    role: entry.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: clampText(entry.content, 500) }],
  }));

  recent.push({
    role: 'user',
    parts: [{ text: clampText(message, 500) }],
  });

  return recent;
}

async function getProjectId(auth, fallbackProjectId) {
  if (fallbackProjectId) return fallbackProjectId;
  const projectId = await auth.getProjectId();
  if (!projectId) {
    throw new Error('Unable to resolve Google Cloud project ID');
  }
  return projectId;
}

async function getAccessToken(auth) {
  const client = await auth.getClient();
  const tokenResponse = await client.getAccessToken();
  const accessToken = typeof tokenResponse === 'string' ? tokenResponse : tokenResponse?.token;
  if (!accessToken) {
    throw new Error('Unable to obtain an access token for Vertex AI');
  }
  return accessToken;
}

export async function generateVertexGeminiReply({ model, location, projectId, message, history = [], context, timeoutMs }) {
  const auth = new GoogleAuth({ scopes: SCOPES });
  const resolvedProjectId = await getProjectId(auth, projectId);
  const accessToken = await getAccessToken(auth);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(
      `https://${location}-aiplatform.googleapis.com/v1/projects/${encodeURIComponent(resolvedProjectId)}/locations/${encodeURIComponent(location)}/publishers/google/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: buildSystemPrompt(context) }],
          },
          contents: buildContents(history, message),
          generationConfig: {
            temperature: 0.4,
            topP: 0.9,
            topK: 40,
            maxOutputTokens: 180,
          },
        }),
      }
    );

    if (!response.ok) {
      const details = await response.text().catch(() => '');
      throw new Error(`Vertex AI error ${response.status}: ${details.slice(0, 220)}`);
    }

    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.map((part) => part?.text ?? '').join(' ').trim();
    const text = limitSentences(rawText || '');
    if (!text) {
      throw new Error('Vertex AI returned an empty response');
    }

    return { ok: true, text };
  } finally {
    clearTimeout(timeoutId);
  }
}
