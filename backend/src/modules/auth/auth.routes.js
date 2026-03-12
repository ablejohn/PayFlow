// src/modules/auth/auth.routes.js

const router = require('express').Router();
const { registerController, loginController, meController } = require('./auth.controller');
const { protect } = require('./auth.middleware');
const tenantContext = require('../../shared/middleware/tenantContext');
const { validate, registerSchema, loginSchema } = require('../../shared/validators/schemas');
const { authLimiter } = require('../../shared/middleware/rateLimiter');

// Public routes (rate limited to prevent brute force)
router.post('/register', authLimiter, validate(registerSchema), registerController);
router.post('/login',    authLimiter, validate(loginSchema),    loginController);

// Protected — returns current user + tenant info
router.get('/me', protect, tenantContext, meController);

module.exports = router;
