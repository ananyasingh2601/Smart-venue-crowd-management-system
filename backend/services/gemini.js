// ─────────────────────────────────────────────────────────────
// StadiumPulse — Gemini Integration
// Prefers Vertex AI with service-account auth and falls back
// to the public Gemini API only if an API key is configured.
// ─────────────────────────────────────────────────────────────

import config from '../config.js';
import { generateVertexGeminiReply } from './vertex.js';

function clampText(text, maxLength = 900) {
  if (typeof text !== 'string') return '';
  const normalized = text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return normalized.length > maxLength ? normalized.slice(0, maxLength).trim() : normalized;
}

function limitSentences(text, maxSentences = 3) {
  const trimmed = clampText(text);
  if (!trimmed) return '';
  const sentences = trimmed.match(/[^.!?]+[.!?]+/g) || [trimmed];
  return sentences.slice(0, maxSentences).join(' ').trim();
}

function formatSectionSummary(context) {
  const sectionEntries = Object.entries(context.sections ?? {});
  const topSections = sectionEntries
    .sort((a, b) => b[1].density - a[1].density)
    .slice(0, 3)
    .map(([id, section]) => {
      return `Section ${id} (${section.concession}, density ${Math.round(section.density * 100)}%, food ${section.waitFood}m, drinks ${section.waitDrinks}m, bathrooms ${section.waitBathroom}m)`;
    });

  return topSections.join('\n');
}

function buildSystemPrompt(context) {
  return [
    `You are StadiumPulse AI, a real-time crowd guide at ${context.venueName}.`,
    `Today's event is ${context.eventName}.`,
    'Use the stadium data below to answer like a venue concierge.',
    'Be concise: 1 to 3 sentences maximum, with at least one specific recommendation when possible.',
    'Do not claim data you were not given. Stay inside stadium operations context only.',
    `Current venue snapshot updated at ${new Date(context.updatedAt).toLocaleTimeString()}:`,
    `- Food stands average wait: ${context.avgWaitFood} min`,
    `- Drink stands average wait: ${context.avgWaitDrinks} min`,
    `- Bathrooms average wait: ${context.avgWaitBathroom} min`,
    `- Avg crowd density: ${Math.round(context.avgDensity * 100)}%`,
    `- Busiest sections: ${context.topSections.join(', ')}`,
    `- Quietest exits: ${context.quietExits.join(', ')}`,
    `Section-level details:\n${formatSectionSummary(context)}`,
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

export async function generateGeminiReply({ apiKey, model, timeoutMs, message, history = [], context }) {
  if (config.google.vertexProjectId || process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    try {
      return await generateVertexGeminiReply({
        model,
        location: config.google.vertexLocation,
        projectId: config.google.vertexProjectId,
        timeoutMs,
        message,
        history,
        context,
      });
    } catch (error) {
      return { ok: false, reason: 'vertex_failed', error: error.message, text: null };
    }
  }

  if (!apiKey) {
    return { ok: false, reason: 'missing_api_key', text: null };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
    });

    if (!response.ok) {
      const details = await response.text().catch(() => '');
      throw new Error(`Gemini API error ${response.status}: ${details.slice(0, 180)}`);
    }

    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts
      ?.map((part) => part?.text ?? '')
      .join(' ')
      .trim();

    const text = limitSentences(rawText || '');
    if (!text) {
      throw new Error('Gemini returned an empty response');
    }

    return { ok: true, text };
  } finally {
    clearTimeout(timeoutId);
  }
}

export function buildFallbackChatReply(message, agg, state) {
  const lowerMsg = message.toLowerCase();
  let responseText;

  if (lowerMsg.includes('food') || lowerMsg.includes('eat') || lowerMsg.includes('hungry')) {
    const best = Object.entries(state.sections)
      .sort((a, b) => a[1].waitFood - b[1].waitFood)[0];
    responseText = `The shortest food line right now is at "${best[1].concession}" near Section ${best[0]} and is about ${best[1].waitFood} minutes. I recommend heading there before ${agg.topSections[0]} gets busier.`;
  } else if (lowerMsg.includes('bathroom') || lowerMsg.includes('restroom') || lowerMsg.includes('toilet')) {
    const best = Object.entries(state.sections)
      .sort((a, b) => a[1].waitBathroom - b[1].waitBathroom)[0];
    responseText = `Section ${best[0]} currently has the shortest restroom queue at about ${best[1].waitBathroom} minutes. It is quieter than ${agg.topSections[0]} right now.`;
  } else if (lowerMsg.includes('drink') || lowerMsg.includes('beer') || lowerMsg.includes('bar')) {
    const best = Object.entries(state.sections)
      .sort((a, b) => a[1].waitDrinks - b[1].waitDrinks)[0];
    responseText = `For drinks, go to ${best[1].concession} near Section ${best[0]} with around ${best[1].waitDrinks} minutes wait. It is one of the faster options at the moment.`;
  } else if (lowerMsg.includes('exit') || lowerMsg.includes('leave') || lowerMsg.includes('gate')) {
    responseText = `The quietest exits right now are ${agg.quietExits.join(' and ')}. Use those gates to avoid congestion around ${agg.topSections[0]}.`;
  } else if (lowerMsg.includes('busy') || lowerMsg.includes('crowd') || lowerMsg.includes('density')) {
    responseText = `The busiest sections right now are ${agg.topSections.join(', ')} with average density around ${Math.round(agg.avgDensity * 100)} percent. For more space, move toward ${agg.quietExits[0]}.`;
  } else {
    responseText = `Right now food lines average ${agg.avgWaitFood} minutes and bathrooms average ${agg.avgWaitBathroom} minutes. The busiest sections are ${agg.topSections.join(', ')}. Ask about food, drinks, bathrooms, or exits for a precise recommendation.`;
  }

  return limitSentences(responseText, 3);
}
