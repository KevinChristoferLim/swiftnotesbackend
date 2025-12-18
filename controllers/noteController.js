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
    const reminder_date_millis = req.body.reminder_date_millis ?? null;
    const reminder_time_millis = req.body.reminder_time_millis ?? null;
    const reminder_repeat = req.body.reminder_repeat ? JSON.stringify(req.body.reminder_repeat) : null;
    const reminder_location = req.body.reminder_location ?? null;

    console.log('📝 createNote request:', { title, description, folder_id, userId, reminder_time_millis, body: req.body });

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
      reminder_date_millis,
      reminder_time_millis,
      reminder_repeat,
      reminder_location,
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
        is_locked: false,
        reminder_date_millis,
        reminder_time_millis,
        reminder_repeat: req.body.reminder_repeat,
        reminder_location
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
    const collaboratedNoteIds = [...new Set(collaboratedNotes.map(n => n.note_id))];
    
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
    
    // Enrich notes with collaborators info
    const enrichedNotes = [];
    for (let note of allNotes) {
      const collaborators = await NoteCollaborator.findByNoteId(note.id);
      
      // If there are collaborators, it's a collaboration
      const isCollaboration = Boolean(note.is_collaboration || (collaborators && collaborators.length > 0));
      
      // Fetch owner info to include in participants
      const ownerId = note.owner_id || note.user_id;
      const owner = await User.findById(ownerId);
      
      const participants = [];
      if (owner) {
          participants.push({
              id: String(owner.id),
              username: owner.username,
              email: owner.email,
              profile_picture: owner.profile_picture,
              role: 'owner'
          });
      }
      
      // Add other collaborators
      if (collaborators) {
          collaborators.forEach(c => {
              if (String(c.id) !== String(ownerId)) {
                  participants.push({
                      id: String(c.id),
                      username: c.username,
                      email: c.email,
                      profile_picture: c.profile_picture,
                      role: c.role || 'editor'
                  });
              }
          });
      }

      enrichedNotes.push({
        ...note,
        is_collaboration: isCollaboration,
        collaborators: participants
      });
    }
    
    // Hide description for locked notes and ensure timestamps are numbers
    const sanitizedNotes = enrichedNotes.map(note => {
      const reminder = (note && (note.reminder_time_millis || note.reminder_date_millis || note.reminder_repeat || note.reminder_location)) ? {
        reminder_date_millis: note.reminder_date_millis || null,
        reminder_time_millis: note.reminder_time_millis || null,
        reminder_repeat: (() => {
          try {
            return note.reminder_repeat ? JSON.parse(note.reminder_repeat) : null;
          } catch (e) {
            return note.reminder_repeat || null;
          }
        })(),
        reminder_location: note.reminder_location || null
      } : null;

      const sanitized = {
        ...note,
        lock_pin: undefined,
        // Ensure timestamps are Unix milliseconds (numbers)
        created_at: note.created_at ? new Date(note.created_at).getTime() : Date.now(),
        updated_at: note.updated_at ? new Date(note.updated_at).getTime() : Date.now(),
        // Convert is_locked from 0/1 to boolean
        is_locked: Boolean(note.is_locked),
        is_pinned: Boolean(note.is_pinned),
        reminder // nested object for clients
      };

      if (note.is_locked) {
        sanitized.description = '🔒 This note is locked';
      }

      return sanitized;
    });

    // Return raw array for Android clients that expect List<Note>
    res.json(sanitizedNotes);
  } catch (error) {
    console.error('getAllNotes error:', error);
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

    const collaborators = await NoteCollaborator.findByNoteId(id);
    const ownerId = note.owner_id || note.user_id;
    const owner = await User.findById(ownerId);
    
    const participants = [];
    if (owner) {
        participants.push({
            id: String(owner.id),
            username: owner.username,
            email: owner.email,
            profile_picture: owner.profile_picture,
            role: 'owner'
        });
    }
    if (collaborators) {
        collaborators.forEach(c => {
            if (String(c.id) !== String(ownerId)) {
                participants.push({
                    id: String(c.id),
                    username: c.username,
                    email: c.email,
                    profile_picture: c.profile_picture,
                    role: c.role || 'editor'
                });
            }
        });
    }

    const isCollaboration = Boolean(isCollaborator || (collaborators && collaborators.length > 0));

    // Build nested reminder object
    const reminder = (note && (note.reminder_time_millis || note.reminder_date_millis || note.reminder_repeat || note.reminder_location)) ? {
      reminder_date_millis: note.reminder_date_millis || null,
      reminder_time_millis: note.reminder_time_millis || null,
      reminder_repeat: (() => {
        try { return note.reminder_repeat ? JSON.parse(note.reminder_repeat) : null; } catch (e) { return note.reminder_repeat || null; }
      })(),
      reminder_location: note.reminder_location || null
    } : null;

    // If locked, hide description
    if (note.is_locked) {
      return res.json({ 
        success: true,
        note: {
          ...note,
          description: '🔒 This note is locked. Use unlock endpoint with PIN.',
          lock_pin: undefined,
          is_collaboration: isCollaboration,
          collaborators: participants,
          reminder
        }
      });
    }

    res.json({ 
      success: true,
      note: {
        ...note,
        lock_pin: undefined,
        is_collaboration: isCollaboration,
        collaborators: participants,
        reminder
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
    
    const sanitizedNotes = notes.map(note => {
      const reminder = (note && (note.reminder_time_millis || note.reminder_date_millis || note.reminder_repeat || note.reminder_location)) ? {
        reminder_date_millis: note.reminder_date_millis || null,
        reminder_time_millis: note.reminder_time_millis || null,
        reminder_repeat: (() => { try { return note.reminder_repeat ? JSON.parse(note.reminder_repeat) : null } catch (e) { return note.reminder_repeat || null } })(),
        reminder_location: note.reminder_location || null
      } : null;

      if (note.is_locked) {
        return {
          ...note,
          description: '🔒 This note is locked',
          lock_pin: undefined,
          reminder
        };
      }
      return {
        ...note,
        lock_pin: undefined,
        reminder
      };
    });

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
    const sanitizedNotes = accessibleNotes.map(note => {
      const reminder = (note && (note.reminder_time_millis || note.reminder_date_millis || note.reminder_repeat || note.reminder_location)) ? {
        reminder_date_millis: note.reminder_date_millis || null,
        reminder_time_millis: note.reminder_time_millis || null,
        reminder_repeat: (() => { try { return note.reminder_repeat ? JSON.parse(note.reminder_repeat) : null } catch (e) { return note.reminder_repeat || null } })(),
        reminder_location: note.reminder_location || null
      } : null;

      if (note.is_locked) {
        return {
          ...note,
          description: '🔒 This note is locked',
          lock_pin: undefined,
          reminder
        };
      }
      return {
        ...note,
        lock_pin: undefined,
        reminder
      };
    });

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
    const reminder_date_millis = req.body.reminder_date_millis ?? undefined;
    const reminder_time_millis = req.body.reminder_time_millis ?? undefined;
    const reminder_repeat = req.body.reminder_repeat ? JSON.stringify(req.body.reminder_repeat) : undefined;
    const reminder_location = req.body.reminder_location ?? undefined;

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
    if (reminder_date_millis !== undefined) updateData.reminder_date_millis = reminder_date_millis;
    if (reminder_time_millis !== undefined) updateData.reminder_time_millis = reminder_time_millis;
    if (reminder_repeat !== undefined) updateData.reminder_repeat = reminder_repeat;
    if (reminder_location !== undefined) updateData.reminder_location = reminder_location;

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
      return res.status(404).json({ 
        success: false,
        message: 'Note not found' 
      });
    }

    // Only owner can lock note
    if (note.user_id !== userId) {
      return res.status(403).json({ 
        success: false,
        message: 'Only note owner can lock this note' 
      });
    }

    if (note.is_locked) {
      return res.status(400).json({ 
        success: false,
        message: 'Note is already locked' 
      });
    }

    // Hash PIN
    const hashedPin = await bcrypt.hash(pin, 10);
    await Note.lockNote(id, hashedPin);

    res.json({ 
      success: true,
      message: 'Note locked successfully' 
    });
  } catch (error) {
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

    if (!pin) {
      return res.status(400).json({ 
        success: false,
        message: 'PIN is required to unlock the note' 
      });
    }

    const note = await Note.findById(id);
    if (!note) {
      return res.status(404).json({ 
        success: false,
        message: 'Note not found' 
      });
    }

    // Check if user has access (owner or collaborator)
    const isCollaborator = await NoteCollaborator.isCollaborator(id, userId);
    if (note.user_id !== userId && !isCollaborator) {
      return res.status(403).json({ 
        success: false,
        message: 'You do not have access to this note' 
      });
    }

    if (!note.is_locked) {
      return res.status(400).json({ 
        success: false,
        message: 'Note is not locked' 
      });
    }

    // Verify PIN
    const isValidPin = await Note.verifyPin(id, pin);
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
    const { pin } = req.body;
    const userId = req.user.userId;

    if (!pin) {
      return res.status(400).json({ 
        success: false,
        message: 'PIN is required to view locked note' 
      });
    }

    const note = await Note.findById(id);
    if (!note) {
      return res.status(404).json({ 
        success: false,
        message: 'Note not found' 
      });
    }

    // Check if user has access (owner or collaborator)
    const isCollaborator = await NoteCollaborator.isCollaborator(id, userId);
    if (note.user_id !== userId && !isCollaborator) {
      return res.status(403).json({ 
        success: false,
        message: 'You do not have access to this note' 
      });
    }

    if (!note.is_locked) {
      return res.json({ 
        success: true,
        note: {
          ...note,
          lock_pin: undefined
        }
      });
    }

    // Verify PIN
    const isValidPin = await Note.verifyPin(id, pin);
    if (!isValidPin) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid PIN' 
      });
    }

    res.json({ 
      success: true,
      note: {
        ...note,
        lock_pin: undefined
      },
      message: 'Note content displayed temporarily. Note remains locked.'
    });
  } catch (error) {
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
