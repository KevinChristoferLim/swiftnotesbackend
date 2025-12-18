// Run with: node scripts/add_folder_userid.js
const db = require('../config/database');

(async function() {
  try {
    // Check if column exists
    const [rows] = await db.query("SHOW COLUMNS FROM folders LIKE 'user_id'");
    if (rows.length === 0) {
      console.log('Adding user_id column to folders table...');
      await db.query('ALTER TABLE folders ADD COLUMN user_id INT NULL AFTER id');
      console.log('Done. Be sure to backfill data or set the correct values.');
    } else {
      console.log('user_id column already exists; nothing to do.');
    }
    process.exit(0);
  } catch (e) {
    console.error('Error while altering folders table:', e.message);
    process.exit(1);
  }
})();