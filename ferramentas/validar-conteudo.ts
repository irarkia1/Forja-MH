import { lerConfig } from '../apps/api/src/config';
import { carregarConteudo } from '../apps/api/src/conteudo';

const { conteudo, problemas } = carregarConteudo(lerConfig().conteudoDir);
const q = conteudo.modulos.reduce((s, m) => s + m.questoes.length, 0);
const t = conteudo.modulos.reduce((s, m) => s + m.topicos.length, 0);
console.log(`${conteudo.atos.length} atos · ${conteudo.modulos.length} módulos · ${t} tópicos · ${q} questões`);
for (const p of problemas) console.error(`✘ ${p.arquivo}: ${p.mensagem}`);
if (problemas.length) process.exit(1);
console.log('✔ conteúdo válido');
