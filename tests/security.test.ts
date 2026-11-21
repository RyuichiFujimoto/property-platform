import { test, expect } from 'vitest';
import { serializeJsonLd } from '../lib/seo/json-ld';
import { postgresSslOption } from '../lib/db/ssl.js';

test('serializeJsonLd escapes script-breaking characters', () => {
  const out = serializeJsonLd({ name: '</script><img src=x onerror=alert(1)>' });
  expect(out).not.toContain('</script>');
  expect(out).not.toContain('<');
  expect(JSON.parse(out).name).toBe('</script><img src=x onerror=alert(1)>');
});

test('postgres TLS is verified for remote hosts', () => {
  expect(postgresSslOption('postgresql://u:p@db.example.com:5432/postgres')).toBe(
    'verify-full'
  );
  expect(postgresSslOption('postgresql://u:p@localhost:54322/postgres')).toBe(false);
});
