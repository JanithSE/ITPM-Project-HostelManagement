import 'dotenv/config'
import mongoose from 'mongoose'
import InventoryItem from '../models/InventoryItem.js'

const uri = process.env.MongoDB_URI || process.env.MONGODB_URI

const HOSTEL_LOCATION = 'Green View Hostel'

/** Exactly one record per category (quantities = previous seed totals combined). */
const DEFAULT_ITEMS = [
  { name: 'Beds — single & bunk', quantity: 60, location: HOSTEL_LOCATION, category: 'Beds' },
  { name: 'Tables — study & dining', quantity: 40, location: HOSTEL_LOCATION, category: 'Tables' },
  { name: 'Chairs — plastic & office', quantity: 88, location: HOSTEL_LOCATION, category: 'Chairs' },
  { name: 'Cupboards — wooden & lockers', quantity: 40, location: HOSTEL_LOCATION, category: 'Cupboards' },
  { name: 'Fans — ceiling & pedestal', quantity: 52, location: HOSTEL_LOCATION, category: 'Fans' },
]

const CATEGORY_BY_LOWER = Object.fromEntries(DEFAULT_ITEMS.map((r) => [r.category.toLowerCase(), r.category]))

/** Merge multiple docs sharing the same category (case-insensitive) into one row. */
async function mergeDuplicateCategories() {
  const all = await InventoryItem.find({})
  const byKey = new Map()
  for (const doc of all) {
    const raw = (doc.category || '').trim()
    if (!raw) continue
    const key = raw.toLowerCase()
    if (!byKey.has(key)) byKey.set(key, [])
    byKey.get(key).push(doc)
  }
  for (const [lower, docs] of byKey) {
    if (docs.length < 2) continue
    const qty = docs.reduce((s, d) => s + (Number(d.quantity) || 0), 0)
    const keep = docs[0]
    const canonicalCategory = CATEGORY_BY_LOWER[lower] || (keep.category || '').trim()
    await InventoryItem.findByIdAndUpdate(keep._id, {
      $set: {
        quantity: qty,
        category: canonicalCategory,
        location: keep.location || HOSTEL_LOCATION,
      },
    })
    const removeIds = docs.slice(1).map((d) => d._id)
    await InventoryItem.deleteMany({ _id: { $in: removeIds } })
  }
}

async function main() {
  if (!uri) {
    console.error('Set MongoDB_URI or MONGODB_URI in .env')
    process.exit(1)
  }
  await mongoose.connect(uri)

  await mergeDuplicateCategories()

  let created = 0
  let updated = 0

  for (const row of DEFAULT_ITEMS) {
    const existing = await InventoryItem.findOne({
      category: new RegExp(`^${row.category.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
    })
    if (existing) {
      await InventoryItem.findByIdAndUpdate(existing._id, {
        $set: { name: row.name, quantity: row.quantity, location: row.location, category: row.category },
      })
      updated += 1
      continue
    }
    await InventoryItem.create(row)
    created += 1
  }

  console.log(JSON.stringify({ created, updated, totalCategories: DEFAULT_ITEMS.length }, null, 2))
  await mongoose.disconnect()
}

main().catch(async (err) => {
  console.error(err)
  try {
    await mongoose.disconnect()
  } catch {}
  process.exit(1)
})
