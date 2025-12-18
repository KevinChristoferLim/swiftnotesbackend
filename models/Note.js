const db = require('../config/database');
const bcrypt = require('bcryptjs');

class Note {
  static async create(noteData) {
    const [result] = await db.query(
      'INSERT INTO notes (title, description, owner_id, user_id, folder_id, reminder_date_millis, reminder_time_millis, reminder_repeat, reminder_location, is_locked, lock_pin) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        noteData.title,
        noteData.description || null,
        noteData.owner_id,
        noteData.user_id,
        noteData.folder_id || null,
        noteData.reminder_date_millis || null,
        noteData.reminder_time_millis || null,
        noteData.reminder_repeat || null,
        noteData.reminder_location || null,
        noteData.is_locked ? 1 : 0, 
        noteData.lock_pin || null
      ]
    );
    return result.insertId;
  }

  static async findById(id) {
    const [rows] = await db.query('SELECT * FROM notes WHERE id = ?', [id]);
    return rows[0];
  }

  static async findAll() {
    const [rows] = await db.query('SELECT * FROM notes');
    return rows;
  }

  static async findByUserId(userId) {
    const [rows] = await db.query('SELECT * FROM notes WHERE user_id = ?', [userId]);
    return rows;
  }

  static async findByFolderId(folderId) {
    const [rows] = await db.query('SELECT * FROM notes WHERE folder_id = ?', [folderId]);
    return rows;
  }

  static async update(id, noteData) {
    const fields = [];
    const values = [];

    if (noteData.title) {
      fields.push('title = ?');
      values.push(noteData.title);
    }
    if (noteData.description !== undefined) {
      fields.push('description = ?');
      values.push(noteData.description);
    }
    if (noteData.owner_id) {
      fields.push('owner_id = ?');
      values.push(noteData.owner_id);
    }
    if (noteData.user_id) {
      fields.push('user_id = ?');
      values.push(noteData.user_id);
    }
    if (noteData.folder_id !== undefined) {
      fields.push('folder_id = ?');
      values.push(noteData.folder_id);
    }
    if (noteData.is_locked !== undefined) {
      fields.push('is_locked = ?');
      values.push(noteData.is_locked ? 1 : 0);
    }
    if (noteData.lock_pin !== undefined) {
      fields.push('lock_pin = ?');
      values.push(noteData.lock_pin);
    }
    if (noteData.reminder_date_millis !== undefined) {
      fields.push('reminder_date_millis = ?');
      values.push(noteData.reminder_date_millis || null);
    }
    if (noteData.reminder_time_millis !== undefined) {
      fields.push('reminder_time_millis = ?');
      values.push(noteData.reminder_time_millis || null);
    }
    if (noteData.reminder_repeat !== undefined) {
      fields.push('reminder_repeat = ?');
      values.push(noteData.reminder_repeat || null);
    }
    if (noteData.reminder_location !== undefined) {
      fields.push('reminder_location = ?');
      values.push(noteData.reminder_location || null);
    }

    values.push(id);

    const [result] = await db.query(
      `UPDATE notes SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
    return result.affectedRows;
  }

  static async lockNote(id, hashedPin) {
    const [result] = await db.query('UPDATE notes SET is_locked = 1, lock_pin = ? WHERE id = ?', [hashedPin, id]);
    return result.affectedRows;
  }

  static async unlockNote(id) {
    const [result] = await db.query('UPDATE notes SET is_locked = 0, lock_pin = NULL WHERE id = ?', [id]);
    return result.affectedRows;
  }

  static async verifyPin(id, pin) {
    const [rows] = await db.query('SELECT lock_pin FROM notes WHERE id = ?', [id]);
    const row = rows[0];
    if (!row || !row.lock_pin) return false;
    try {
      return await bcrypt.compare(pin, row.lock_pin);
    } catch (err) {
      return false;
    }
  }

  static async delete(id) {
    const [result] = await db.query('DELETE FROM notes WHERE id = ?', [id]);
    return result.affectedRows;
  }
}

module.exports = Note;