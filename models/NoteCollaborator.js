const db = require('../config/database');

class NoteCollaborator {
  static async add(noteId, userId, addedBy, role = 'editor') {
    const [result] = await db.query(
      'INSERT INTO note_collaborators (note_id, user_id, added_by, role) VALUES (?, ?, ?, ?)',
      [noteId, userId, addedBy, role]
    );
    return result.insertId;
  }

  static async findByNoteId(noteId) {
    const [rows] = await db.query(
      `SELECT u.id, u.username, u.email, u.profile_picture, nc.role, nc.added_by
       FROM note_collaborators nc 
       JOIN user u ON nc.user_id = u.id 
       WHERE nc.note_id = ?`,
      [noteId]
    );
    return rows;
  }

  static async findByUserId(userId) {
    const [rows] = await db.query(
      `SELECT nc.note_id, n.title, n.description, n.is_locked, u.username as owner_username
       FROM note_collaborators nc
       JOIN notes n ON nc.note_id = n.id
       JOIN user u ON n.owner_id = u.id
       WHERE nc.user_id = ?`,
      [userId]
    );
    return rows;
  }

  static async count(noteId) {
    const [rows] = await db.query(
      'SELECT COUNT(*) as count FROM note_collaborators WHERE note_id = ?',
      [noteId]
    );
    return rows[0].count;
  }

  static async isCollaborator(noteId, userId) {
    const [rows] = await db.query(
      'SELECT * FROM note_collaborators WHERE note_id = ? AND user_id = ?',
      [noteId, userId]
    );
    return rows.length > 0;
  }

  static async remove(noteId, userId) {
    const [result] = await db.query(
      'DELETE FROM note_collaborators WHERE note_id = ? AND user_id = ?',
      [noteId, userId]
    );
    return result.affectedRows;
  }

  static async removeAll(noteId) {
    const [result] = await db.query(
      'DELETE FROM note_collaborators WHERE note_id = ?',
      [noteId]
    );
    return result.affectedRows;
  }
}

module.exports = NoteCollaborator;
