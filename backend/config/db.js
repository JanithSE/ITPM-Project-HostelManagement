import dns from 'dns'
import mongoose from 'mongoose'

function applySrvDns(uri) {
  if (!uri.startsWith('mongodb+srv://')) return
  if (process.env.MONGODB_SKIP_DNS_FIX === '1') return

  const explicit = process.env.MONGODB_DNS_SERVERS
  if (explicit) {
    const servers = explicit.split(',').map(s => s.trim()).filter(Boolean)
    if (servers.length) dns.setServers(servers)
    return
  }

  // Node on some Windows/corporate networks fails SRV lookups with the default resolver.
  dns.setServers(['8.8.8.8', '1.1.1.1'])
  console.log(
    '📡 Using public DNS for MongoDB SRV (8.8.8.8, 1.1.1.1). Override with MONGODB_DNS_SERVERS or set MONGODB_SKIP_DNS_FIX=1.'
  )
}

function isDnsOrSrvFailure(err) {
  const msg = err?.message || ''
  return (
    err?.code === 'ENOTFOUND' ||
    msg.includes('ENOTFOUND') ||
    msg.includes('querySrv') ||
    msg.includes('getaddrinfo')
  )
}

const connectOptions = {
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 10000,
  retryWrites: true,
  w: 'majority',
}

async function connectWithUri(uri) {
  applySrvDns(uri)
  await mongoose.connect(uri, connectOptions)
}

export async function connectDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/unihostel'
  const fallbackUri = process.env.MONGODB_FALLBACK_URI?.trim()

  try {
    if (!uri) {
      throw new Error('MongoDB URI is not defined. Please set MONGODB_URI in .env file')
    }

    try {
      await connectWithUri(uri)
    } catch (primaryErr) {
      if (
        fallbackUri &&
        fallbackUri !== uri &&
        isDnsOrSrvFailure(primaryErr)
      ) {
        console.warn(
          '⚠️ Primary MongoDB URI failed (DNS/network). Retrying MONGODB_FALLBACK_URI...'
        )
        if (mongoose.connection.readyState !== 0) {
          await mongoose.disconnect().catch(() => {})
        }
        await connectWithUri(fallbackUri)
      } else {
        throw primaryErr
      }
    }

    console.log('✅ MongoDB connected successfully')
    console.log(`📊 Database: ${mongoose.connection.name}`)
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message)
    
    // More detailed error messages
    if (err.name === 'MongoServerSelectionError' || err.code === 'ENOTFOUND' || err.message.includes('ENOTFOUND')) {
      console.error('💡 DNS/Network Error - Possible causes:')
      console.error('   1. Check if your IP is whitelisted in MongoDB Atlas')
      console.error('   2. Verify your network connection and DNS settings')
      console.error('   3. Check if the cluster URL is correct')
      console.error('   4. The cluster might be paused or deleted')
      console.error('   5. Try using a different network or VPN')
      console.error('\n📝 To fix:')
      console.error('   - Go to MongoDB Atlas → Network Access → Add IP Address')
      console.error('   - Or allow access from anywhere (0.0.0.0/0) for testing')
      console.error('   - Verify the cluster is running in MongoDB Atlas')
    } else if (err.name === 'MongoAuthenticationError') {
      console.error('💡 Authentication Error - Possible causes:')
      console.error('   1. Wrong username or password')
      console.error('   2. User does not have access to the database')
      console.error('   3. Check Database Access in MongoDB Atlas')
    } else if (err.message.includes('querySrv')) {
      console.error('💡 DNS Resolution Error:')
      console.error('   1. The cluster URL might be incorrect')
      console.error('   2. Check your internet connection')
      console.error('   3. Verify the cluster exists in MongoDB Atlas')
      console.error('   4. Try getting a fresh connection string from Atlas')
      console.error(
        '   5. For local dev: set MONGODB_FALLBACK_URI=mongodb://127.0.0.1:27017/unihostel and run MongoDB locally'
      )
    }

    const redact = (u) => (u ? u.replace(/:[^:@]+@/, ':****@') : '<missing>')
    console.error(`\n🔗 Primary URI: ${redact(uri)}`)
    if (fallbackUri) console.error(`🔗 Fallback URI: ${redact(fallbackUri)}`)
    process.exit(1)
  }
}
