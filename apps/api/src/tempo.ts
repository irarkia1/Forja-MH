// Datas no fuso do usuário (o "dia" de uma revisão é o dia dele, não o UTC).

export function inicioDoDia(agora: Date, fuso: string): Date {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: fuso, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  })
    .formatToParts(agora)
    .reduce<Record<string, string>>((o, p) => ((o[p.type] = p.value), o), {});
  const decorrido = (Number(partes.hour) * 3600 + Number(partes.minute) * 60 + Number(partes.second)) * 1000;
  return new Date(agora.getTime() - decorrido - agora.getMilliseconds());
}

export const DIA_MS = 86_400_000;

// Segunda-feira 00:00 (no fuso do usuário) da semana de `d`.
export function inicioDaSemana(d: Date, fuso: string): Date {
  const dia = inicioDoDia(d, fuso);
  const nome = new Intl.DateTimeFormat('en-US', { timeZone: fuso, weekday: 'short' }).format(d);
  const recuo = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(nome);
  return new Date(dia.getTime() - Math.max(0, recuo) * DIA_MS);
}
