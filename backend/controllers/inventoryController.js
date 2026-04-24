import InventoryItem from '../models/InventoryItem.js'
import IssuedItem from '../models/IssuedItem.js'

function parseQuantityMin10(raw) {
  // Accept numbers or numeric strings; reject decimals and values < 10.
  const n = typeof raw === 'number' ? raw : Number(raw)
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 10) return null
  return n
}

function parseCondition(raw, { required = false } = {}) {
  const allowed = new Set(['good', 'used', 'time_to_reallocate'])
  if (raw === undefined || raw === null || String(raw).trim() === '') {
    return required ? null : undefined
  }
  const v = String(raw).trim().toLowerCase()
  if (!allowed.has(v)) return null
  return v
}

/** Int 0–500; invalid or out of range → null */
function parseIssuePerBooking(raw) {
  if (raw === undefined || raw === null || String(raw).trim() === '') return undefined
  const n = typeof raw === 'number' ? raw : Number(raw)
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0 || n > 500) return null
  return n
}

/** Int 0–100000; invalid or out of range → null */
function parseReorderLevel(raw) {
  if (raw === undefined || raw === null || String(raw).trim() === '') return undefined
  const n = typeof raw === 'number' ? raw : Number(raw)
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0 || n > 100000) return null
  return n
}

async function getInventorySnapshot() {
  const items = await InventoryItem.find().sort({ name: 1 }).lean()
  const issuedAgg = await IssuedItem.aggregate([
    { $unwind: '$items' },
    { $match: { 'items.inventoryItem': { $ne: null } } },
    {
      $group: {
        _id: '$items.inventoryItem',
        issuedTotal: { $sum: '$items.quantity' },
      },
    },
  ])
  const issuedMap = new Map(issuedAgg.map((x) => [String(x._id), x.issuedTotal]))
  return items.map((row) => {
    const issuedTotal = issuedMap.get(String(row._id)) || 0
    const availableQuantity = Number(row.quantity) || 0
    const totalStock = availableQuantity + issuedTotal
    return {
      ...row,
      issuedTotal,
      availableQuantity,
      totalStock,
    }
  })
}

function getAiConfig() {
  return {
    provider: String(process.env.AI_PROVIDER || '').trim().toLowerCase(),
    apiKey: String(process.env.AI_API_KEY || process.env.GEMINI_API_KEY || '').trim(),
    model: String(process.env.AI_MODEL || '').trim(),
    timeoutMs: Number.parseInt(String(process.env.AI_TIMEOUT_MS || '8000'), 10) || 8000,
  }
}

async function callOpenAi({ apiKey, model, timeoutMs, systemPrompt, userPrompt }) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model || 'gpt-4o-mini',
        temperature: 0.2,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
      signal: controller.signal,
    })
    if (!res.ok) throw new Error(`OpenAI error (${res.status})`)
    const data = await res.json()
    return String(data?.choices?.[0]?.message?.content || '').trim()
  } finally {
    clearTimeout(timer)
  }
}

