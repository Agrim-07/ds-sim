import { unauthorized } from '../errors.js';

export function requireUser(context) {
  if (!context.user) throw unauthorized();
  return context.user;
}
