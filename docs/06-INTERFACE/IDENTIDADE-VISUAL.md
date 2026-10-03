# Identidade visual

## Estilo
Pixel art 16-bit, câmera lateral, paleta limitada por região. Inspiração:
mapas lineares de RPG clássico. Boneco 32×32 px, inimigos 32–48 px, chefes
96–128 px.

## Tipografia
| Uso | Fonte |
|---|---|
| Títulos, nomes de inimigos, números do HUD | Press Start 2P (ou Silkscreen) |
| Texto de estudo, enunciados, painel | Inter, 16–18 px |
| Código e fórmulas | JetBrains Mono |

## Cores
Tokens CSS com tema claro e escuro (escuro como padrão).

| Token | Escuro | Uso |
|---|---|---|
| `--fundo` | `#14161c` | Fundo |
| `--superficie` | `#1f2330` | Painéis |
| `--texto` | `#e8e6e3` | Texto |
| `--destaque` | `#f5a524` | Botão principal, XP (cor da forja) |
| `--sucesso` | `#3ecf8e` | Vitória, acerto |
| `--erro` | `#ff5c5c` | Derrota, erro (sempre com ícone ✔/✘) |
| `--energia` | `#5cc8ff` | Energia |
| `--vida` | `#e5484d` | Barra de vida (com número, nunca só cor) |

Cores de trilha: ver [TRILHAS.md](../03-CURRICULO/TRILHAS.md).

## Regiões
| Ato | Região | Paleta |
|---|---|---|
| A0 | Vila da Forja | marrom, laranja de brasa |
| A1 | Floresta dos Microcontroladores | verdes, azul de LED |
| A2 | Cordilheira das Placas | verde de máscara de solda, cobre |
| A3 | Cidade SMT | cinza metálico, prata de estanho |
| A4 | Porto dos Produtos | azul-marinho, branco |
| A5 | Fábrica Fumegante | ferrugem, amarelo de alerta |
| A6 | Torres de Silício | roxo, reflexo de wafer |
| A7 | Abismo dos Sensores | ciano, preto profundo |

## Assets
Começar com packs livres (licença CC0/CC-BY, registrar em FONTES.md) e
substituir aos poucos. Nada de arte final no MVP: retângulos coloridos com
nome bastam para validar a mecânica.
