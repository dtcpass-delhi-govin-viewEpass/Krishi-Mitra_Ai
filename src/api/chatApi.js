// src/api/chatApi.js
// ─────────────────────────────────────────────────────────────
// Google Gemini 2.0 Flash — Agriculture-only KisanGPT
// Get your free key at: https://aistudio.google.com/apikey
// Then add to .env:  VITE_GEMINI_API_KEY=your_key_here
// ─────────────────────────────────────────────────────────────

// src/api/chatApi.js
// Calls Render backend → backend calls Gemini securely

const BACKEND = import.meta.env?.VITE_API_URL || 'http://localhost:4000';

export const sendKisanMessage = async (userMessage, history = []) => {
  // Build conversation history (skip first bot greeting)
  const formattedHistory = history.slice(1).map(m => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.text }],
  }));

  const res = await fetch(`${BACKEND}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: userMessage,
      history: formattedHistory,
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    if (res.status === 429) throw new Error('Rate limit reached. Please wait a moment and try again.');
    if (res.status === 400) throw new Error('Invalid request to Gemini API.');
    if (res.status === 403) throw new Error('Invalid or expired Gemini API key.');
    throw new Error(data?.error_description || `Error ${res.status}`);
  }

  if (!data.reply) throw new Error('Empty response from server.');
  return data.reply;
};