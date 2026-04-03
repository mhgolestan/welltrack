import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  getSymptoms,
  createSymptom,
  updateSymptom,
  deleteSymptom,
  getSymptomLogs,
  createSymptomLog,
  updateSymptomLog,
  deleteSymptomLog,
} from '../controllers/symptom.controller';

export const symptomRouter = Router();
symptomRouter.use(requireAuth);
symptomRouter.get('/', getSymptoms);
symptomRouter.post('/', createSymptom);
symptomRouter.patch('/:id', updateSymptom);
symptomRouter.delete('/:id', deleteSymptom);

export const symptomLogRouter = Router();
symptomLogRouter.use(requireAuth);
symptomLogRouter.get('/', getSymptomLogs);
symptomLogRouter.post('/', createSymptomLog);
symptomLogRouter.patch('/:id', updateSymptomLog);
symptomLogRouter.delete('/:id', deleteSymptomLog);
