// Sobe API (tsx watch) e front (Vite) juntos. Ctrl+C derruba os dois.
import { spawn } from 'node:child_process';

const filhos = [
  spawn('npm', ['run', 'dev:api'], { stdio: 'inherit', env: { ...process.env, FORJA_FATOR_TEMPO: process.env.FORJA_FATOR_TEMPO ?? '1' } }),
  spawn('npm', ['run', 'dev:web'], { stdio: 'inherit' }),
];
const parar = () => filhos.forEach((f) => f.kill('SIGTERM'));
process.on('SIGINT', parar);
process.on('SIGTERM', parar);
filhos.forEach((f) => f.on('exit', (c) => { if (c) parar(); }));
