import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { getMe, updateMe, deleteMe } from '../controllers/user.controller';

const router = Router();

router.use(requireAuth);

router.get('/me', getMe);
router.patch('/me', updateMe);
router.delete('/me', deleteMe);

export default router;
