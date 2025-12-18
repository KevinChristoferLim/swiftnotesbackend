const Note = require('../models/Note');
const Folder = require('../models/Folder');
const NoteCollaborator = require('../models/NoteCollaborator');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

const createNote = async (req, res) => {
  try {
    // Accept both `description` (backend) and `content` (Android)
    const title = req.body.title;
    const description = req.body.description ?? req.body.content ?? null;
    const folder_id = req.body.folder_id ?? req.body.folderId ?? null;
    const userId = req.user.userId;

    console.log('📝 createNote request:', { title, description, folder_id, userId, body: req.body });

    if (!title) {
      console.log('❌ Title is missing or empty');
      return res.status(400).json({ 
        success: false,
        message: 'Title is required' 
      });
    }

    const noteId = await Note.create({
      title,
      description,
      owner_id: userId,
      user_id: userId,
      folder_id,
      is_locked: false,
      lock_pin: null
    });

    console.log('✅ Note created with ID:', noteId);

    if (folder_id) {
      await Folder.incrementNotesAmount(folder_id);
    }

    res.status(201).json({
      success: true,
      message: 'Note created successfully',
      id: noteId,
      noteId: noteId,
      note: {
        id: noteId,
        title,
        description,
        owner_id: userId,
        user_id: userId,
        folder_id,
        is_locked: false
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
};

const getAllNotes = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Get user's own notes
    const ownNotes = await Note.findByUserId(userId);
    
    // Get collaborated notes
    const collaboratedNotes = await NoteCollaborator.findByUserId(userId);
    const collaboratedNoteIds = collaboratedNotes.map(n => n.note_id);
    
    // Get full details of collaborated notes
    let collabNotesDetails = [];
    for (let noteId of collaboratedNoteIds) {
      const note = await Note.findById(noteId);
      if (note) {
        collabNotesDetails.push({
          ...note,
          is_collaboration: true
        });
      }
    }
    
    // Combine both
    const allNotes = [...ownNotes, ...collabNotesDetails];
    
    // Hide description for locked notes and ensure timestamps are numbers
    const sanitizedNotes = allNotes.map(note => {
      const sanitized = {
        ...note,
        lock_pin: undefined,
        // Ensure timestamps are Unix milliseconds (numbers)
        created_at: note.created_at ? new Date(note.created_at).getTime() : Date.now(),
        updated_at: note.updated_at ? new Date(note.updated_at).getTime() : Date.now(),
        // Convert is_locked from 0/1 to boolean
        is_locked: Boolean(note.is_locked),
        is_pinned: Boolean(note.is_pinned)
      };
      
      // Keep full description even if locked; clients use `is_locked` to render read-only UI
      
      return sanitized;
    });

    // Return raw array for Android clients that expect List<Note>
    res.json(sanitizedNotes);
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
};

const getNoteById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const note = await Note.findById(id);

    if (!note) {
      return res.status(404).json({ 
        success: false,
        message: 'Note not found' 
      });
    }

    // Check if user is owner or collaborator
    const isCollaborator = await NoteCollaborator.isCollaborator(id, userId);
    if (note.user_id !== userId && !isCollaborator) {
      return res.status(403).json({ 
        success: false,
        message: 'You do not have access to this note' 
      });
    }

    // Return note; clients will respect `is_locked` to render read-only state. lock_pin is omitted.


    res.json({ 
      success: true,
      note: {
        ...note,
        lock_pin: undefined
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
};

const getNotesByUserId = async (req, res) => {
  try {
    const { userId } = req.params;
    const requestUserId = req.user.userId;

    // Only allow users to get their own notes
    if (parseInt(userId) !== requestUserId) {
      return res.status(403).json({ 
        success: false,
        message: 'You can only view your own notes' 
      });
    }

    const notes = await Note.findByUserId(userId);
    
    const sanitizedNotes = notes.map(note => ({
      ...note,
      lock_pin: undefined
    }));

    res.json({ 
      success: true,
      notes: sanitizedNotes 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
};

const getNotesByFolderId = async (req, res) => {
  try {
    const { folderId } = req.params;
    const userId = req.user.userId;
    
    const notes = await Note.findByFolderId(folderId);
    
    // Filter notes that user has access to (owner or collaborator)
    const accessibleNotes = [];
    for (let note of notes) {
      const isCollaborator = await NoteCollaborator.isCollaborator(note.id, userId);
      if (note.user_id === userId || isCollaborator) {
        accessibleNotes.push(note);
      }
    }
    
    // Sanitize locked notes
    const sanitizedNotes = accessibleNotes.map(note => ({
      ...note,
      lock_pin: undefined
    }));

    res.json({ 
      success: true,
      notes: sanitizedNotes 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
};

const updateNote = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, folder_id } = req.body;
    const userId = req.user.userId;

    const note = await Note.findById(id);
    if (!note) {
      return res.status(404).json({ 
        success: false,
        message: 'Note not found' 
      });
    }

    // Check if user is owner or collaborator with editor role
    const isCollaborator = await NoteCollaborator.isCollaborator(id, userId);
    if (note.user_id !== userId && !isCollaborator) {
      return res.status(403).json({ 
        success: false,
        message: 'You are not authorized to update this note' 
      });
    }

    // Cannot update locked note
    if (note.is_locked) {
      return res.status(423).json({ 
        success: false,
        message: 'Note is locked. Please unlock it first before updating.' 
      });
    }

    const oldFolderId = note.folder_id;

    const updateData = {};
    if (title) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (folder_id !== undefined) updateData.folder_id = folder_id;

    await Note.update(id, updateData);

    if (folder_id !== undefined && oldFolderId !== folder_id) {
      if (oldFolderId) {
        await Folder.decrementNotesAmount(oldFolderId);
      }
      if (folder_id) {
        await Folder.incrementNotesAmount(folder_id);
      }
    }

    res.json({ 
      success: true,
      message: 'Note updated successfully' 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
};

const deleteNote = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId; 

    const note = await Note.findById(id);
    if (!note) {
      return res.status(404).json({ 
        success: false,
        message: 'Note not found' 
      });
    }

    // Only owner can delete note
    if (note.user_id !== userId) {
      return res.status(403).json({ 
        success: false,
        message: 'Only note owner can delete this note' 
      });
    }

    // Remove all collaborators first
    await NoteCollaborator.removeAll(id);

    await Note.delete(id);

    if (note.folder_id) {
      await Folder.decrementNotesAmount(note.folder_id);
    }

    res.json({ 
      success: true,
      message: 'Note deleted successfully' 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
};

// POST /api/notes/:noteId/collaborators
const addCollaborator = async (req, res) => {
  try {
    const { noteId } = req.params;
    const { email, role } = req.body;
    const addedBy = req.user.userId;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Collaborator email is required' });
    }

    // Verify note exists and caller is owner
    const note = await Note.findById(noteId);
    if (!note) {
      return res.status(404).json({ success: false, message: 'Note not found' });
    }

    if (note.user_id !== addedBy && note.owner_id !== addedBy) {
      return res.status(403).json({ success: false, message: 'Only note owner can add collaborators' });
    }

    // Find user by email
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User with that email not found' });
    }

    if (user.id === addedBy) {
      return res.status(400).json({ success: false, message: 'Cannot add yourself as collaborator' });
    }

    try {
      await NoteCollaborator.add(noteId, user.id, addedBy, role || 'editor');
    } catch (err) {
      // handle duplicate entry
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ success: false, message: 'User is already a collaborator' });
      }
      throw err;
    }

    res.json({ success: true, message: 'Collaborator added successfully' });
  } catch (error) {
    console.error('Add collaborator error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// ========== LOCK & UNLOCK FEATURES ==========

const lockNote = async (req, res) => {
  try {
    const { id } = req.params;
    const { pin } = req.body;
    const userId = req.user.userId;

    console.log('LOCK attempt', { id, userId, pinProvided: !!pin });

    if (!pin) {
      return res.status(400).json({ 
        success: false,
        message: 'PIN is required to lock the note' 
      });
    }

    if (pin.length < 4) {
      return res.status(400).json({ 
        success: false,
        message: 'PIN must be at least 4 characters' 
      });
    }

    const note = await Note.findById(id);
    if (!note) {
      console.log('LOCK failed: note not found', { id });
      return res.status(404).json({ 
        success: false,
        message: 'Note not found' 
      });
    }

    // Only owner can lock note
    if (note.user_id !== userId) {
      console.log('LOCK denied: not owner', { noteUser: note.user_id, userId });
      return res.status(403).json({ 
        success: false,
        message: 'Only note owner can lock this note' 
      });
    }

    if (note.is_locked) {
      console.log('LOCK skipped: already locked', { id });
      return res.status(400).json({ 
        success: false,
        message: 'Note is already locked' 
      });
    }

    // Hash PIN
    const hashedPin = await bcrypt.hash(pin, 10);
    console.log('LOCK hashing done, calling model lockNote', { id });
    await Note.lockNote(id, hashedPin);

    res.json({ 
      success: true,
      message: 'Note locked successfully' 
    });
  } catch (error) {
    console.error('LOCK error', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
};

const unlockNote = async (req, res) => {
  try {
    const { id } = req.params;
    const { pin } = req.body;
    const userId = req.user.userId;

    console.log('UNLOCK attempt', { id, userId, pinProvided: !!pin });

    if (!pin) {
      return res.status(400).json({ 
        success: false,
        message: 'PIN is required to unlock the note' 
      });
    }

    const note = await Note.findById(id);
    if (!note) {
      console.log('UNLOCK failed: note not found', { id });
      return res.status(404).json({ 
        success: false,
        message: 'Note not found' 
      });
    }

    // Check if user has access (owner or collaborator)
    const isCollaborator = await NoteCollaborator.isCollaborator(id, userId);
    if (note.user_id !== userId && !isCollaborator) {
      console.log('UNLOCK denied: no access', { noteUser: note.user_id, userId });
      return res.status(403).json({ 
        success: false,
        message: 'You do not have access to this note' 
      });
    }

    if (!note.is_locked) {
      console.log('UNLOCK skipped: note not locked', { id });
      return res.status(400).json({ 
        success: false,
        message: 'Note is not locked' 
      });
    }

    // Verify PIN
    const isValidPin = await Note.verifyPin(id, pin);
    console.log('UNLOCK PIN valid:', isValidPin);
    if (!isValidPin) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid PIN' 
      });
    }

    // Only owner can permanently unlock
    if (note.user_id === userId) {
      await Note.unlockNote(id);
      return res.json({ 
        success: true,
        message: 'Note unlocked successfully' 
      });
    } else {
      // Collaborator can only view, not unlock permanently
      return res.json({ 
        success: true,
        message: 'PIN verified. Use /view endpoint to see content.',
        temporary: true
      });
    }
  } catch (error) {
    console.error('UNLOCK error', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
};

const viewLockedNote = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    console.log('VIEW attempt', { id, userId });

    const note = await Note.findById(id);
    if (!note) {
      console.log('VIEW failed: note not found', { id });
      return res.status(404).json({ 
        success: false,
        message: 'Note not found' 
      });
    }

    // Check if user has access (owner or collaborator)
    const isCollaborator = await NoteCollaborator.isCollaborator(id, userId);
    if (note.user_id !== userId && !isCollaborator) {
      console.log('VIEW denied: no access', { noteUser: note.user_id, userId });
      return res.status(403).json({ 
        success: false,
        message: 'You do not have access to this note' 
      });
    }

    // Return note content (clients should render read-only if `is_locked` is true)
    res.json({ 
      success: true,
      note: {
        ...note,
        lock_pin: undefined
      },
      message: note.is_locked ? 'Note is locked (read-only).' : undefined
    });
  } catch (error) {
    console.error('VIEW error', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
};

module.exports = {
  createNote,
  getAllNotes,
  getNoteById,
  getNotesByUserId,
  getNotesByFolderId,
  updateNote,
  deleteNote,
  lockNote,
  unlockNote,
  viewLockedNote
  ,addCollaborator
};