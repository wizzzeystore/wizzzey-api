import morgan from 'morgan';
import { stream } from '../utils/logger.ut.js';

// Custom token for request body
morgan.token('body', (req) => JSON.stringify(req.body));

// Custom token for response body
morgan.token('response-body', (req, res) => {
  if (res.locals.responseBody) {
    return JSON.stringify(res.locals.responseBody);
  }
  return '';
});

// Custom token for user info
morgan.token('user', (req) => {
  if (req.user) {
    return req.user.email || req.user.id;
  }
  return 'anonymous';
});

// Custom token for request duration
morgan.token('response-time-ms', (req, res) => {
  if (!res._header || !req._startAt) return '';
  const diff = process.hrtime(req._startAt);
  const ms = diff[0] * 1e3 + diff[1] * 1e-6;
  return ms.toFixed(2);
});

// Create custom format
const requestFormat = ':remote-addr - :user [:date[clf]] ":method :url HTTP/:http-version" :status :response-time-ms ms - :res[content-length] ":referrer" ":user-agent" :body :response-body';

// Create the middleware
const requestLogger = morgan(requestFormat, { stream });

export default requestLogger;