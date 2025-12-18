require('dotenv').config();
const db = require('../config/database');

async function addColumns() {
  try {
    const dbName = process.env.DB_NAME;

    const [rowsIsLocked] = await db.query(
      `SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'notes' AND COLUMN_NAME = 'is_locked'`,
      [dbName]
    );
    const [rowsLockPin] = await db.query(
      `SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'notes' AND COLUMN_NAME = 'lock_pin'`,
      [dbName]
    );

    if (rowsIsLocked[0].cnt === 0) {
      console.log('Adding column is_locked...');
      await db.query("ALTER TABLE notes ADD COLUMN is_locked TINYINT(1) DEFAULT 0;");
      console.log('Added is_locked');
    } else {
      console.log('Column is_locked already exists');
    }

    if (rowsLockPin[0].cnt === 0) {
      console.log('Adding column lock_pin...');
      await db.query("ALTER TABLE notes ADD COLUMN lock_pin VARCHAR(255) DEFAULT NULL;");
      console.log('Added lock_pin');
    } else {
      console.log('Column lock_pin already exists');
    }

    console.log('Migration completed.');
    process.exit(0);
  } catch (err) {
    console.error('Migration error:', err.stack || err.message);
    process.exit(1);
  }
}

addColumns();
