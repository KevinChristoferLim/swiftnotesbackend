const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const multer = require('multer');

// Store uploads in ./uploads (ensure this folder exists)
const upload = multer({ dest: 'uploads/' });

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// PUT /api/auth/update-profile
// Expects multipart/form-data with optional `image` file and `username` / `email` fields
router.put('/update-profile', authMiddleware, upload.single('image'), authController.updateProfile);

// PUT /api/auth/change-password
// Expects JSON body: { currentPassword, newPassword }
router.put('/change-password', authMiddleware, authController.changePassword);

module.exports = router;