async function callGemini({ apiKey, model, timeoutMs, systemPrompt, userPrompt }) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const targetModel = model || 'gemini-1.5-flash'
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(targetModel)}:generateContent?key=${encodeURIComponent(apiKey)}`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }],
          },
        ],
        generationConfig: { temperature: 0.2 },
      }),
      signal: controller.signal,
    })
    if (!res.ok) throw new Error(`Gemini error (${res.status})`)
    const data = await res.json()
    const text = data?.candidates?.[0]?.content?.parts?.map((p) => p?.text || '').join('\n') || ''
    return String(text).trim()
  } finally {
    clearTimeout(timer)
  }
}

function createRulesReply(rawMessage, inventoryList) {
  const message = String(rawMessage || '').trim()
  const q = message.toLowerCase().replace(/\binventroy\b/g, 'inventory')
  const items = Array.isArray(inventoryList) ? inventoryList : []
  if (!message) return 'Please enter a question about inventory.'
  if (!items.length) return 'No inventory items are available right now.'

  const normalizeToken = (v) =>
    String(v || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\bbids\b/g, 'beds')
      .replace(/\bchairs\b/g, 'chair')
      .replace(/\bbeds\b/g, 'bed')

  const normalizedQuery = normalizeToken(q)
  const isGreeting =
    normalizedQuery === 'hi' ||
    normalizedQuery === 'hello' ||
    normalizedQuery === 'hey' ||
    normalizedQuery.includes('good morning') ||
    normalizedQuery.includes('good afternoon') ||
    normalizedQuery.includes('good evening')
  if (isGreeting) {
    return 'Good to see you! I can help with inventory item list, total stock, low-stock alerts, or quantity of a specific item.'
  }
  const normItems = items.map((it) => ({
    raw: it,
    name: String(it?.name || it?.category || 'Item'),
    nameNorm: normalizeToken(it?.name || ''),
    categoryNorm: normalizeToken(it?.category || ''),
    available: Number(it?.availableQuantity ?? it?.quantity) || 0,
    total: Number(it?.totalStock) || (Number(it?.availableQuantity ?? it?.quantity) || 0),
    issued: Number(it?.issuedTotal) || 0,
    reorderLevel: Number.isFinite(Number(it?.reorderLevel)) ? Math.max(0, Number(it?.reorderLevel)) : 15,
  }))

  const low = normItems.filter((it) => {
    const qty = Number(it.available)
    const reorderLevel = Number(it.reorderLevel)
    return Number.isFinite(qty) && qty <= reorderLevel
  })
  if (
    (normalizedQuery.includes('what') || normalizedQuery.includes('which') || normalizedQuery.includes('show') || normalizedQuery.includes('list')) &&
    normalizedQuery.includes('item') &&
    (normalizedQuery.includes('inventory') || normalizedQuery.includes('stock'))
  ) {
    return `Current inventory items: ${normItems.slice(0, 12).map((it) => it.name).join(', ')}${normItems.length > 12 ? `, and ${normItems.length - 12} more.` : '.'}`
  }
  const asksFullStockList =
    (normalizedQuery.includes('full stock') || normalizedQuery.includes('all stock') || normalizedQuery.includes('full inventory')) &&
    (normalizedQuery.includes('item') || normalizedQuery.includes('inventory') || normalizedQuery.includes('stock'))
  if (asksFullStockList) {
    const lines = normItems
      .slice(0, 20)
      .map((it) => `${it.name}: available ${it.available}, issued ${it.issued}, total ${it.total}`)
      .join('; ')
    return `Full stock snapshot: ${lines}${normItems.length > 20 ? `; and ${normItems.length - 20} more items.` : '.'}`
  }
  if (normalizedQuery.includes('low stock') || normalizedQuery.includes('restock') || normalizedQuery.includes('reorder')) {
    if (!low.length) return 'No items are currently at or below reorder level.'
    return `Low-stock items: ${low.slice(0, 8).map((it) => `${it.name} (${it.available})`).join(', ')}.`
  }
  if (normalizedQuery.includes('total stock') || normalizedQuery.includes('total item') || normalizedQuery.includes('how many')) {
    const totalUnits = normItems.reduce((sum, it) => sum + it.available, 0)
    return `You currently have ${items.length} item types and ${totalUnits} total available units.`
  }

  const asksSpecificItemQty =
    normalizedQuery.includes('quantity of') ||
    normalizedQuery.includes('stock of') ||
    normalizedQuery.includes('how many ') ||
    normalizedQuery.includes('total quantity of')

  if (asksSpecificItemQty) {
    const best = normItems.find((it) => {
      if (!it.nameNorm && !it.categoryNorm) return false
      return (
        (it.nameNorm && normalizedQuery.includes(it.nameNorm)) ||
        (it.categoryNorm && normalizedQuery.includes(it.categoryNorm)) ||
        it.nameNorm.split(' ').some((w) => w.length >= 3 && normalizedQuery.includes(w)) ||
        it.categoryNorm.split(' ').some((w) => w.length >= 3 && normalizedQuery.includes(w))
      )
    })
    if (best) {
      return `${best.name}: available ${best.available}, issued ${best.issued}, total stock ${best.total}.`
    }
  }

  const nameMatch = normItems.find(
    (it) =>
      (it.nameNorm && normalizedQuery.includes(it.nameNorm)) ||
      (it.categoryNorm && normalizedQuery.includes(it.categoryNorm)),
  )
  if (nameMatch) {
    return `${nameMatch.name}: available ${nameMatch.available}, issued ${nameMatch.issued}, total stock ${nameMatch.total}.`
  }

  return 'Ask me about inventory item list, total stock, low-stock items, or a specific item name.'
}

export const listInventory = async (req, res) => {
  try {
    const enriched = await getInventorySnapshot()
    res.json(enriched)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

export const chatInventoryAssistant = async (req, res) => {
  try {
    const message = String(req.body?.message || '').trim()
    if (!message) return res.status(400).json({ error: 'message is required' })

    const inventory = await getInventorySnapshot()
    const rulesReply = createRulesReply(message, inventory)

    const cfg = getAiConfig()
    if (!cfg.provider || !cfg.apiKey) {
      return res.json({ reply: rulesReply, source: 'rules' })
    }

    const systemPrompt =
      'You are an inventory assistant for hostel wardens. Answer only from provided inventory data. Keep it concise, practical, and factual. If not found, clearly say so.'
    const compactItems = inventory.slice(0, 120).map((it) => ({
      name: it.name,
      category: it.category,
      availableQuantity: Number(it.availableQuantity ?? it.quantity) || 0,
      reorderLevel: Number.isFinite(Number(it.reorderLevel)) ? Math.max(0, Number(it.reorderLevel)) : 15,
      issuedTotal: Number(it.issuedTotal) || 0,
      totalStock: Number(it.totalStock) || 0,
      condition: it.condition || 'good',
      location: it.location || '',
    }))
    const userPrompt = `Inventory JSON:\n${JSON.stringify(compactItems)}\n\nUser question: ${message}`

    let llmReply = ''
    if (cfg.provider === 'openai') {
      llmReply = await callOpenAi({
        apiKey: cfg.apiKey,
        model: cfg.model || 'gpt-4o-mini',
        timeoutMs: cfg.timeoutMs,
        systemPrompt,
        userPrompt,
      })
    } else if (cfg.provider === 'gemini' || cfg.provider === 'google') {
      llmReply = await callGemini({
        apiKey: cfg.apiKey,
        model: cfg.model || 'gemini-1.5-flash',
        timeoutMs: cfg.timeoutMs,
        systemPrompt,
        userPrompt,
      })
    }

    if (!llmReply) return res.json({ reply: rulesReply, source: 'rules' })
    return res.json({ reply: llmReply, source: 'llm' })
  } catch (err) {
    const fallback = createRulesReply(req.body?.message, await getInventorySnapshot().catch(() => []))
    return res.json({ reply: fallback, source: 'rules', warning: err?.message || 'AI unavailable' })
  }
}

export const createInventoryItem = async (req, res) => {
  try {
    const category = String(req.body?.category ?? '').trim()
    if (!category) return res.status(400).json({ error: 'category is required' })

    const qty = parseQuantityMin10(req.body?.quantity)
    if (qty === null) return res.status(400).json({ error: 'quantity must be an integer >= 10' })
    const condition = parseCondition(req.body?.condition, { required: false })
    if (condition === null) {
      return res.status(400).json({ error: 'condition must be one of: good, used, time_to_reallocate' })
    }

    const taken = await InventoryItem.findOne({ category })
    if (taken) return res.status(409).json({ error: 'An item with this category already exists' })
    const issuePerBooking = parseIssuePerBooking(req.body?.issuePerBooking)
    if (issuePerBooking === null) {
      return res.status(400).json({ error: 'issuePerBooking must be an integer from 0 to 500' })
    }
    const reorderLevel = parseReorderLevel(req.body?.reorderLevel)
    if (reorderLevel === null) {
      return res.status(400).json({ error: 'reorderLevel must be an integer from 0 to 100000' })
    }
    const payload = { ...req.body, quantity: qty, issuePerBooking: issuePerBooking ?? 0, reorderLevel: reorderLevel ?? 15 }
    if (condition !== undefined) payload.condition = condition
    const item = await InventoryItem.create(payload)
    res.status(201).json(item)
  } catch (err) {
    if (err?.code === 11000) return res.status(409).json({ error: 'An item with this category already exists' })
    res.status(500).json({ error: err.message })
  }
}

export const updateInventoryItem = async (req, res) => {
  try {
    if (req.body?.quantity !== undefined) {
      const qty = parseQuantityMin10(req.body?.quantity)
      if (qty === null) return res.status(400).json({ error: 'quantity must be an integer >= 10' })
      req.body.quantity = qty
    }
    if (req.body?.condition !== undefined) {
      const condition = parseCondition(req.body?.condition, { required: false })
      if (condition === null) {
        return res.status(400).json({ error: 'condition must be one of: good, used, time_to_reallocate' })
      }
      req.body.condition = condition
    }

    if (req.body?.category !== undefined) {
      const category = String(req.body.category ?? '').trim()
      if (!category) return res.status(400).json({ error: 'category cannot be empty' })
      const clash = await InventoryItem.findOne({ category, _id: { $ne: req.params.id } })
      if (clash) return res.status(409).json({ error: 'An item with this category already exists' })
    }
    if (req.body?.issuePerBooking !== undefined) {
      const issuePerBooking = parseIssuePerBooking(req.body.issuePerBooking)
      if (issuePerBooking === null) {
        return res.status(400).json({ error: 'issuePerBooking must be an integer from 0 to 500' })
      }
      req.body.issuePerBooking = issuePerBooking
    }
    if (req.body?.reorderLevel !== undefined) {
      const reorderLevel = parseReorderLevel(req.body.reorderLevel)
      if (reorderLevel === null) {
        return res.status(400).json({ error: 'reorderLevel must be an integer from 0 to 100000' })
      }
      req.body.reorderLevel = reorderLevel
    }
    const item = await InventoryItem.findByIdAndUpdate(req.params.id, req.body, { new: true })
    if (!item) return res.status(404).json({ error: 'Item not found' })
    res.json(item)
  } catch (err) {
    if (err?.code === 11000) return res.status(409).json({ error: 'An item with this category already exists' })
    res.status(500).json({ error: err.message })
  }
}

export const deleteInventoryItem = async (req, res) => {
  try {
    const item = await InventoryItem.findByIdAndDelete(req.params.id)
    if (!item) return res.status(404).json({ error: 'Item not found' })
    res.json({ message: 'Item deleted' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

