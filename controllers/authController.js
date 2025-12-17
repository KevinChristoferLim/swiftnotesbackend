const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const validator = require('validator');
const User = require('../models/User');
const { sendVerificationCode } = require('../utils/emailService');

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'fallback-secret-key', {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Validasi input
    if (!username || !email || !password) {
      return res.status(400).json({ 
        success: false,
        message: 'Username, email, and password are required' 
      });
    }

    if (!validator.isEmail(email)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid email format' 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        success: false,
        message: 'Password must be at least 6 characters long' 
      });
    }

    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ 
        success: false,
        message: 'Email already registered' 
      });
    }

    const hashed_password = await bcrypt.hash(password, 10);

    const userId = await User.create({
      username,
      email,
      hashed_password,
      isActive: true
    });

    const token = generateToken(userId);

    const newUser = await User.findById(userId);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: { 
        id: newUser.id, 
        username: newUser.username, 
        email: newUser.email 
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        message: 'Email and password are required' 
      });
    }

    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid credentials' 
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.hashed_password);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid credentials' 
      });
    }

    if (!user.isActive) {
      return res.status(403).json({ 
        success: false,
        message: 'Account is inactive' 
      });
    }

    const token = generateToken(user.id);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        profile_picture: user.profile_picture
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        success: false,
        message: 'Email is required' 
      });
    }

    if (!validator.isEmail(email)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid email format' 
      });
    }

    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    // Generate 6 digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Set expiry 10 minutes from now
    const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    
    // Save verification code to database
    await User.updateResetToken(email, verificationCode, expiry);

    console.log('🔑 Generated verification code for', email, ':', verificationCode);

    // Send verification code via email
    try {
      await sendVerificationCode(email, verificationCode);
      console.log('✅ Verification email sent successfully to:', email);
      
      res.json({ 
        success: true,
        message: 'Verification code sent to your email',
        email: email
      });
    } catch (emailError) {
      console.error('❌ Failed to send email:', emailError);
      
      // Rollback - hapus token dari database jika email gagal
      await User.clearResetToken(user.id);
      
      res.status(500).json({ 
        success: false,
        message: 'Failed to send verification email. Please try again.',
        error: emailError.message 
      });
    }
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
      return res.status(400).json({ 
        success: false,
        message: 'Email, verification code, and new password are required' 
      });
    }

    if (!validator.isEmail(email)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid email format' 
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        success: false,
        message: 'Password must be at least 6 characters long' 
      });
    }

    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    // Check if user has reset token
    if (!user.reset_token) {
      return res.status(400).json({ 
        success: false,
        message: 'No password reset request found. Please request a new verification code.' 
      });
    }

    // Check if code matches
    if (user.reset_token !== code) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid verification code' 
      });
    }

    // Check if code has expired
    if (!user.reset_token_expiry || new Date() > new Date(user.reset_token_expiry)) {
      await User.clearResetToken(user.id);
      return res.status(400).json({ 
        success: false,
        message: 'Verification code has expired. Please request a new code.' 
      });
    }

    // Hash new password
    const hashed_password = await bcrypt.hash(newPassword, 10);
    
    // Update password and clear reset token
    await User.update(user.id, { hashed_password });
    await User.clearResetToken(user.id);

    console.log('✅ Password reset successful for:', email);

    res.json({ 
      success: true,
      message: 'Password reset successful. You can now login with your new password.' 
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
};

const changePassword = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const { currentPassword, newPassword } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current and new passwords are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters long' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.hashed_password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Incorrect current password' });
    }

    const hashed_password = await bcrypt.hash(newPassword, 10);
    await User.update(userId, { hashed_password });

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

const updateProfile = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { username, email } = req.body;
    const file = req.file;

    // Validate email if provided
    if (email && !validator.isEmail(email)) {
      return res.status(400).json({ success: false, message: 'Invalid email format' });
    }

    // Prevent email collision with other users
    if (email) {
      const existing = await User.findByEmail(email);
      if (existing && existing.id !== userId) {
        return res.status(400).json({ success: false, message: 'Email already in use' });
      }
    }

    const updates = {};
    if (username) updates.username = username;
    if (email) updates.email = email;
    if (file) {
      // store the path that clients can fetch
      updates.profile_picture = `/uploads/${file.filename}`;
    }

    // Nothing to update
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: 'No data provided to update' });
    }

    await User.update(userId, updates);
    const updatedUser = await User.findById(userId);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        profile_picture: updatedUser.profile_picture
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

module.exports = {
  register,
  login,
  forgotPassword,
  resetPassword,
  updateProfile,
  changePassword
};