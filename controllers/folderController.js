const Folder = require('../models/Folder');

const createFolder = async (req, res) => {
  try {
    const { name, tag } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Folder name is required' });
    }

    const folderId = await Folder.create({ name, tag });

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
    const folders = await Folder.findAll();
    res.json({ folders });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getFolderById = async (req, res) => {
  try {
    const { id } = req.params;
    const folder = await Folder.findById(id);

    if (!folder) {
      return res.status(404).json({ message: 'Folder not found' });
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

    const folder = await Folder.findById(id);
    if (!folder) {
      return res.status(404).json({ message: 'Folder not found' });
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

    const folder = await Folder.findById(id);
    if (!folder) {
      return res.status(404).json({ message: 'Folder not found' });
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
