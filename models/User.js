const db = require('../config/database');

class User {
  static async create(userData) {
    const [result] = await db.query(
      'INSERT INTO user (username, email, hashed_password, profile_picture, isActive) VALUES (?, ?, ?, ?, ?)',
      [userData.username, userData.email, userData.hashed_password, userData.profile_picture || null, userData.isActive || true]
    );
    return result.insertId;
  }

  static async findById(id) {
    const [rows] = await db.query('SELECT * FROM user WHERE id = ?', [id]);
    return rows[0];
  }

  static async findByEmail(email) {
    const [rows] = await db.query('SELECT * FROM user WHERE email = ?', [email]);
    return rows[0];
  }

  static async findAll() {
    const [rows] = await db.query('SELECT id, username, email, profile_picture, isActive FROM user');
    return rows;
  }

  static async update(id, userData) {
    const fields = [];
    const values = [];

    if (userData.username) {
      fields.push('username = ?');
      values.push(userData.username);
    }
    if (userData.email) {
      fields.push('email = ?');
      values.push(userData.email);
    }
    if (userData.hashed_password) {
      fields.push('hashed_password = ?');
      values.push(userData.hashed_password);
    }
    if (userData.profile_picture !== undefined) {
      fields.push('profile_picture = ?');
      values.push(userData.profile_picture);
    }
    if (userData.isActive !== undefined) {
      fields.push('isActive = ?');
      values.push(userData.isActive);
    }

    values.push(id);

    const [result] = await db.query(
      `UPDATE user SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
    return result.affectedRows;
  }

  static async delete(id) {
    const [result] = await db.query('DELETE FROM user WHERE id = ?', [id]);
    return result.affectedRows;
  }

  static async updateResetToken(email, token, expiry) {
    await db.query(
      'UPDATE user SET reset_token = ?, reset_token_expiry = ? WHERE email = ?',
      [token, expiry, email]
    );
  }

  static async findByResetToken(token) {
    const [rows] = await db.query(
      'SELECT * FROM user WHERE reset_token = ? AND reset_token_expiry > NOW()',
      [token]
    );
    return rows[0];
  }

  static async clearResetToken(id) {
    await db.query(
      'UPDATE user SET reset_token = NULL, reset_token_expiry = NULL WHERE id = ?',
      [id]
    );
  }
}

module.exports = User;