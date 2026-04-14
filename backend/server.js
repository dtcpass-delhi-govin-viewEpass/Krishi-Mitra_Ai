// server.js (FINAL WORKING VERSION)

import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
const PORT = process.env.PORT || 4000;

// Config — use env vars on Render, fallback for local dev
const AUTH0_DOMAIN    = process.env.AUTH0_DOMAIN    || "dev-zl6sofbd5sbrdbde.us.auth0.com";
const AUTH0_CLIENT_ID = process.env.AUTH0_CLIENT_ID || "yXHFS5b5pvSMFfeu76iCUJCW7kM5ffwH";
const GEMINI_API_KEY  = process.env.GEMINI_API_KEY;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ── Middleware ────────────────────────────────────
app.use(express.json());
app.use(cors({
  origin: true,
  credentials: true,
}));

// ── Health check ──────────────────────────────────
app.get('/health', (_req, res) => res.json({ ok: true }));

// ── SEND OTP ──────────────────────────────────────
app.post('/auth/send-otp', async (req, res) => {
  const { email } = req.body;

  if (!email || !/\S+@\S+\.\S+/.test(email)) {
    return res.status(400).json({
      error: 'invalid_email',
      error_description: 'A valid email is required.'
    });
  }

  try {
    console.log("📩 Sending OTP to:", email);

    const auth0Res = await fetch(
      `https://${AUTH0_DOMAIN}/passwordless/start`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: AUTH0_CLIENT_ID,
          connection: 'email',
          email: email,
          send: 'code',
        }),
      }
    );

    const data = await auth0Res.json();
    console.log("🔍 Auth0 response:", data);

    if (!auth0Res.ok) {
      console.error('[send-otp] Auth0 error:', data);
      return res.status(auth0Res.status).json(data);
    }

    return res.json({ ok: true, message: 'OTP sent successfully' });

  } catch (err) {
    console.error('[send-otp] Unexpected error:', err);
    return res.status(500).json({
      error: 'server_error',
      error_description: 'Failed to send OTP'
    });
  }
});

// ── VERIFY OTP ────────────────────────────────────
app.post('/auth/verify-otp', async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp || otp.length !== 6) {
    return res.status(400).json({
      error: 'invalid_input',
      error_description: 'Email and 6-digit OTP required'
    });
  }

  try {
    console.log("🔐 Verifying OTP:", otp);

    const auth0Res = await fetch(
      `https://${AUTH0_DOMAIN}/oauth/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'http://auth0.com/oauth/grant-type/passwordless/otp',
          client_id: AUTH0_CLIENT_ID,
          username: email,
          otp: otp,
          realm: 'email',
          scope: 'openid profile email',
        }),
      }
    );

    const data = await auth0Res.json();
    console.log("🔍 Verify response:", data);

    if (!auth0Res.ok) {
      console.error('[verify-otp] Auth0 error:', data);
      return res.status(auth0Res.status).json(data);
    }

    const [, payloadB64] = data.id_token.split('.');
    const profile = JSON.parse(
      Buffer.from(payloadB64, 'base64url').toString('utf8')
    );

    return res.json({
      ok: true,
      user: {
        name: profile.name || profile.email,
        email: profile.email,
        sub: profile.sub,
      }
    });

  } catch (err) {
    console.error('[verify-otp] Unexpected error:', err);
    return res.status(500).json({
      error: 'server_error',
      error_description: 'OTP verification failed'
    });
  }
});

// ── GEMINI CHAT ───────────────────────────────────
app.post('/chat', async (req, res) => {
  const { message, history = [] } = req.body;

  if (!message) {
    return res.status(400).json({
      error: 'invalid_input',
      error_description: 'Message is required.'
    });
  }

  if (!GEMINI_API_KEY) {
    console.error('[chat] GEMINI_API_KEY not set on server.');
    return res.status(500).json({
      error: 'config_error',
      error_description: 'Gemini API key not configured on server.'
    });
  }

  const contents = [
    {
      role: 'user',
      parts: [{ text: `You are KisanGPT, an expert AI assistant for Indian farmers. 
        Answer questions about crops, diseases, weather, mandi prices, farming techniques, 
        government schemes, and agriculture in simple Hindi or English, If asked ANYTHING unrelated (politics, movies, coding, general knowledge etc.), respond ONLY with: "Main sirf kheti-badi ke sawaalon ka jawab de sakta hoon. Koi fasal ya kisan se juda sawaal poochhein! 🌱
        LANGUAGE: Detect the language of the user's message and ALWAYS reply in that SAME language. If Hindi → reply in Hindi. If English → reply in English. If Marathi → reply in Marathi. If mixed → use the dominant language.
        Be concise, practical and helpful.` }]
    },
    { role: 'model', parts: [{ text: 'Namaste! Main KisanGPT hoon. Aapki khet aur fasal se related koi bhi sawaal poochh sakte hain!' }] },
    ...history,
    { role: 'user', parts: [{ text: message }] }
  ];

  try {
    const maxRetries = 1;
    let attempt = 0;
    let geminiRes;

    do {
      geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents }),
        }
      );

      if (geminiRes.status === 429 && attempt < maxRetries) {
        const retryHeader = geminiRes.headers.get('retry-after') || geminiRes.headers.get('Retry-After');
        const retryAfterSeconds = Number(retryHeader) || 1;
        console.warn(`[chat] Gemini rate limited. retryAfter=${retryAfterSeconds}s attempt=${attempt + 1}`);
        await sleep(retryAfterSeconds * 1000);
      } else {
        break;
      }

      attempt += 1;
    } while (attempt <= maxRetries);

    if (geminiRes.status === 429) {
      const retryHeader = geminiRes.headers.get('retry-after') || geminiRes.headers.get('Retry-After');
      const retryAfterSeconds = Number(retryHeader) || 1;
      return res.status(429).json({
        error: 'rate_limited',
        error_description: 'Too many requests. Please wait a moment and try again.',
        retry_after_seconds: retryAfterSeconds,
      });
    }

    if (!geminiRes.ok) {
      const errData = await geminiRes.json();
      console.error('[chat] Gemini error:', errData);
      return res.status(geminiRes.status).json({
        error: 'gemini_error',
        error_description: errData?.error?.message || 'Gemini request failed.'
      });
    }

    const data = await geminiRes.json();
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, no response generated.';

    return res.json({ ok: true, reply });

  } catch (err) {
    console.error('[chat] Unexpected error:', err);
    return res.status(500).json({
      error: 'server_error',
      error_description: 'Chat request failed.'
    });
  }
});

// ── START SERVER ──────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});