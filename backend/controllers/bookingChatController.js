import mongoose from 'mongoose'
import ChatConversation from '../models/ChatConversation.js'
import ChatMessage from '../models/ChatMessage.js'
import {
  buildBookingContext,
  enforceMessagePolicy,
  redactSensitiveContent,
  resolveRulesResponse,
  tryResolveRoommatePreference,
} from '../services/bookingChatService.js'
import { requestLlmFallback } from '../services/llmProvider.js'

const RATE_WINDOW_MS = Number.parseInt(String(process.env.AI_RATE_WINDOW_MS || '60000'), 10) || 60000
const RATE_MAX_REQUESTS = Number.parseInt(String(process.env.AI_RATE_MAX_REQUESTS || '10'), 10) || 10
const DAILY_LIMIT_MESSAGES = Number.parseInt(String(process.env.AI_DAILY_CHAT_LIMIT || '80'), 10) || 80
const CONFIDENCE_THRESHOLD = Number.parseFloat(String(process.env.AI_RULES_CONFIDENCE || '0.85')) || 0.85
const inMemoryRateWindow = new Map()

function applyRateLimit(userId) {
  const now = Date.now()
  const key = String(userId)
  const hits = (inMemoryRateWindow.get(key) || []).filter((t) => now - t < RATE_WINDOW_MS)
  if (hits.length >= RATE_MAX_REQUESTS) return false
  hits.push(now)
  inMemoryRateWindow.set(key, hits)
  return true
}

async function withinDailyQuota(userId) {
  const dayStart = new Date()
  dayStart.setHours(0, 0, 0, 0)
  const count = await ChatMessage.countDocuments({
    user: userId,
    role: 'user',
    createdAt: { $gte: dayStart },
  })
  return count < DAILY_LIMIT_MESSAGES
}

async function getOrCreateConversation(userId, conversationId) {
  if (conversationId && mongoose.isValidObjectId(conversationId)) {
    const existing = await ChatConversation.findOne({ _id: conversationId, user: userId, topic: 'booking' })
    if (existing) return existing
  }
  return ChatConversation.create({ user: userId, topic: 'booking', lastActivity: new Date() })
}

async function saveMessage({ conversationId, userId, role, content, source, intent, confidence, metadata }) {
  if (!String(content || '').trim()) return null
  return ChatMessage.create({
    conversation: conversationId,
    user: userId,
    role,
    content: String(content).slice(0, 4000),
    source,
    intent: intent || 'unknown',
    confidence: Number.isFinite(confidence) ? confidence : 0,
    metadata: metadata || {},
  })
}

export async function postBookingChatMessage(req, res) {
  try {
    if (req.user.role !== 'student') return res.status(403).json({ error: 'Forbidden' })

    const policy = enforceMessagePolicy(req.body?.message)
    if (!policy.ok) return res.status(400).json({ error: policy.error })
    if (!applyRateLimit(req.user._id)) {
      return res.status(429).json({ error: 'Too many requests. Please wait a minute and try again.' })
    }
    if (!(await withinDailyQuota(req.user._id))) {
      return res.status(429).json({ error: 'Daily chat quota reached. Please try again tomorrow.' })
    }

    const conversation = await getOrCreateConversation(req.user._id, req.body?.conversationId)
    const userMessageRaw = String(req.body?.message || '').trim()
    const userMessage = redactSensitiveContent(userMessageRaw)

    await saveMessage({
      conversationId: conversation._id,
      userId: req.user._id,
      role: 'user',
      content: userMessage,
      source: 'system',
      intent: 'user_message',
      confidence: 1,
      metadata: { flaggedInjection: Boolean(policy.flaggedInjection), restrictedAction: Boolean(policy.restrictedAction) },
    })

    const context = await buildBookingContext(req.user._id)
    const recentHistory = await ChatMessage.find({ conversation: conversation._id }).sort({ createdAt: -1 }).limit(8).lean()
    const warning = policy.warning ? `${policy.warning} ` : ''
    const roommate = await tryResolveRoommatePreference(req.user._id, userMessage)
    if (roommate) {
      const finalReply = `${warning}${roommate.reply}`.trim()
      await saveMessage({
        conversationId: conversation._id,
        userId: req.user._id,
        role: 'assistant',
        content: finalReply,
        source: roommate.source,
        intent: roommate.intent,
        confidence: roommate.confidence,
        metadata: { hasWarning: Boolean(policy.warning), kind: 'roommate_preference' },
      })
      conversation.lastActivity = new Date()
      await conversation.save()
      return res.json({
        reply: finalReply,
        source: roommate.source,
        suggestions: [
          'Year 1 Semester 2 sharing room',
          'Which sharing rooms are available?',
          'What is my booking status?',
        ],
        conversationId: String(conversation._id),
      })
    }

    const rules = resolveRulesResponse(userMessage, context)
    let reply = rules.reply
    let source = 'rules'
    let confidence = rules.confidence
    let intent = rules.intent

    if (!reply || rules.confidence < CONFIDENCE_THRESHOLD) {
      try {
        const llm = await requestLlmFallback({
          message: userMessage,
          context,
          recentHistory: recentHistory.reverse().map((m) => ({ role: m.role, content: m.content })),
        })
        if (llm) {
          reply = llm
          source = 'llm'
          confidence = Math.max(rules.confidence, 0.75)
          intent = rules.intent || 'fallback'
        } else if (!reply) {
          reply = 'I can help with booking status, required documents, payment guidance, and next steps. Please ask one booking question at a time.'
          confidence = 0.6
        }
      } catch {
        if (!reply) {
          reply = 'I could not reach the AI fallback right now. Please ask about booking status, documents, payment, or next steps.'
          confidence = 0.55
        }
      }
    }

    const finalReply = `${warning}${reply}`.trim()

    await saveMessage({
      conversationId: conversation._id,
      userId: req.user._id,
      role: 'assistant',
      content: finalReply,
      source,
      intent,
      confidence,
      metadata: { hasWarning: Boolean(policy.warning) },
    })

    conversation.lastActivity = new Date()
    await conversation.save()

    return res.json({
      reply: finalReply,
      source,
      suggestions: [
        'What is my booking status?',
        'Which documents are required?',
        'What should I do next for my booking?',
      ],
      conversationId: String(conversation._id),
    })
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to process chat message' })
  }
}

export async function getBookingChatHistory(req, res) {
  try {
    if (req.user.role !== 'student') return res.status(403).json({ error: 'Forbidden' })
    const { conversationId } = req.params
    if (!mongoose.isValidObjectId(conversationId)) {
      return res.status(400).json({ error: 'Invalid conversation id' })
    }
    const conversation = await ChatConversation.findOne({ _id: conversationId, user: req.user._id, topic: 'booking' })
    if (!conversation) return res.status(404).json({ error: 'Conversation not found' })

    const messages = await ChatMessage.find({ conversation: conversation._id })
      .sort({ createdAt: 1 })
      .select('role content source intent confidence createdAt')
      .lean()

    return res.json({
      conversationId: String(conversation._id),
      messages,
    })
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to load chat history' })
  }
}
