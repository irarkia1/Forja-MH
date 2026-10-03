# Trilhas

Cada módulo pertence a uma **trilha**. No jogo, a trilha vira um **atributo do
personagem** (cresce com as horas estudadas nela) e uma **cor no mapa**.

| Trilha | Cor | Horas | O que cobre |
|---|---|---:|---|
| Base | cinza | 870 | Matemática, física, circuitos, ferramentas, eletrônica digital |
| Firmware | azul | 2.210 | C/C++, MCUs, RTOS, protocolos, nuvem, segurança, edge |
| Hardware | laranja | 2.300 | Componentes, analógica, potência, PCB, SI/PI, EMC, RF |
| Fabricação | verde | 1.080 | Protótipo, SMT, DFM, linha industrial, teste, qualidade |
| Silício | roxo | 1.250 | Física de semicondutores, fab, HDL, arquitetura, ASIC |
| Sensores | ciano | 1.020 | Transdução, materiais, sensores caseiros, MEMS, metrologia |
| Produto | amarelo | 380 | Certificação, mecânica, engenharia de produto |
| Integrador | dourado | 890 | Os projetos de fim de ato (6 módulos) |
| **Total** | | **10.000** | 68 módulos · 507 tópicos · 122 de elite |

## Caminhos no mapa
A grade não é uma fila: dentro de cada ato há **bifurcações** onde você escolhe
a ordem (ver [PRE-REQUISITOS.md](PRE-REQUISITOS.md)). Exemplos:

- Depois do **M0.1**, quatro caminhos abrem juntos: Matemática (M0.2),
  Circuitos DC (M0.4), C/C++ (M0.6) ou Ferramentas (M0.7).
- No A1, depois do primeiro MCU (M1.2), dá para seguir por **STM32** (M1.4),
  **protocolos** (M1.5), **ESP32** (M1.6) ou **sensores** (M1.8).
- **M6.4 (HDL/FPGA)** só exige eletrônica digital (M1.1): é um **atalho
  lateral** — dá para começar FPGA ainda no A2 se der vontade.

## Missões secundárias (opcionais)
Projetos conhecidos que encaixam em tópicos e **contam horas** para eles
quando registrados como evidência:

| Missão | Encaixa em |
|---|---|
| Computador de 8 bits em protoboard (estilo Ben Eater) | M1.1, M1.3, M6.5 |
| Nand2Tetris | M1.1, M1.3, M6.4, M6.5 |
| Estação meteorológica LoRa | M1.8, M1.9, M1.12 |
| Rádio SDR e medições de RF | M3.4 |
| Tiny Tapeout | M6.6, M6.8 |
| Transistor feito em casa (microfabricação de garagem) | M6.2, M7.4 |
| **Da mina ao componente**: de onde vêm cobre, estanho, silício, tântalo e terras raras; mineração, refino e purificação (estudo de caso + relatório) | M0.1.T04, M6.2, M7.2 |
| **Componentes passivos feitos à mão**: resistor de filme de carbono, capacitor de placas, indutor enrolado; medir e comparar com os comerciais | M2.1, M7.3 |
| **Visita às máquinas**: assistir/registrar uma linha SMT real (impressora de pasta, pick-and-place, forno, AOI) e explicar cada máquina | M5.1, M5.6 |
| **Placa-mãe por dentro**: desmontar e mapear uma placa-mãe de PC (VRM, chipset, DDR, PCIe) e relacionar com A2–A3 | M2.10, M3.3, M3.6 |
