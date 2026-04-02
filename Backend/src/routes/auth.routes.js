const { Router } = require('express')
const authController = require('../controllers/auth.controller')
const authMiddleware = require('../middleware/auth.middleware');

const authRouter = Router();

/** 
 * @route POST /api/auth/register 
 * @description Register a new user
 * @access Public
 */
authRouter.post('/register', authController.registerUserController)

/**
 * @route POST /api/auth/login 
 * @description Login a user
 * @access Public
 */
authRouter.post('/login', authController.loginUserController)

/**
 * @route GET /api/auth/logout 
 * @description Logout a user by blacklisting the token
 * @access Private
 */

authRouter.get('/logout', authController.logoutUserController)

/**
 * @route GET /api/auth/getme 
 * @description Get the currently logged in user's details, expects token in the request header
 * @access Private
 */
authRouter.get('/get-me', authMiddleware.authUser, authController.getMeController)

module.exports = authRouter;