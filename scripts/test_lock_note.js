require('dotenv').config();
const Note = require('../models/Note');
const bcrypt = require('bcryptjs');

async function test(noteId, pin) {
  try {
    const note = await Note.findById(noteId);
    if (!note) return console.error('Note not found', noteId);
    console.log('Note found', { id: note.id, owner_id: note.user_id, is_locked: !!note.is_locked });

    const hashed = await bcrypt.hash(pin, 10);
    console.log('Hashed pin:', hashed.slice(0, 10) + '...');

    await Note.lockNote(noteId, hashed);
    console.log('lockNote executed');

    const updated = await Note.findById(noteId);
    console.log('Updated note', { id: updated.id, is_locked: !!updated.is_locked, lock_pin: (updated.lock_pin ? 'set' : 'null') });
  } catch (err) {
    console.error('Error', err);
  } finally {
    process.exit(0);
  }
}

const [noteId, pin] = process.argv.slice(2);
if (!noteId || !pin) {
  console.error('Usage: node scripts/test_lock_note.js <noteId> <pin>');
  process.exit(1);
}

test(noteId, pin);
