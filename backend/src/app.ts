import express from 'express';
import authRoutes from './routes/auth.routes';
import { requireAuth, AuthRequest } from './middleware/auth.middleware';

const app = express();

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);

// Test-only route to verify auth middleware
app.get('/api/auth/me-test', requireAuth, (req: AuthRequest, res) => {
  res.json({ userId: req.user?.userId });
});

export default app;
