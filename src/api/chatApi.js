// src/api/chatApi.js
// ─────────────────────────────────────────────────────────────
// Google Gemini 2.0 Flash — Agriculture-only KisanGPT
// Get your free key at: https://aistudio.google.com/apikey
// Then add to .env:  VITE_GEMINI_API_KEY=your_key_here
// ─────────────────────────────────────────────────────────────

const GEMINI_KEY = import.meta.env?.VITE_GEMINI_API_KEY || 'AIzaSyAGo76pxn7UANy6MJBT8dEehNwS8oHirdE';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`;

// ── Agriculture-only system prompt ───────────────────────────
const SYSTEM_PROMPT = `You are KisanGPT, an expert AI farming assistant built into कृषि Mitra — an AI farm manager app for Indian farmers.

YOUR ROLE:
You are a knowledgeable agricultural advisor who helps Indian farmers with practical, actionable advice.

STRICT RULES:
1. ONLY answer questions related to: crops, farming, soil health, fertilizers, pesticides, crop diseases, weather impact on farming, irrigation, seeds, harvesting, post-harvest, government agricultural schemes (PM-KISAN, eNAM, Soil Health Card, PMFBY insurance, Kisan Credit Card), mandi prices, organic farming, or any agriculture-related topic.
2. If asked ANYTHING unrelated (politics, movies, coding, general knowledge etc.), respond ONLY with: "Main sirf kheti-badi ke sawaalon ka jawab de sakta hoon. Koi fasal ya kisan se juda sawaal poochhein! 🌱"
3. LANGUAGE: Detect the language of the user's message and ALWAYS reply in that SAME language. If Hindi → reply in Hindi. If English → reply in English. If Marathi → reply in Marathi. If mixed → use the dominant language.
4. SPECIFICITY: Always give exact, actionable advice. Include specific chemical names with doses (e.g., "Mancozeb 75% WP @ 2g per litre of water"), timing, frequency. Never give vague answers.
5. INDIAN CONTEXT: Always refer to Indian varieties, Indian government schemes, Indian market context. Mention KVK (Krishi Vigyan Kendra), state agriculture departments, ICAR when relevant.
6. FORMAT: Use short paragraphs or bullet points. Keep responses clear and readable on mobile. Do not use markdown headers (##). Use emoji sparingly — only 🌱 🌾 💧 ⚠️ ✅ where genuinely helpful.
7. SAFETY: Never recommend anything that could harm the farmer, environment, or violate Indian law.

EXAMPLES of good answers:
- Disease: name the disease, cause, exact chemical treatment with dose, organic alternative, prevention
- Fertilizer: soil type + crop stage specific NPK doses in kg/hectare, split application schedule
- Scheme: eligibility criteria, how to apply, documents needed, helpline number
- Market: advise on timing, which mandi platform (eNAM), how to check prices`;

// ── Convert chat history to Gemini format ────────────────────
const buildHistory = (msgs) => {
  // skip first bot greeting, only include actual conversation
  const conversation = msgs.slice(1);
  return conversation.map(m => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.text }],
  }));
};

// ── Main export with retry logic ─────────────────────────────
export const sendKisanMessage = async (userMessage, history = [], retries = 3, delay = 1000) => {
  if (!GEMINI_KEY || GEMINI_KEY === 'AIzaSyAGo76pxn7UANy6MJBT8dEehNwS8oHirdE') {
    throw new Error('Gemini API key not set. Add VITE_GEMINI_API_KEY to your .env file.');
  }

  const body = {
    system_instruction: {
      parts: [{ text: SYSTEM_PROMPT }],
    },
    contents: [
      ...buildHistory(history),
      {
        role: 'user',
        parts: [{ text: userMessage }],
      },
    ],
    generationConfig: {
      temperature: 0.4,        // lower = more factual, less creative
      topP: 0.9,
      maxOutputTokens: 1024,
    },
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT',        threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH',       threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
    ],
  };

  let lastError = null;

  // Retry logic for rate limits
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(GEMINI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        
        // If rate limited, retry with exponential backoff
        if (res.status === 429 && attempt < retries - 1) {
          const waitTime = delay * Math.pow(2, attempt); // exponential backoff
          console.log(`Rate limited. Retrying in ${waitTime}ms...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }

        if (res.status === 400) throw new Error('Invalid request to Gemini API.');
        if (res.status === 403) throw new Error('Invalid or expired Gemini API key.');
        if (res.status === 429) throw new Error('Rate limit reached. Please wait a moment and try again.');
        throw new Error(err?.error?.message || `Gemini API error ${res.status}`);
      }

      const data = await res.json();

      // extract text from response
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error('Empty response from Gemini.');

      return text.trim();
    } catch (error) {
      lastError = error;
      // If not a rate limit error or last attempt, throw immediately
      if (error.message !== 'Rate limit reached. Please wait a moment and try again.' || attempt === retries - 1) {
        throw error;
      }
    }
  }

  throw lastError || new Error('Failed to get response after retries.');
};