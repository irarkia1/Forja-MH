# Pré-requisitos

Um módulo só fica **disponível** no mapa quando todos os pré-requisitos estão
**vencidos** (chefe derrotado). `A | B` = basta um dos dois.

Dentro de um módulo, os tópicos seguem a ordem do YAML por padrão; tópicos sem
dependência entre si viram **bifurcação** na linha da fase.

## A0
| Módulo | Exige |
|---|---|
| M0.1 Termos | — |
| M0.2 Matemática | M0.1 |
| M0.3 Física | M0.2 |
| M0.4 Circuitos DC | M0.1 |
| M0.5 Circuitos AC | M0.4, M0.2 |
| M0.6 C/C++ | M0.1 |
| M0.7 Ferramentas | M0.1 |

## A1
| Módulo | Exige |
|---|---|
| M1.1 Eletrônica digital | M0.2, M0.4 |
| M1.2 Primeiro MCU | M1.1, M0.6 |
| M1.3 Arquitetura | M1.1 |
| M1.4 STM32 | M1.2, M1.3 |
| M1.5 Protocolos | M1.2 |
| M1.6 ESP32 | M1.2 |
| M1.7 RTOS | M1.4 \| M1.6 |
| M1.8 Sensores e atuadores | M1.2, M0.5 |
| M1.9 Conectividade | M1.6 |
| M1.10 Aplicação e nuvem | M1.9 |
| M1.11 Energia | M1.6, M0.4 |
| M1.12 Integrador 1 | M1.7, M1.8, M1.10, M1.11 |

## A2
| Módulo | Exige |
|---|---|
| M2.1 Componentes | M0.5, M1.1 |
| M2.2 Analógica | M2.1 |
| M2.3 Potência | M2.1 |
| M2.4 Esquemático | M2.1 |
| M2.5 Layout | M2.4 |
| M2.6 SI/PI | M2.5 |
| M2.7 EMC | M2.5 |
| M2.8 Protótipos | M2.5, M0.7 |
| M2.9 Simulação e instrumentação | M2.2 |
| M2.10 Placas com MCU | M2.5, M2.3, M1.4 |
| M2.11 Integrador 2 | M2.10, M2.8, M1.12 |

## A3
| Módulo | Exige |
|---|---|
| M3.1 Tecnologia SMT | M2.8 |
| M3.2 Montagem SMT | M3.1 |
| M3.3 Multicamada | M2.6 |
| M3.4 RF | M2.6, M1.9 |
| M3.5 SoC sem módulo | M3.3, M3.4, M2.11 |
| M3.6 Interfaces rápidas | M3.3 |
| M3.7 Firmware de produção | M1.6, M1.7 |
| M3.8 DFM/DFA/DFT | M3.2 |
| M3.9 Validação | M2.7 |
| M3.10 "Meu ESP32" | M3.5, M3.6, M3.7, M3.8, M3.9 |

## A4
| Módulo | Exige |
|---|---|
| M4.1 Segurança | M1.10 |
| M4.2 Firmware profissional | M1.7 |
| M4.3 Edge e TinyML | M2.2, M0.2 |
| M4.4 Frota | M1.10 |
| M4.5 Certificação | M2.7, M3.4 |
| M4.6 Mecânica | M0.7 |
| M4.7 Engenharia de produto (fecha o ato) | M3.10, M4.1, M4.2, M4.4, M4.5, M4.6 |

## A5
| Módulo | Exige |
|---|---|
| M5.1 Linha SMT | M3.1 |
| M5.2 PCB nua | M2.5 |
| M5.3 Teste em produção | M3.8 |
| M5.4 Qualidade | M0.2 |
| M5.5 Planejamento de produção | M5.1 |
| M5.6 Integrador 5 | M5.1–M5.5, M3.10 |

## A6
| Módulo | Exige |
|---|---|
| M6.1 Física de semicondutores | M0.2, M0.3 |
| M6.2 Fabricação | M6.1 |
| M6.3 Encapsulamento | M6.2 |
| M6.4 HDL e FPGA | M1.1 *(atalho lateral)* |
| M6.5 Arquitetura de processadores | M6.4, M1.3 |
| M6.6 ASIC digital | M6.4 |
| M6.7 CI analógico | M6.1, M2.2 |
| M6.8 "Meu chip" | M6.6, M6.3 |

## A7
| Módulo | Exige |
|---|---|
| M7.1 Transdução | M1.8, M0.3 |
| M7.2 Materiais | M0.3 |
| M7.3 Sensores caseiros | M7.1, M7.2 |
| M7.4 MEMS | M6.2, M7.3 |
| M7.5 Metrologia | M7.1 |
| M7.6 Front-end | M2.2 |
| M7.7 Projeto final | M7.3, M7.5, M7.6, M3.10 |

## Regra de validação
`validar-conteudo.ts` falha se houver ciclo, pré-requisito apontando para ID
inexistente, ou módulo inalcançável a partir do M0.1.
