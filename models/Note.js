const db = require('../config/database');

class Note {
  static async create(noteData) {
    const [result] = await db.query(
      'INSERT INTO notes (title, description, owner_id, user_id, folder_id, reminder_date_millis, reminder_time_millis, reminder_repeat, reminder_location) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        noteData.title,
        noteData.description || null,
        noteData.owner_id,
        noteData.user_id,
        noteData.folder_id || null,
        noteData.reminder_date_millis || null,
        noteData.reminder_time_millis || null,
        noteData.reminder_repeat || null,
        noteData.reminder_location || null
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

  static async delete(id) {
    const [result] = await db.query('DELETE FROM notes WHERE id = ?', [id]);
    return result.affectedRows;
  }
}

module.exports = Note;