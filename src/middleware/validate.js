/**
 * Converts express-validator validation results into a
 * consistent HTTP 400 response.
 */

const { validationResult } = require('express-validator');

function validate(req, res, next) {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({
            status: 'error',
            message: 'Request validation failed.',
            errors: errors.array().map((error) => ({
                field: error.path,
                message: error.msg,
            })),
        });
    }

    next();
}

module.exports = validate;
