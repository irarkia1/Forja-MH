// Disponibilidade no mapa: módulos por pré-requisito ("A|B" = basta um),
// tópicos por `depois_de` dentro do módulo.

export function requisitoAtendido(requer: readonly string[], vencidos: ReadonlySet<string>): boolean {
  return requer.every((item) => item.split('|').some((id) => vencidos.has(id.trim())));
}

export interface TopicoGrafo {
  id: string;
  depoisDe?: readonly string[] | null;
}

// Sem `depois_de` = depende do tópico anterior; lista vazia = livre.
export function dependenciasDosTopicos(topicos: readonly TopicoGrafo[]): Map<string, string[]> {
  const deps = new Map<string, string[]>();
  topicos.forEach((t, i) => {
    if (t.depoisDe) deps.set(t.id, [...t.depoisDe]);
    else deps.set(t.id, i === 0 ? [] : [topicos[i - 1]!.id]);
  });
  return deps;
}

export function topicoDisponivel(id: string, deps: ReadonlyMap<string, string[]>, derrotados: ReadonlySet<string>): boolean {
  return (deps.get(id) ?? []).every((d) => derrotados.has(d));
}
