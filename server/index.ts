import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import mongoose from 'mongoose';
import './db-mongo'; // Import MongoDB connection
import authRoutes from './routes/authRoutes';
import cors from 'cors';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors()); // Add CORS middleware

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Register authentication routes
app.use('/api/auth', authRoutes);

// Wait for MongoDB connection before starting server
(async () => {
  try {
    // Wait for MongoDB connection
    await mongoose.connection.asPromise();
    console.log('MongoDB connection established');

    // Register all API routes
    registerRoutes(app);

    // Setup Vite development server or static file serving, depending on environment
    await setupVite(app);

    // Try different ports if the default port is already in use
    const ports = [5000, 5001, 5002, 5003, 5004];
    
    const startServer = (port: number) => {
      return new Promise((resolve, reject) => {
        const server = app.listen(port, () => {
          console.log(`Connected to MongoDB`);
          console.log(`Server started on port http://localhost:${port}/`);
          resolve(true);
        });
        
        server.on('error', (err: any) => {
          if (err.code === 'EADDRINUSE') {
            console.log(`Port ${port} is in use, trying another one...`);
            resolve(false);
          } else {
            reject(err);
          }
        });
      });
    };
    
    // Try each port until successful
    for (const port of ports) {
      const success = await startServer(port);
      if (success) break;
    }
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
})();