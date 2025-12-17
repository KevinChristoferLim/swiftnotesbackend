const db = require('../config/database');

class Note {

  static async create(noteData) {
    const now = Date.now();

    const [result] = await db.query(
      `INSERT INTO notes 
       (title, description, owner_id, user_id, folder_id, created_at, updated_at, color_long, is_pinned, is_locked)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        noteData.title,
        noteData.description || null,
        noteData.owner_id,
        noteData.user_id,
        noteData.folder_id || null,
        now,
        now,
        noteData.colorLong ?? 4283192319,
        noteData.isPinned ?? false,
        noteData.isLocked ?? false
      ]
    );

    return result.insertId;
  }

  static async findById(id) {
    const [rows] = await db.query(
      'SELECT * FROM notes WHERE id = ?',
      [id]
    );
    return rows[0];
  }

  static async findAll() {
    const [rows] = await db.query('SELECT * FROM notes');
    return rows;
  }

  static async findByUserId(userId) {
    const [rows] = await db.query(
      'SELECT * FROM notes WHERE user_id = ?',
      [userId]
    );
    return rows;
  }

  static async findByFolderId(folderId) {
    const [rows] = await db.query(
      'SELECT * FROM notes WHERE folder_id = ?',
      [folderId]
    );
    return rows;
  }

  static async update(id, noteData) {
    const fields = [];
    const values = [];

    if (noteData.title !== undefined) {
      fields.push('title = ?');
      values.push(noteData.title);
    }

    if (noteData.description !== undefined) {
      fields.push('description = ?');
      values.push(noteData.description);
    }

    if (noteData.owner_id !== undefined) {
      fields.push('owner_id = ?');
      values.push(noteData.owner_id);
    }

    if (noteData.user_id !== undefined) {
      fields.push('user_id = ?');
      values.push(noteData.user_id);
    }

    if (noteData.folder_id !== undefined) {
      fields.push('folder_id = ?');
      values.push(noteData.folder_id);
    }

    if (noteData.colorLong !== undefined) {
      fields.push('color_long = ?');
      values.push(noteData.colorLong);
    }

    if (noteData.isPinned !== undefined) {
      fields.push('is_pinned = ?');
      values.push(noteData.isPinned);
    }

    if (noteData.isLocked !== undefined) {
      fields.push('is_locked = ?');
      values.push(noteData.isLocked);
    }

    // always update timestamp
    fields.push('updated_at = ?');
    values.push(Date.now());

    values.push(id);

    const [result] = await db.query(
      `UPDATE notes SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    return result.affectedRows;
  }

  static async delete(id) {
    const [result] = await db.query(
      'DELETE FROM notes WHERE id = ?',
      [id]
    );
    return result.affectedRows;
  }

  static async getChecklist(noteId) {
    const [rows] = await db.query(
      `SELECT * FROM checklist_items
       WHERE note_id = ?
       ORDER BY item_order`,
      [noteId]
    );

    return rows.map(r => ({
      noteId: noteId.toString(),
      text: r.text,
      isChecked: !!r.is_checked,
      isChecklist: !!r.is_checklist,
      order: r.item_order
    }));
  }

  static async saveChecklist(noteId, checklist = []) {
    // remove old checklist
    await db.query(
      'DELETE FROM checklist_items WHERE note_id = ?',
      [noteId]
    );

    // insert new
    for (const item of checklist) {
      await db.query(
        `INSERT INTO checklist_items
         (note_id, text, is_checked, is_checklist, item_order)
         VALUES (?, ?, ?, ?, ?)`,
        [
          noteId,
          item.text,
          item.isChecked ?? false,
          item.isChecklist ?? true,
          item.order ?? 0
        ]
      );
    }
  }

  static async findByIdFull(id) {
    const note = await this.findById(id);
    if (!note) return null;

    const checklist = await this.getChecklist(id);

    return {
      id: note.id.toString(),
      title: note.title,
      content: note.description, // mapping for Kotlin
      folderId: note.folder_id ? note.folder_id.toString() : null,
      createdAt: note.created_at,
      updatedAt: note.updated_at,
      colorLong: note.color_long,
      isPinned: !!note.is_pinned,
      isLocked: !!note.is_locked,
      checklist
    };
  }
}

module.exports = Note;
