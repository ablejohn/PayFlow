// src/shared/utils/pagination.js

/**
 * Parse and validate pagination params from query string.
 * Always enforces a max limit to prevent abuse.
 *
 * Usage in controller:
 *   const { limit, offset, page } = parsePagination(req.query);
 *   const rows = await db.query('SELECT * FROM invoices LIMIT $1 OFFSET $2', [limit, offset]);
 *   res.json(paginatedResponse(rows, total, { limit, page }));
 */

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;

const parsePagination = (query = {}) => {
  const page  = Math.max(1, parseInt(query.page  || 1,            10));
  const limit = Math.min(MAX_LIMIT, parseInt(query.limit || DEFAULT_LIMIT, 10));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
};

const paginatedResponse = (data, total, { limit, page }) => ({
  data,
  meta: {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    hasNextPage: page * limit < total,
  },
});

module.exports = { parsePagination, paginatedResponse };
