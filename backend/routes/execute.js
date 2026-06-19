import { Router } from 'express';

const router = Router();
const WANDBOX_URL = 'https://wandbox.org/api/compile.json';

/**
 * Maps Monaco language IDs to the best available Wandbox compiler.
 * Wandbox is free, needs no API key, and covers all languages we support.
 */
const WANDBOX_MAP = {
  javascript: 'nodejs-20.17.0',
  typescript: 'typescript-5.6.2',
  python:     'cpython-3.13.8',
  go:         'go-1.23.2',
  rust:       'rust-1.82.0',
  java:       'openjdk-jdk-22+36',
  cpp:        'gcc-13.2.0',
  c:          'gcc-13.2.0-c',
  csharp:     'dotnetcore-8.0.402',
  ruby:       'ruby-4.0.2',
  php:        'php-8.3.12',
  shell:      'bash',
};

router.post('/', async (req, res) => {
  const { code, language } = req.body;

  if (!code || !language) {
    return res.status(400).json({ stdout: '', stderr: 'Missing code or language.' });
  }

  const compiler = WANDBOX_MAP[language];
  if (!compiler) {
    return res.status(422).json({
      stdout: '',
      stderr: `"${language}" is not executable in this workspace.`,
      exitCode: 1,
    });
  }

  try {
    const upstream = await fetch(WANDBOX_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ compiler, code }),
      signal:  AbortSignal.timeout(20_000),
    });

    if (!upstream.ok) {
      const text = await upstream.text();
      return res.status(upstream.status).json({ stdout: '', stderr: `Compile service error: ${text}`, exitCode: 1 });
    }

    const data = await upstream.json();
    const exitCode = parseInt(data.status ?? '0', 10);

    res.json({
      stdout:   data.program_output  ?? '',
      stderr:   (data.compiler_error ?? '') + (data.program_error ?? ''),
      exitCode,
    });
  } catch (err) {
    const msg = err.name === 'TimeoutError'
      ? 'Execution timed out (20s limit).'
      : `Execution service unreachable: ${err.message}`;
    res.status(502).json({ stdout: '', stderr: msg, exitCode: 1 });
  }
});

export default router;
