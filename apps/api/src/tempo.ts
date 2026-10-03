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
