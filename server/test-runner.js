#!/usr/bin/env node
/* Test runner sets NODE_ENV and runs the local Jest CLI so tests work cross-platform */
process.env.NODE_ENV = 'test';
import { spawnSync } from 'child_process';
import path from 'path';

// Use npx and set NODE_OPTIONS so child Node runs with experimental vm modules
const res = spawnSync('npx', ['jest', '--runInBand', '--verbose'], { stdio: 'inherit', env: { ...process.env, NODE_OPTIONS: '--experimental-vm-modules' } });
process.exit(res.status || 0);
