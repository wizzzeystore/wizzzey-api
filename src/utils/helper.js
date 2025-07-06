/**
 * Parses a value that may be a stringified array, an array of stringified objects, or already an array of objects.
 * @param {any} value - The value to parse.
 * @param {function} [onError] - Optional error handler. If not provided, throws an error on invalid format.
 * @returns {any[]} - The parsed array of objects.
 */
export function parsePossiblyStringifiedArray(value, onError) {
  let parsed = value;
  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value);
    } catch (e) {
      if (onError) return onError('Invalid format. Must be an array of objects or valid JSON string.');
      throw new Error('Invalid format. Must be an array of objects or valid JSON string.');
    }
  }
  if (Array.isArray(parsed)) {
    try {
      parsed = parsed.map(item => {
        if (typeof item === 'string') {
          return JSON.parse(item);
        }
        return item;
      });
    } catch (e) {
      if (onError) return onError('Invalid format. Each item must be an object or a valid JSON string.');
      throw new Error('Invalid format. Each item must be an object or a valid JSON string.');
    }
  }
  return parsed;
}

/**
 * Get the correct protocol (http/https) from the request
 * Handles cases where the app is behind a proxy
 * @param {Object} req - Express request object
 * @returns {string} - 'http' or 'https'
 */
export const getProtocol = (req) => {
  // Check for forwarded protocol headers (common with proxies)
  const forwardedProto = req.headers['x-forwarded-proto'];
  if (forwardedProto) {
    return forwardedProto.split(',')[0].trim();
  }
  
  // Check for other common proxy headers
  const forwardedProtocol = req.headers['x-forwarded-protocol'];
  if (forwardedProtocol) {
    return forwardedProtocol.split(',')[0].trim();
  }
  
  // Check for Cloudflare headers
  const cfVisitingScheme = req.headers['cf-visitor'];
  if (cfVisitingScheme) {
    try {
      const cfVisitor = JSON.parse(cfVisitingScheme);
      return cfVisitor.scheme || req.protocol;
    } catch (e) {
      // If parsing fails, fall back to req.protocol
    }
  }
  
  // Check for secure connection
  if (req.secure) {
    return 'https';
  }
  
  // Fall back to req.protocol
  return req.protocol;
};

/**
 * Get the complete base URL with correct protocol
 * @param {Object} req - Express request object
 * @returns {string} - Complete base URL (e.g., 'https://example.com')
 */
export const getBaseUrl = (req) => {
  const protocol = getProtocol(req);
  const host = req.get('host');
  return `${protocol}://${host}`;
};