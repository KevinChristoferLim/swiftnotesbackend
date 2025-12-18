require('dotenv').config();
const fetch = global.fetch || require('node-fetch');

const [noteId, token, pin] = process.argv.slice(2);
if (!noteId || !token || !pin) {
  console.error('Usage: node scripts/post_lock_request.js <noteId> <token> <pin>');
  process.exit(1);
}

(async () => {
  try {
    const res = await fetch(`http://localhost:${process.env.PORT || 3000}/api/notes/${noteId}/lock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ pin })
    });
    const text = await res.text();
    console.log('Status:', res.status);
    console.log('Body:', text);
  } catch (err) {
    console.error('Request error', err);
  }
})();
