import os from 'node:os';
import path from 'node:path';

process.env.NODE_ENV = 'test';
process.env.WISDOM_DB_PATH =
  process.env.WISDOM_DB_PATH ||
  path.join(os.tmpdir(), `wisdom-academy-test-${process.pid}-${Date.now()}.db`);
process.env.CODE_HASH_PEPPER = 'test-only-code-pepper-32-bytes-minimum';
process.env.WISDOM_RATE_LIMIT_SALT = 'test-only-rate-limit-salt';
process.env.APP_URL = 'http://127.0.0.1:3100';
