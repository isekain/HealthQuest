import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User';

// Extend Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        walletAddress: string;
      };
    }
  }
}

// JWT secret - should be in environment variables for production
const JWT_SECRET = process.env.JWT_SECRET || 'healthquest_secret_key';
const TOKEN_EXPIRY = '7d'; 
export const generateToken = (walletAddress: string): string => {
  return jwt.sign({ walletAddress }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
};

// Generate random token to store in DB
export const generateAuthToken = (): string => {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
};

// Signature verification function - for backward compatibility, not used
export const verifySignature = (walletAddress: string, message: string, signature: string): boolean => {
  console.log("Signature verification function is not used, returning true");
  return true; // Always returns true as we no longer use this method
};

// JWT authentication middleware
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    const token = authHeader.split(' ')[1];
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { walletAddress: string };
      req.user = { walletAddress: decoded.walletAddress };
      next();
    } catch (error) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }
  } catch (error) {
    return res.status(500).json({ error: "Authentication error" });
  }
};

// DB token verification middleware
export const verifyDbToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user || !req.user.walletAddress) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    const user = await User.findOne({ walletAddress: req.user.walletAddress });
    
    if (!user || !user.authToken) {
      return res.status(401).json({ error: "User not authenticated" });
    }
    
    // Add token from DB to request header
    req.headers['db-auth-token'] = user.authToken;
    next();
  } catch (error) {
    return res.status(500).json({ error: "Token verification error" });
  }
};

// Middleware to verify users only access their own data
export const verifyWalletOwnership = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user || !req.user.walletAddress) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    const requestedWalletAddress = req.params.walletAddress;
    
    if (req.user.walletAddress !== requestedWalletAddress) {
      return res.status(403).json({ error: "Access denied" });
    }
    
    next();
  } catch (error) {
    return res.status(500).json({ error: "Verification error" });
  }
};
