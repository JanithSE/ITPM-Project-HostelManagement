function getAiConfig() {
  return {
    provider: String(process.env.AI_PROVIDER || '').trim().toLowerCase(),
    apiKey: String(process.env.AI_API_KEY || '').trim(),
    model: String(process.env.AI_MODEL || '').trim() || 'gpt-4o-mini',
    timeoutMs: Number.parseInt(String(process.env.AI_TIMEOUT_MS || '8000'), 10) || 8000,
  }
}

function buildSystemPrompt() {
  return [
    'You are a booking assistant for a hostel management app.',
    'You only answer booking-related guidance, status explanation, required documents, and next steps.',
    'Do not claim to perform mutations.',
    'If asked to perform actions, instruct the user to use the app UI buttons.',
    'Keep response concise and practical.',
  ].join(' ')
}

async function callOpenAi({ apiKey, model, timeoutMs, messages }) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages,
      }),
      signal: controller.signal,
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`LLM provider error (${res.status}): ${text.slice(0, 200)}`)
    }
    const data = await res.json()
    return String(data?.choices?.[0]?.message?.content || '').trim()
  } finally {
    clearTimeout(timer)
  }
}

export async function requestLlmFallback({ message, context, recentHistory }) {
  const cfg = getAiConfig()
  if (!cfg.provider || !cfg.apiKey) return null
  if (cfg.provider !== 'openai') return null

  const historySnippet = Array.isArray(recentHistory)
    ? recentHistory
        .slice(-6)
        .map((m) => `${m.role}: ${m.content}`)
        .join('\n')
    : ''

  const contextSnippet = JSON.stringify(
    {
      latestBooking: context.latestBooking,
      hostelMeta: context.hostelMeta,
      roomMeta: context.roomMeta,
    },
    null,
    2,
  )

  const messages = [
    { role: 'system', content: buildSystemPrompt() },
    {
      role: 'user',
      content: `Context:\n${contextSnippet}\n\nRecent chat:\n${historySnippet}\n\nUser message: ${message}`,
    },
  ]
  const reply = await callOpenAi({
    apiKey: cfg.apiKey,
    model: cfg.model,
    timeoutMs: cfg.timeoutMs,
    messages,
  })
  return reply || null
}
