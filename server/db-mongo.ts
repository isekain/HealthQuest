import mongoose from 'mongoose';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Use MONGODB_URI from .env file
const dbUrl = process.env.MONGODB_URI;

if (!dbUrl) {
  throw new Error('MONGODB_URI environment variable is required');
}

console.log('Attempting to connect to MongoDB...');
console.log('Connection URL format:', dbUrl.replace(/:([^:@]+)@/, ':****@')); // Hide password

// Connect to MongoDB with proper options
mongoose.connect(dbUrl, {
  serverSelectionTimeoutMS: 30000, // Increase timeout to 30 seconds
  socketTimeoutMS: 45000, // Increase socket timeout
  retryWrites: true,
  w: 'majority',
  maxPoolSize: 10,
  minPoolSize: 1,
  maxIdleTimeMS: 10000,
  connectTimeoutMS: 30000,
})
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => {
    console.error('Could not connect to MongoDB. Error details:', {
      name: err.name,
      message: err.message,
      code: err.code,
      codeName: err.codeName
    });
    process.exit(1); // Exit if cannot connect to database
  });

// Add connection error handler
mongoose.connection.on('error', err => {
  console.error('MongoDB connection error:', {
    name: err.name,
    message: err.message,
    code: err.code,
    codeName: err.codeName
  });
});

// Add connection success handler
mongoose.connection.once('open', () => {
  console.log('MongoDB connection is ready');
});

export default mongoose;