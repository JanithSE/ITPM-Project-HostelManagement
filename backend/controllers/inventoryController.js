import InventoryItem from '../models/InventoryItem.js'

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

export const listInventory = async (req, res) => {
  try {
    const items = await InventoryItem.find().sort({ name: 1 })
    res.json(items)
  } catch (err) {
    res.status(500).json({ error: err.message })
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
    const payload = { ...req.body, quantity: qty }
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

