// src/modules/auth/auth.controller.js

const authService = require('./auth.service');
const asyncWrapper = require('../../shared/utils/asyncWrapper');

const registerController = asyncWrapper(async (req, res) => {
  const result = await authService.register(req.body);
  res.status(201).json({ success: true, data: result });
});

const loginController = asyncWrapper(async (req, res) => {
  const result = await authService.login(req.body);
  res.json({ success: true, data: result });
});

const meController = asyncWrapper(async (req, res) => {
  // req.user is set by protect middleware, req.tenant by tenantContext
  res.json({
    success: true,
    data: {
      user:   req.user,
      tenant: req.tenant,
    },
  });
});

module.exports = { registerController, loginController, meController };
