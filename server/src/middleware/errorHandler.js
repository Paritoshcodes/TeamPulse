/**
 * Global error handling: 404 and generic error handler
 */
export function notFound(req, res, next) {
  res.status(404).json({ success: false, message: 'Route not found' });
}

export function errorHandler(err, req, res, next) {
  const status = err.statusCode || 500;
  const message = err.message || 'Internal server error';
  if (status === 500) console.error('[Error]', err);
  res.status(status).json({ success: false, message });
}
