const express = require('express');
const router = express.Router();
const noteController = require('../controllers/noteController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/', authMiddleware, noteController.createNote);
router.get('/', authMiddleware, noteController.getAllNotes);
router.get('/:id', authMiddleware, noteController.getNoteById);
router.get('/user/:userId', authMiddleware, noteController.getNotesByUserId);
router.get('/folder/:folderId', authMiddleware, noteController.getNotesByFolderId);
router.put('/:id', authMiddleware, noteController.updateNote);
router.delete('/:id', authMiddleware, noteController.deleteNote);

// Lock/unlock/view locked note
router.post('/:id/lock', authMiddleware, noteController.lockNote);
router.post('/:id/unlock', authMiddleware, noteController.unlockNote);
router.post('/:id/view', authMiddleware, noteController.viewLockedNote);

// Add collaborator to a note


module.exports = router;