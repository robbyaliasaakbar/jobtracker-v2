import { describe, test, expect } from 'vitest';
import { AUTH_BASE, API_BASE } from './config.js';

// Di test (node) tidak ada `location` dan tidak ada .env -> fallback mode lokal.
describe('basis URL', () => {
  test('fallback lokal memakai port booking PRD (auth 7002, API 7012)', () => {
    expect(AUTH_BASE).toBe('http://localhost:7002');
    expect(API_BASE).toBe('http://localhost:7012');
  });
});
