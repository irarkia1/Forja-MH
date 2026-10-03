import { api, type Eu } from './api';

// Estado global mínimo: o "eu" (personagem, luta em curso) e quem ouve mudanças.
let atual: Eu | null = null;
const ouvintes = new Set<(eu: Eu) => void>();
export let fatorTempo = 1;

export function eu(): Eu | null {
  return atual;
}

export async function recarregarEu(): Promise<Eu> {
  atual = await api.get<Eu>('eu');
  fatorTempo = atual.dev?.fatorTempo ?? 1;
  ouvintes.forEach((f) => f(atual!));
  return atual;
}

export function aoMudarEu(f: (eu: Eu) => void): () => void {
  ouvintes.add(f);
  return () => ouvintes.delete(f);
}
