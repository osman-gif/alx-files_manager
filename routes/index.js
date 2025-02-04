const router = require('express').Router();
const AppController = require('../controllers/AppController');
const UsersController = require('../controllers/UsersController');
const AuthController = require('../controllers/AuthController')
const FilesController = require('../controllers/FilesController')

router.get('/status', AppController.getStatus);
router.get('/stats', AppController.getStats);
router.post('/users', UsersController.postNew);
router.get('/connect', AuthController.getConnect)
router.get('/disconnect', AuthController.getDisconnect)
router.get('/users/me', UsersController.getMe)
router.post('files', FilesController.postUpload)
router.post('files/:id', FilesController.getShow)
router.post('files', FilesController.getIndex)

module.exports = router;