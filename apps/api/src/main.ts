import { lerConfig } from './config';
import { carregarConteudo, importarConteudo } from './conteudo';
import { abrirBanco, um } from './db';
import { criarApp } from './app';
import { criarUsuario } from './servicos/auth';

const config = lerConfig();
const db = abrirBanco(config.bancoCaminho);

// Conteúdo sempre sincronizado com o git ao subir.
const { conteudo, problemas } = carregarConteudo(config.conteudoDir);
for (const p of problemas) console.warn(`[conteúdo] ${p.arquivo}: ${p.mensagem}`);
const r = importarConteudo(db, conteudo);
console.log(`[conteúdo] ${r.modulos} módulos, ${r.topicos} tópicos, ${r.questoes} questões`);

const { app, ctx } = await criarApp({ db, config, log: config.producao });

if (!config.producao && !um(db, 'SELECT id FROM usuario LIMIT 1')) {
  await criarUsuario(ctx, 'matheus', 'forja1234');
  console.log('[dev] usuário criado: matheus / forja1234  (troque com npm run criar-usuario)');
}
if (config.fatorTempo > 1) console.log(`[dev] FATOR DE TEMPO ×${config.fatorTempo}: cada segundo estudado conta ${config.fatorTempo}`);

await app.listen({ host: config.host, port: config.porta });
console.log(`Forja M&H — API em http://${config.host}:${config.porta}`);
