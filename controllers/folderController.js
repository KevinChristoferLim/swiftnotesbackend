const Folder = require('../models/Folder');

const createFolder = async (req, res) => {
  try {
    const { name, tag } = req.body;
    const userId = req.user.userId;

    if (!name) {
      return res.status(400).json({ message: 'Folder name is required' });
    }

    // Associate folder with creating user
    const folderId = await Folder.create({ name, tag, user_id: userId });

    res.status(201).json({
      message: 'Folder created successfully',
      folderId
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getAllFolders = async (req, res) => {
  try {
    const userId = req.user.userId;
    const folders = await Folder.findAll(userId);
    res.json({ folders });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getFolderById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const folder = await Folder.findById(id);

    if (!folder) {
      return res.status(404).json({ message: 'Folder not found' });
    }

    // Ensure the folder belongs to the current user
    if (folder.user_id !== userId) {
      return res.status(403).json({ message: 'You do not have access to this folder' });
    }

    res.json({ folder });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const updateFolder = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, tag, notes_amount  } = req.body;
    const userId = req.user.userId;

    const folder = await Folder.findById(id);
    if (!folder) {
      return res.status(404).json({ message: 'Folder not found' });
    }

    // Only owner may update
    if (folder.user_id !== userId) {
      return res.status(403).json({ message: 'Only folder owner may update' });
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (tag !== undefined) updateData.tag = tag;
    if (notes_amount !== undefined) updateData.notes_amount = notes_amount;

    await Folder.update(id, updateData);

    res.json({ message: 'Folder updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const deleteFolder = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const folder = await Folder.findById(id);
    if (!folder) {
      return res.status(404).json({ message: 'Folder not found' });
    }

    if (folder.user_id !== userId) {
      return res.status(403).json({ message: 'Only folder owner may delete' });
    }

    await Folder.delete(id);

    res.json({ message: 'Folder deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  createFolder,
  getAllFolders,
  getFolderById,
  updateFolder,
  deleteFolder
};
