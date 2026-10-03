import { lerConfig } from '../apps/api/src/config';
import { carregarConteudo, importarConteudo } from '../apps/api/src/conteudo';
import { abrirBanco } from '../apps/api/src/db';

const config = lerConfig();
const { conteudo, problemas } = carregarConteudo(config.conteudoDir);
if (problemas.length) {
  for (const p of problemas) console.error(`✘ ${p.arquivo}: ${p.mensagem}`);
  process.exit(1);
}
const r = importarConteudo(abrirBanco(config.bancoCaminho), conteudo);
console.log(`✔ importado: ${r.modulos} módulos, ${r.topicos} tópicos, ${r.questoes} questões`);
