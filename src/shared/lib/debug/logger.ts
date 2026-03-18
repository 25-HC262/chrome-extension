type LogLevel = 'debug' | 'info' | 'warn' | 'error'

function isDebugEnabled(): boolean {
  try {
    return localStorage.getItem('st_debug') === '1' || (globalThis as any).__ST_DEBUG__ === true
  } catch {
    return (globalThis as any).__ST_DEBUG__ === true
  }
}

function log(level: LogLevel, ...args: unknown[]) {
  if (!isDebugEnabled() && level === 'debug') return
  const prefix = '[sign-translator]'
  const fn = console[level] ?? console.log
  fn(prefix, ...args)
}

// 확장 프로그램 디버깅 로그를 남깁니다.
// `localStorage.st_debug=1`일 때 debug 로그가 활성화됩니다.
export const logger = {
  debug: (...args: unknown[]) => log('debug', ...args),
  info: (...args: unknown[]) => log('info', ...args),
  warn: (...args: unknown[]) => log('warn', ...args),
  error: (...args: unknown[]) => log('error', ...args),
}

