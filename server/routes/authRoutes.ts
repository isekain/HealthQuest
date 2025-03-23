import express from 'express';
import { generateToken, verifySignature } from '../middleware/authMiddleware';

const router = express.Router();

// Endpoint to verify signature from wallet and return token
router.post('/verify-signature', async (req, res) => {
  try {
    const { walletAddress, message, signature, timestamp } = req.body;
    
    // Check input data
    if (!walletAddress || !message || !signature || !timestamp) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Check if message is too old (10 minutes)
    const messageTimestamp = parseInt(timestamp.toString());
    const currentTime = Date.now();
    const TEN_MINUTES = 10 * 60 * 1000;
    
    if (currentTime - messageTimestamp > TEN_MINUTES) {
      return res.status(400).json({ error: 'Signature expired' });
    }
    
    // Verify signature
    const isValid = verifySignature(walletAddress, message, signature);
    
    if (isValid) {
      // Create JWT token
      const token = generateToken(walletAddress);
      
      // Return token to client
      return res.status(200).json({ token });
    } else {
      return res.status(401).json({ error: 'Invalid signature' });
    }
  } catch (error) {
    console.error('Error in signature verification:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router; 