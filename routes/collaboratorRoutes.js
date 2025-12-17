const express = require('express');
const router = express.Router();
const collaboratorController = require('../controllers/collaboratorController');
const authMiddleware = require('../middleware/authMiddleware');

// Get all notes where user is collaborator
router.get('/my-collaborations', authMiddleware, collaboratorController.getCollaboratedNotes);

// Add collaborator to note
router.post('/notes/:noteId/collaborators', authMiddleware, collaboratorController.addCollaborator);

// Get all collaborators for a note
router.get('/notes/:noteId/collaborators', authMiddleware, collaboratorController.getCollaborators);

// Remove collaborator from note
router.delete('/notes/:noteId/collaborators/:collaboratorId', authMiddleware, collaboratorController.removeCollaborator);

module.exports = router;