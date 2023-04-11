
const express = require('express')
const router = express.Router()
const User = require('../models/user.model')
const userController = require('../controllers/users')
const isLoggedIn = require('../middleware/isLoggedin')



router.post('/signup', userController.register)
router.post('/email-verification',userController.activateAccount)
router.post('/login', userController.login)
router.post('/forgot',userController.forgot)
router.post('/otp-verification',userController.forgotActivate)
router.post('/password-change',userController.passwordChange)



router.get('/logout',userController.logout)





module.exports = router;