/**
 * Validation rules for TeamForge AI authentication endpoints.
 */

const { body } = require('express-validator');

const registerValidator = [
    body('name')
        .trim()
        .notEmpty()
        .withMessage('Name is required.')
        .isLength({ min: 2, max: 100 })
        .withMessage('Name must contain between 2 and 100 characters.'),

    body('email')
        .trim()
        .notEmpty()
        .withMessage('Email is required.')
        .isEmail()
        .withMessage('A valid email address is required.')
        .normalizeEmail(),

    body('password')
        .isString()
        .isLength({ min: 8, max: 128 })
        .withMessage('Password must contain between 8 and 128 characters.')
        .matches(/[A-Z]/)
        .withMessage('Password must contain an uppercase letter.')
        .matches(/[a-z]/)
        .withMessage('Password must contain a lowercase letter.')
        .matches(/[0-9]/)
        .withMessage('Password must contain a number.')
];

const loginValidator = [
    body('email')
        .trim()
        .isEmail()
        .withMessage('A valid email address is required.')
        .normalizeEmail(),

    body('password')
        .notEmpty()
        .withMessage('Password is required.')
];

module.exports = {
    registerValidator,
    loginValidator,
};
