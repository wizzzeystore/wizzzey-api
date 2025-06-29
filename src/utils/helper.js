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