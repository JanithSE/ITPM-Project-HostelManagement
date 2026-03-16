import InventoryItem from '../models/InventoryItem.js'

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
    const item = await InventoryItem.create(req.body)
    res.status(201).json(item)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

export const updateInventoryItem = async (req, res) => {
  try {
    const item = await InventoryItem.findByIdAndUpdate(req.params.id, req.body, { new: true })
    if (!item) return res.status(404).json({ error: 'Item not found' })
    res.json(item)
  } catch (err) {
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

