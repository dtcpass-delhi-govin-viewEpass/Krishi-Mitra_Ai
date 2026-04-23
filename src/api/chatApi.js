// src/api/chatApi.js
// Calls Render backend → backend calls Groq (llama-3.3-70b-versatile) securely

const BACKEND = import.meta.env?.VITE_API_URL || 'http://localhost:4000';

export const sendKisanMessage = async (userMessage, history = []) => {
  // Format history for backend — skip the first bot greeting message
  const formattedHistory = history.slice(1).map(m => ({
    role: m.role === 'user' ? 'user' : 'assistant',
    parts: [{ text: m.text }],
  }));

  let res;
  try {
    res = await fetch(`${BACKEND}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: userMessage,
        history: formattedHistory,
      }),
    });
  } catch (networkErr) {
    throw new Error('Network error — could not reach server. Please check your connection.');
  }

  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error('Server returned an invalid response. Please try again.');
  }

  if (!res.ok) {
    if (res.status === 429) {
      const wait = data?.retry_after_seconds;
      const waitMsg = wait ? ` Please wait ${wait} second${wait === 1 ? '' : 's'} and try again.` : '';
      throw new Error(`Rate limit reached.${waitMsg}`);
    }
    if (res.status === 400) throw new Error('Invalid request sent to server.');
    if (res.status === 500) throw new Error(data?.error_description || 'Server error. Please try again.');
    throw new Error(data?.error_description || `Error ${res.status}`);
  }

  if (!data.reply) throw new Error('Empty response from server.');
  return data.reply;
};