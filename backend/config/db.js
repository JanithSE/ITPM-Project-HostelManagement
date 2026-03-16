import mongoose from 'mongoose'

export async function connectDB() {
  const uri = process.env.MONGODB_URI || 'mongodb+srv://hosteladmin:1234@cluster0.ykd60i8.mongodb.net/unihostel?retryWrites=true&w=majority'
  
  try {
    if (!uri) {
      throw new Error('MongoDB URI is not defined. Please set MONGODB_URI in .env file')
    }

    const options = {
      serverSelectionTimeoutMS: 10000, // Timeout after 10s
      socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
      connectTimeoutMS: 10000, // Connection timeout
      retryWrites: true,
      w: 'majority',
    }

    await mongoose.connect(uri, options)
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
    }
    
    console.error(`\n🔗 Connection URI: ${uri.replace(/:[^:@]+@/, ':****@')}`)
    process.exit(1)
  }
}
