/**
 * TeamForge AI authentication routes.
 */

const express = require('express');

const authController = require('../controllers/auth.controller');
const authenticate = require('../middleware/authenticate');

const {
    registerValidator,
    loginValidator,
} = require('../validators/auth.validator');

const validate = require('../middleware/validate');

const router = express.Router();

router.post(
    '/register',
    registerValidator,
    validate,
    authController.register
);

router.post(
    '/login',
    loginValidator,
    validate,
    authController.login
);

router.get(
    '/me',
    authenticate,
    authController.getCurrentUser
);

module.exports = router;
