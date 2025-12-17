const express = require('express');
const router = express.Router();
const folderController = require('../controllers/folderController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/', authMiddleware, folderController.createFolder);
router.get('/', authMiddleware, folderController.getAllFolders);
router.get('/:id', authMiddleware, folderController.getFolderById);
router.put('/:id', authMiddleware, folderController.updateFolder);
router.delete('/:id', authMiddleware, folderController.deleteFolder);

module.exports = router;
