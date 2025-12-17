const Note = require('../models/Note');
const NoteCollaborator = require('../models/NoteCollaborator');
const User = require('../models/User');

// Add collaborator to note
const addCollaborator = async (req, res) => {
  try {
    const { noteId } = req.params;
    const { email, role } = req.body;
    const userId = req.user.userId;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const note = await Note.findById(noteId);
    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Note not found'
      });
    }

    if (note.owner_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Only note owner can add collaborators'
      });
    }

    if (note.is_locked) {
      return res.status(423).json({
        success: false,
        message: 'Cannot add collaborators to locked note. Please unlock it first.'
      });
    }

    const collaboratorUser = await User.findByEmail(email);
    if (!collaboratorUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (collaboratorUser.id === userId) {
      return res.status(400).json({
        success: false,
        message: 'You cannot add yourself as collaborator'
      });
    }

    const isAlready = await NoteCollaborator.isCollaborator(noteId, collaboratorUser.id);
    if (isAlready) {
      return res.status(400).json({
        success: false,
        message: 'User is already a collaborator'
      });
    }

    const currentCount = await NoteCollaborator.count(noteId);
    if (currentCount >= 2) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 2 collaborators allowed per note'
      });
    }

    await NoteCollaborator.add(noteId, collaboratorUser.id, userId, role || 'editor');

    res.json({
      success: true,
      message: 'Collaborator added successfully',
      collaborator: {
        id: collaboratorUser.id,
        username: collaboratorUser.username,
        email: collaboratorUser.email,
        role: role || 'editor'
      }
    });
  } catch (error) {
    console.error('Add collaborator error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Get all collaborators for a note
const getCollaborators = async (req, res) => {
  try {
    const { noteId } = req.params;
    const userId = req.user.userId;

    const note = await Note.findById(noteId);
    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Note not found'
      });
    }

    const isCollaborator = await NoteCollaborator.isCollaborator(noteId, userId);
    if (note.owner_id !== userId && !isCollaborator) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this note'
      });
    }

    const collaborators = await NoteCollaborator.findByNoteId(noteId);

    res.json({
      success: true,
      collaborators
    });
  } catch (error) {
    console.error('Get collaborators error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Remove collaborator from note
const removeCollaborator = async (req, res) => {
  try {
    const { noteId, collaboratorId } = req.params;
    const userId = req.user.userId;

    const note = await Note.findById(noteId);
    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Note not found'
      });
    }

    if (note.owner_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Only note owner can remove collaborators'
      });
    }

    const removed = await NoteCollaborator.remove(noteId, collaboratorId);
    if (!removed) {
      return res.status(404).json({
        success: false,
        message: 'Collaborator not found'
      });
    }

    res.json({
      success: true,
      message: 'Collaborator removed successfully'
    });
  } catch (error) {
    console.error('Remove collaborator error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Get all notes where user is collaborator
const getCollaboratedNotes = async (req, res) => {
  try {
    const userId = req.user.userId;

    const notes = await NoteCollaborator.findByUserId(userId);

    res.json({
      success: true,
      notes
    });
  } catch (error) {
    console.error('Get collaborated notes error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// PASTIKAN SEMUA FUNCTION TER-EXPORT
module.exports = {
  addCollaborator,
  getCollaborators,
  removeCollaborator,
  getCollaboratedNotes
};