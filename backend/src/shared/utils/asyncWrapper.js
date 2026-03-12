// src/shared/utils/asyncWrapper.js
// Wraps async route handlers so errors automatically go to Express error middleware.
// Without this, unhandled promise rejections in controllers would crash the process.
//
// Usage:
//   router.get('/example', asyncWrapper(async (req, res) => {
//     const data = await someService.getData();
//     res.json(data);
//   }));

const asyncWrapper = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncWrapper;
