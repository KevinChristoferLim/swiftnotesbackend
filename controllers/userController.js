const bcrypt = require('bcryptjs');
const validator = require('validator');
const User = require('../models/User');

const getAllUsers = async (req, res) => {
  try {
    const users = await User.findAll();
    res.json({ users });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    delete user.hashed_password;
    res.json({ user });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { username, email, password, profile_picture, isActive } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const updateData = {};

    if (username) updateData.username = username;
    if (email) {
      if (!validator.isEmail(email)) {
        return res.status(400).json({ message: 'Invalid email format' });
      }
      updateData.email = email;
    }
    if (password) {
      updateData.hashed_password = await bcrypt.hash(password, 10);
    }
    if (profile_picture !== undefined) updateData.profile_picture = profile_picture;
    if (isActive !== undefined) updateData.isActive = isActive;

    await User.update(id, updateData);

    res.json({ message: 'User updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await User.delete(id);

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser
};
