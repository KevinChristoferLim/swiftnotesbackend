const db = require('../config/database');

class Folder {


  static async create(folderData) {
    const [result] = await db.query(
      'INSERT INTO folders (name, tag, notes_amount, color, color_long) VALUES (?, ?, ?, ?, ?)',
      [
        folderData.name,
        folderData.tag || null,
        folderData.notes_amount || 0,
        folderData.color || null,
        folderData.colorLong ?? null
      ]
    );
    return result.insertId;
  }

  static async findById(id) {
    const [rows] = await db.query(
      'SELECT * FROM folders WHERE id = ?',
      [id]
    );
    return rows[0];
  }

  static async findAll() {
    const [rows] = await db.query('SELECT * FROM folders');
    return rows;
  }

  static async update(id, folderData) {
    const fields = [];
    const values = [];

    if (folderData.name !== undefined) {
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

    if (folderData.colorLong !== undefined) {
      fields.push('color_long = ?');
      values.push(folderData.colorLong);
    }

    values.push(id);

    const [result] = await db.query(
      `UPDATE folders SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    return result.affectedRows;
  }

  static async delete(id) {
    const [result] = await db.query(
      'DELETE FROM folders WHERE id = ?',
      [id]
    );
    return result.affectedRows;
  }

  static async incrementNotesAmount(id) {
    await db.query(
      'UPDATE folders SET notes_amount = notes_amount + 1 WHERE id = ?',
      [id]
    );
  }

  static async decrementNotesAmount(id) {
    await db.query(
      'UPDATE folders SET notes_amount = notes_amount - 1 WHERE id = ? AND notes_amount > 0',
      [id]
    );
  }

  // =====================
  // ADDITIVE METHODS FOR KOTLIN SUPPORT
  // =====================

  /**
   * Returns folders mapped exactly to Kotlin Folder model
   */
  static async findAllForKotlin() {
    const [folders] = await db.query('SELECT * FROM folders');

    return folders.map(f => ({
      id: f.id.toString(),
      title: f.name, // Kotlin: title
      tag: f.tag ?? "",
      colorLong: f.color_long ?? f.color ?? 4283192319,
      noteIds: [] // derived client-side or via notes query
    }));
  }

  /**
   * Returns a single folder with noteIds populated
   */
  static async findByIdForKotlin(id) {
    const [folders] = await db.query(
      'SELECT * FROM folders WHERE id = ?',
      [id]
    );

    if (!folders.length) return null;

    const folder = folders[0];

    const [notes] = await db.query(
      'SELECT id FROM notes WHERE folder_id = ?',
      [id]
    );

    return {
      id: folder.id.toString(),
      title: folder.name,
      tag: folder.tag ?? "",
      colorLong: folder.color_long ?? folder.color ?? 4283192319,
      noteIds: notes.map(n => n.id.toString())
    };
  }
}

module.exports = Folder;
