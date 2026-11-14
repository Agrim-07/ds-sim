export function createLogger({ stream = process.stdout, silent = false } = {}) {
  const write = (level, message, fields = {}) => {
    if (silent) return;
    const entry = { time: new Date().toISOString(), level, message, ...fields };
    stream.write(`${JSON.stringify(entry)}\n`);
  };

  return {
    info: (message, fields) => write('info', message, fields),
    warn: (message, fields) => write('warn', message, fields),
    error: (message, fields) => write('error', message, fields),
  };
}
