#!/usr/bin/env node

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get the absolute path to the built server
const serverPath = join(__dirname, 'build', 'index.js');

console.log(serverPath);