const db = require('../config/database');

class Folder {
  static async create(folderData) {
    // folderData may include user_id (owner)
    const [result] = await db.query(
      'INSERT INTO folders (name, tag, notes_amount, color, user_id) VALUES (?, ?, ?, ?, ?)',
      [folderData.name, folderData.tag || null, folderData.notes_amount || 0, folderData.color || null, folderData.user_id || null]
    );
    return result.insertId;
  }

  static async findById(id) {
    const [rows] = await db.query('SELECT * FROM folders WHERE id = ?', [id]);
    return rows[0];
  }

  static async findAll(userId = null) {
    if (userId) {
      const [rows] = await db.query('SELECT * FROM folders WHERE user_id = ?', [userId]);
      return rows;
    }
    const [rows] = await db.query('SELECT * FROM folders');
    return rows;
  }

  static async update(id, folderData) {
    const fields = [];
    const values = [];

    if (folderData.name) {
      fields.push('name = ?');
      values.push(folderData.name);
    }
    if (folderData.tag !== undefined) {
      fields.push('tag = ?');
      values.push(folderData.tag);
    }
    if (folderData.notes_amount !== undefined) {
      fields.push('notes_amount = ?');
      values.push(folderData.notes_amount);
    }
    if (folderData.color !== undefined) {
      fields.push('color = ?');
      values.push(folderData.color);
    }

    values.push(id);

    const [result] = await db.query(
      `UPDATE folders SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
    return result.affectedRows;
  }

  static async delete(id) {
    const [result] = await db.query('DELETE FROM folders WHERE id = ?', [id]);
    return result.affectedRows;
  }

  static async incrementNotesAmount(id) {
    await db.query('UPDATE folders SET notes_amount = notes_amount + 1 WHERE id = ?', [id]);
  }

  static async decrementNotesAmount(id) {
    await db.query('UPDATE folders SET notes_amount = notes_amount - 1 WHERE id = ? AND notes_amount > 0', [id]);
  }
}

module.exports = Folder;