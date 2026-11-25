import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { store } from '../db/store';
import { env } from '../config/env';
import { AuthenticatedRequest, requireAuth, requireRole } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { ingestKnowledgeDocument, searchKnowledgeBase } from '../services/rag/ragService';

const router = Router();
router.use(requireAuth);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.MAX_UPLOAD_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['application/pdf', 'text/plain'];
    const ext = file.originalname.toLowerCase();
    if (allowed.includes(file.mimetype) || ext.endsWith('.pdf') || ext.endsWith('.txt')) {
      cb(null, true);
    } else {
      cb(new AppError('Only PDF and TXT files are supported.', 400));
    }
  },
});

router.get('/', (req: AuthenticatedRequest, res) => {
  const orgId = req.user!.organizationId;
  const documents = store.db.knowledgeDocuments.filter((d) => d.organizationId === orgId);
  res.json({ documents });
});

router.post('/upload', upload.single('file'), async (req: AuthenticatedRequest, res, next) => {
  try {
    if (!req.file) {
      throw new AppError('Please attach a PDF or TXT file to upload.', 400);
    }

    const isPdf =
      req.file.mimetype === 'application/pdf' || req.file.originalname.toLowerCase().endsWith('.pdf');
    const title =
      typeof req.body?.title === 'string' && req.body.title.trim()
        ? req.body.title.trim()
        : req.file.originalname.replace(/\.(pdf|txt)$/i, '');

    const doc = await ingestKnowledgeDocument({
      organizationId: req.user!.organizationId,
      uploadedById: req.user!.userId,
      title,
      fileName: req.file.originalname,
      fileType: isPdf ? 'PDF' : 'TXT',
      buffer: req.file.buffer,
    });

    res.status(201).json({ document: doc });
  } catch (err) {
    next(err);
  }
});

router.post('/search', async (req: AuthenticatedRequest, res, next) => {
  try {
    const schema = z.object({ query: z.string().min(2), topK: z.number().int().min(1).max(10).optional() });
    const data = schema.parse(req.body);
    const results = await searchKnowledgeBase({
      organizationId: req.user!.organizationId,
      query: data.query,
      topK: data.topK ?? 4,
    });
    res.json({ results });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireRole('ADMIN', 'SALES_MANAGER'), (req: AuthenticatedRequest, res, next) => {
  try {
    const orgId = req.user!.organizationId;
    const idx = store.db.knowledgeDocuments.findIndex(
      (d) => d.id === req.params.id && d.organizationId === orgId
    );
    if (idx === -1) throw new AppError('Knowledge document not found.', 404);

    const docId = store.db.knowledgeDocuments[idx].id;
    store.db.knowledgeDocuments.splice(idx, 1);
    store.db.knowledgeChunks = store.db.knowledgeChunks.filter((c) => c.documentId !== docId);
    store.save();

    res.json({ deleted: true });
  } catch (err) {
    next(err);
  }
});

export default router;
