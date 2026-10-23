import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongodbUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/marketplace_quality_reviewer',
  jwtSecret: process.env.JWT_SECRET || 'dev-jwt-super-secret-key-change-in-prod-min32chars',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  cookieMaxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  llmProvider: process.env.LLM_PROVIDER || 'gemini', // 'gemini' | 'openai' | 'mock'
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  openaiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  maxBatchSize: parseInt(process.env.MAX_BATCH_SIZE || '50', 10),
  rateLimitWindowMs: 15 * 60 * 1000,
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '200', 10),
};
