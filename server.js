const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const folderRoutes = require('./routes/folderRoutes');
const noteRoutes = require('./routes/noteRoutes');
const collaboratorRoutes = require('./routes/collaboratorRoutes');

console.log('✅ Routes loaded:', {
  auth: !!authRoutes,
  user: !!userRoutes,
  folder: !!folderRoutes,
  note: !!noteRoutes,
  collaborator: !!collaboratorRoutes
});

const path = require('path');
const app = express();

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/folders', folderRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api', collaboratorRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'Welcome to SwiftNotes API' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});