export class ErroApp extends Error {
  constructor(
    readonly status: number,
    readonly codigo: string,
    mensagem: string,
    readonly extra?: Record<string, unknown>,
  ) {
    super(mensagem);
  }
}

export const naoEncontrado = (o: string) => new ErroApp(404, 'nao_encontrado', `${o} não encontrado.`);
