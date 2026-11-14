import { badRequest } from '../errors.js';

const USERNAME = /^[A-Za-z0-9_]{3,24}$/;
const MISSION_ID = /^[a-z0-9-]{1,40}$/;
const SESSION_ID = /^[A-Za-z0-9_-]{8,40}$/;
const STRUCTURE = /^[a-z][a-z-]{1,29}$/;
const OPERATION = /^[A-Za-z]{1,30}$/;
const WORD_ARG = /^[a-z]{1,12}$/;
const LABEL = /^[A-Za-z0-9 :'.,-]{0,60}$/;
const THEMES = ['system', 'light', 'dark'];

export const LIMITS = Object.freeze({
  passwordMin: 8,
  passwordMax: 128,
  missions: 100,
  maxXp: 1_000_000,
  args: 3,
  numericArg: 9999,
  historySessions: 50,
  opsPerSession: 200,
});

const isPlainObject = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);

function fail(message) {
  throw badRequest(message);
}

export function validateCredentials(input, { forSignIn = false } = {}) {
  if (!isPlainObject(input)) fail('Username and password are required.');
  const { username, password } = input;
  if (typeof username !== 'string' || typeof password !== 'string') fail('Username and password are required.');

  if (forSignIn) {
    if (username.length > 24 || password.length > LIMITS.passwordMax) fail('Invalid username or password.');
    return { username, password };
  }

  if (!USERNAME.test(username)) {
    fail('Usernames are 3-24 characters long and use only letters, digits and underscores.');
  }
  if (password.length < LIMITS.passwordMin || password.length > LIMITS.passwordMax) {
    fail(`Passwords must be ${LIMITS.passwordMin}-${LIMITS.passwordMax} characters long.`);
  }
  if (password.toLowerCase().includes(username.toLowerCase())) {
    fail('Your password must not contain your username.');
  }
  return { username, password };
}

export function validateSettings(input = {}) {
  if (!isPlainObject(input)) fail('settings must be an object.');
  const theme = input.theme ?? 'system';
  const sound = input.sound ?? true;
  if (!THEMES.includes(theme)) fail(`theme must be one of: ${THEMES.join(', ')}.`);
  if (typeof sound !== 'boolean') fail('sound must be true or false.');
  return { theme, sound };
}

export function validateProgress(input) {
  if (!isPlainObject(input)) fail('Progress must be an object.');
  const { xp, completed } = input;
  if (!Number.isInteger(xp) || xp < 0 || xp > LIMITS.maxXp) fail('xp must be a non-negative whole number.');
  if (!Array.isArray(completed) || completed.length > LIMITS.missions) fail('completed must be a list of missions.');

  const seen = new Set();
  const missions = completed.map((entry) => {
    if (!isPlainObject(entry) || typeof entry.id !== 'string' || !MISSION_ID.test(entry.id)) fail('Invalid mission id.');
    if (seen.has(entry.id)) fail(`Mission "${entry.id}" is listed twice.`);
    if (!Number.isInteger(entry.stars) || entry.stars < 1 || entry.stars > 3) fail('stars must be 1, 2 or 3.');
    if (!Number.isFinite(entry.at) || entry.at < 0) fail('Invalid completion time.');
    seen.add(entry.id);
    return { id: entry.id, stars: entry.stars, at: Math.floor(entry.at) };
  });

  return { xp, completed: missions, settings: validateSettings(input.settings) };
}

export function validateHistoryEntry(input) {
  if (!isPlainObject(input)) fail('History entry must be an object.');
  const { sessionId, structure, op, args = [], label = '' } = input;
  if (typeof sessionId !== 'string' || !SESSION_ID.test(sessionId)) fail('Invalid session id.');
  if (typeof structure !== 'string' || !STRUCTURE.test(structure)) fail('Invalid structure name.');
  if (typeof op !== 'string' || !OPERATION.test(op)) fail('Invalid operation name.');
  if (typeof label !== 'string' || !LABEL.test(label)) fail('Invalid label.');
  if (!Array.isArray(args) || args.length > LIMITS.args) fail('Invalid operation arguments.');
  for (const arg of args) {
    const isNumber = Number.isInteger(arg) && Math.abs(arg) <= LIMITS.numericArg;
    const isWord = typeof arg === 'string' && WORD_ARG.test(arg);
    if (!isNumber && !isWord) fail('Invalid operation arguments.');
  }
  return { sessionId, structure, op, args: [...args], label };
}
