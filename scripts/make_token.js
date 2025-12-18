require('dotenv').config();
const jwt = require('jsonwebtoken');

const [userId] = process.argv.slice(2);
if (!userId) {
  console.error('Usage: node scripts/make_token.js <userId>');
  process.exit(1);
}

const secret = process.env.JWT_SECRET;
const token = jwt.sign({ userId: parseInt(userId) }, secret, { expiresIn: '7d' });
console.log(token);
