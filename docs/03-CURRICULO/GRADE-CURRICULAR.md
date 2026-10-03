# Grade curricular

8 atos · 68 módulos · 10.000 horas.

**Como ler:** cada módulo é uma **fase** do jogo; cada tópico (`T01`, `T02`…)
é um **inimigo**. ⚒ = **inimigo de elite** (exige evidência de laboratório).
"Chefe N" = número de questões da prova do módulo, calculado como
`clamp(horas ÷ 3, 10, 100)` — algumas variantes acrescentam questões.

As horas do tópico saem da divisão das horas do módulo pelo peso de cada tópico
(no YAML). O **tempo mínimo** do inimigo é **60%** das horas do tópico; os
40% restantes vêm de laboratório, revisões e preparação para o chefe
(ver [DISTRIBUICAO-10-MIL-HORAS.md](DISTRIBUICAO-10-MIL-HORAS.md)).

---

## A0 — Fundamentos · 900 h
*Saber falar a língua, fazer as contas e não queimar nada.*

### M0.1 — Termos e mapa da área · 40 h · base · Chefe 13
T01 O que é IoT: camadas (dispositivo, conectividade, borda, nuvem, aplicação) ·
T02 Glossário essencial (MCU, SoC, PCB, PCBA, SMT, THT, BOM, firmware, RTOS,
OTA, gateway, MQTT) · T03 Unidades SI, prefixos, notação de engenharia ·
T04 Cadeia de valor da eletrônica: do wafer ao produto na prateleira ·
T05 Como ler um datasheet (estrutura, valores absolutos × típicos) ·
T06 Profissões e papéis (firmware, hardware, RF, teste, manufatura, regulatório) ·
⚒T07 Montar o caderno de laboratório e o primeiro kit de bancada

### M0.2 — Matemática para engenharia · 200 h · base · Chefe 67
T01 Álgebra e manipulação de equações · T02 Funções, gráficos, exponencial e
logaritmo · T03 Trigonometria e senoides · T04 Números complexos e forma polar ·
T05 Limites e derivadas · T06 Integrais e aplicações · T07 Equações
diferenciais ordinárias de 1ª e 2ª ordem · T08 Álgebra linear: vetores,
matrizes, sistemas · T09 Probabilidade e estatística descritiva · T10 Erro,
incerteza e algarismos significativos · T11 Sistemas de numeração (binário,
hexadecimal, complemento de 2) · T12 Lógica booleana e álgebra de Boole

### M0.3 — Física para eletrônica · 140 h · base · Chefe 47
T01 Carga, campo elétrico e potencial · T02 Corrente, resistência e
resistividade · T03 Energia, potência e eficiência · T04 Capacitância e
dielétricos · T05 Magnetismo, indução e indutância · T06 Ondas e espectro
eletromagnético · T07 Calor, temperatura e transferência térmica ·
T08 Condutores, isolantes e semicondutores (introdução) · T09 Óptica básica
(luz, LED, fotodetecção)

### M0.4 — Circuitos DC · 140 h · base · Chefe 47
T01 Lei de Ohm e potência · T02 Leis de Kirchhoff · T03 Série, paralelo e
divisores · T04 Análise nodal e de malhas · T05 Thévenin, Norton e
superposição · T06 Capacitores e indutores em DC · T07 Transitórios RC e RL ·
⚒T08 Multímetro, fonte de bancada e protoboard · ⚒T09 Segurança elétrica e
ESD na bancada

### M0.5 — Circuitos AC · 100 h · base · Chefe 33
T01 Senoides, valor eficaz, fase · T02 Fasores e impedância · T03 Filtros
passivos RC, RL, RLC · T04 Ressonância e fator Q · T05 Potência em AC e fator
de potência · T06 Transformadores · T07 Decibéis e diagrama de Bode ·
⚒T08 Osciloscópio e gerador de funções

### M0.6 — Programação C/C++ · 180 h · firmware · Chefe 60
T01 C: tipos, controle de fluxo, funções · T02 Ponteiros e arrays ·
T03 Memória: pilha, heap, estático, `volatile`, `const` · T04 Structs, unions,
enums · T05 Operações bit a bit e máscaras · T06 Pré-processador, compilação e
link · T07 Make e CMake · T08 C++ para embarcados (classes, RAII, templates
leves, o que evitar) · T09 Depuração com GDB · ⚒T10 Testes unitários em C ·
T11 Estilo, MISRA C (visão geral)

### M0.7 — Ferramentas do engenheiro · 100 h · base · Chefe 33
T01 Linux e terminal · T02 Git e GitHub · T03 Python para automação e análise
de dados · T04 Documentação técnica e Markdown · T05 Inglês técnico (leitura
de datasheet e norma) · ⚒T06 Solda THT: ferro, estanho, fluxo, inspeção ·
⚒T07 Primeiro kit montado e documentado

---

## A1 — Microcontroladores e firmware IoT · 1.800 h
*Do LED piscando ao dispositivo conectado na nuvem.*

### M1.1 — Eletrônica digital · 150 h · base · Chefe 50
T01 Portas lógicas e tabelas-verdade · T02 Circuitos combinacionais (mux,
decodificador, somador) · T03 Mapas de Karnaugh · T04 Latches e flip-flops ·
T05 Contadores e registradores de deslocamento · T06 Máquinas de estado finito ·
T07 Famílias lógicas TTL e CMOS, níveis e fan-out · T08 Pull-up, pull-down,
open-drain, tri-state · ⚒T09 Analisador lógico

### M1.2 — Primeiro MCU (AVR/Arduino) · 120 h · firmware · Chefe 40
T01 Arquitetura do ATmega328 · ⚒T02 GPIO e debounce · ⚒T03 PWM · ⚒T04 ADC ·
T05 Interrupções · T06 Timers · T07 UART serial · T08 Biblioteca × registrador ·
⚒T09 ATmega328 sem Arduino (bare metal, avrdude)

### M1.3 — Arquitetura de computadores e MCUs · 130 h · firmware · Chefe 43
T01 CPU, ALU, registradores · T02 ISA, RISC × CISC · T03 Pipeline básico ·
T04 Memórias: Flash, SRAM, EEPROM, registradores de periférico · T05 Barramentos
e mapa de memória · T06 ARM Cortex-M (modos, exceções) · T07 RISC-V
(introdução) · T08 Assembly básico · T09 Startup, vetor de interrupções e
linker script

### M1.4 — STM32 e ARM bare metal · 200 h · firmware · Chefe 67
T01 Ecossistema STM32 e CMSIS · T02 Árvore de clock · ⚒T03 GPIO por registrador ·
T04 NVIC e prioridades · ⚒T05 Timers avançados (captura, PWM complementar) ·
⚒T06 DMA · ⚒T07 ADC e DAC · T08 HAL × LL × registrador · ⚒T09 Depuração SWD/JTAG
e breakpoints · T10 Escrever um driver do zero · T11 Gerenciamento de falhas
(HardFault)

### M1.5 — Protocolos de comunicação embarcada · 160 h · firmware · Chefe 53
⚒T01 UART a fundo · ⚒T02 I2C · ⚒T03 SPI · T04 1-Wire · T05 CAN · T06 RS-485 e
Modbus RTU · T07 USB (classes, enumeração) · T08 I2S e áudio digital ·
⚒T09 Decodificar protocolos no analisador lógico

### M1.6 — ESP32 e ESP-IDF · 180 h · firmware · Chefe 60
T01 Família ESP32 (Xtensa, RISC-V, variantes C3/S3/C6) · T02 ESP-IDF, menuconfig,
componentes · T03 Partições e NVS · ⚒T04 Wi-Fi (station, AP, provisionamento) ·
⚒T05 BLE (GAP, GATT) · ⚒T06 Deep sleep e ULP · T07 Periféricos (RMT, LEDC,
touch) · T08 Logs e monitor · ⚒T09 OTA básica

### M1.7 — RTOS · 150 h · firmware · Chefe 50
T01 Por que RTOS: superloop × escalonador · T02 Tarefas e estados ·
T03 Escalonamento preemptivo e prioridades · T04 Filas · T05 Semáforos e mutex ·
T06 Inversão de prioridade · T07 Timers de software e eventos · T08 Heap e stack
por tarefa · ⚒T09 Projeto FreeRTOS com 4 tarefas · T10 Zephyr (introdução)

### M1.8 — Sensores e atuadores · 150 h · sensores · Chefe 50
T01 Classes de sensores e especificações (faixa, resolução, exatidão, deriva) ·
⚒T02 Temperatura e umidade · ⚒T03 Pressão e IMU · T04 Luz, distância, corrente ·
T05 Amp-op básico e condicionamento de sinal · ⚒T06 Calibração de dois pontos ·
T07 Motores DC, servo, passo · ⚒T08 MOSFET como chave e drivers · T09 Relés e
isolação

### M1.9 — Conectividade IoT · 180 h · firmware · Chefe 60
T01 Modelos OSI e TCP/IP · T02 IP, DHCP, DNS, NAT · T03 Wi-Fi a fundo ·
T04 BLE a fundo · ⚒T05 LoRa e LoRaWAN · T06 NB-IoT e LTE-M · T07 Zigbee, Thread
e Matter · T08 Antenas e link budget (introdução) · T09 Escolher a rede certa
para o produto

### M1.10 — Protocolos de aplicação e nuvem · 160 h · firmware · Chefe 53
T01 HTTP e REST · ⚒T02 MQTT (QoS, retain, LWT) · T03 CoAP · T04 WebSocket ·
T05 JSON, CBOR, Protobuf · ⚒T06 Broker próprio (Mosquitto/EMQX) · T07 Plataformas
(AWS IoT, ThingsBoard) · T08 Banco de séries temporais · ⚒T09 Dashboard

### M1.11 — Energia e baixo consumo · 70 h · hardware · Chefe 23
T01 Química de baterias (Li-ion, LiFePO4, primárias) · T02 Orçamento de energia ·
T03 Modos de sleep e wake-up · ⚒T04 Medir corrente de µA a A · T05 Energy
harvesting (solar, vibração)

### M1.12 — Projeto integrador IoT 1 · 150 h · integrador · Chefe 50
⚒T01 Requisitos e arquitetura · ⚒T02 Sensor + MCU + RTOS · ⚒T03 Rádio e nuvem ·
⚒T04 Dashboard e alertas · ⚒T05 Bateria e autonomia medida · ⚒T06 Documentação
e vídeo de demonstração

---

## A2 — Hardware e projeto de PCB · 1.700 h
*Sair dos módulos prontos e desenhar a própria placa.*

### M2.1 — Componentes a fundo · 120 h · hardware · Chefe 40
T01 Resistores (tipos, tolerância, potência, ruído) · T02 Capacitores (cerâmico,
eletrolítico, tântalo, ESR, DC bias) · T03 Indutores e ferrites · T04 Diodos,
Zener, Schottky, TVS · T05 BJT · T06 MOSFET · T07 Cristais e osciladores ·
T08 Encapsulamentos THT e SMD · T09 Derating e confiabilidade

### M2.2 — Eletrônica analógica · 220 h · hardware · Chefe 73
T01 Amp-op ideal × real · T02 Topologias (inversor, não inversor, somador,
integrador) · T03 Filtros ativos · T04 Referências de tensão · T05 Amostragem e
Nyquist · T06 ADC: arquiteturas, ENOB, INL/DNL · T07 DAC · T08 Ruído
(térmico, 1/f, quantização) · T09 Amplificador de instrumentação ·
T10 Ponte de Wheatstone · ⚒T11 Cadeia de aquisição completa

### M2.3 — Potência e fontes · 200 h · hardware · Chefe 67
T01 Reguladores lineares e LDO · ⚒T02 Buck · ⚒T03 Boost · T04 Buck-boost e
SEPIC · T05 Layout de fonte chaveada · T06 Carregadores de bateria ·
T07 Proteções (reversão, TVS, polyfuse, eFuse) · T08 Térmica e dissipação ·
⚒T09 Medir eficiência e ripple

### M2.4 — Projeto esquemático · 120 h · hardware · Chefe 40
T01 KiCad: projeto, bibliotecas, símbolos · T02 Hierarquia e reaproveitamento ·
T03 ERC e boas práticas de esquemático · T04 Escolha de componentes e
disponibilidade · T05 Ciclo de vida e obsolescência · T06 Notas de aplicação e
projetos de referência · ⚒T07 BOM gerenciável

### M2.5 — Layout de PCB · 250 h · hardware · Chefe 83
T01 Stackup e camadas · T02 Footprints e IPC-7351 · T03 Posicionamento ·
T04 Planos de terra e caminho de retorno · T05 Desacoplamento · T06 Largura de
trilha e corrente (IPC-2152) · T07 Vias e transições · T08 DRC e regras do
fabricante · T09 Gerber, drill, ODB++ · T10 Painelização · ⚒T11 Primeira placa
de 2 camadas · ⚒T12 Revisão de layout com checklist

### M2.6 — Integridade de sinal e de potência · 150 h · hardware · Chefe 50
T01 Linhas de transmissão · T02 Impedância controlada · T03 Reflexões e
terminação · T04 Crosstalk · T05 Pares diferenciais · T06 PDN e impedância
alvo · T07 Simulação de SI/PI

### M2.7 — EMC/EMI · 120 h · hardware · Chefe 40
T01 Fontes e caminhos de emissão · T02 Susceptibilidade e imunidade · T03 ESD ·
T04 Filtragem e blindagem · T05 Normas (CISPR, IEC 61000) · ⚒T06 Pré-compliance
caseiro (sonda de campo próximo)

### M2.8 — Fabricação de protótipos · 130 h · fabricacao · Chefe 43
⚒T01 PCB caseira por transferência térmica ou fotossensível · ⚒T02 Fresagem CNC
de PCB · T03 Pedido a fabricante (JLCPCB, PCBWay): opções e custos · ⚒T04 Solda
SMD com ferro · ⚒T05 Ar quente e retrabalho · ⚒T06 Estêncil e chapa quente ·
T07 Inspeção visual e defeitos

### M2.9 — Simulação e instrumentação · 110 h · hardware · Chefe 37
⚒T01 SPICE (LTspice/ngspice) · T02 Osciloscópio avançado (sondas, triggers,
FFT) · T03 Analisador de espectro · ⚒T04 Automação de bancada com Python e SCPI ·
T05 Incerteza de instrumentos

### M2.10 — Placas com MCU · 130 h · hardware · Chefe 43
T01 Alimentação de MCU · T02 Cristal e capacitores de carga · T03 Reset, boot e
pinos de configuração · T04 Interface de programação e depuração · T05 USB na
placa · ⚒T06 Placa STM32 mínima do zero · ⚒T07 Bring-up: primeiro power-on

### M2.11 — Projeto integrador 2 · 150 h · integrador · Chefe 50
⚒T01 Esquemático da placa IoT própria · ⚒T02 Layout · ⚒T03 Fabricação ·
⚒T04 Montagem · ⚒T05 Firmware e testes · ⚒T06 Revisão B com lições aprendidas

---

## A3 — SMT e a placa completa "meu ESP32" · 1.600 h
*Projetar, montar e validar uma placa de SoC nu, como a de um fabricante.*

### M3.1 — Tecnologia SMT · 120 h · fabricacao · Chefe 40
T01 Encapsulamentos finos (0402, QFN, BGA, WLCSP) · T02 Pasta de solda e ligas
(SAC305, SnPb) · T03 Estêncil: espessura, abertura · T04 Perfil de refusão ·
T05 Defeitos (tombstone, ponte, voids, head-in-pillow) · T06 IPC-A-610 e
J-STD-001 · T07 MSL e umidade

### M3.2 — Montagem SMT em bancada · 150 h · fabricacao · Chefe 50
⚒T01 Aplicar pasta com estêncil · ⚒T02 Pick-and-place manual/hobby ·
⚒T03 Forno de refusão com controlador de perfil · ⚒T04 Montar QFN · ⚒T05 BGA e
reballing · T06 Inspeção (lupa, microscópio, raio-X conceitual)

### M3.3 — PCB multicamada e HDI · 130 h · hardware · Chefe 43
T01 Stackups de 4 a 8 camadas · T02 Microvias e via-in-pad · T03 Fanout de BGA ·
T04 Materiais (FR-4, Rogers) · T05 Acabamentos (HASL, ENIG, OSP) · ⚒T06 Placa
de 4 camadas

### M3.4 — Projeto de RF · 220 h · hardware · Chefe 73
T01 Linhas de transmissão em RF · T02 Carta de Smith · T03 Casamento de
impedância · T04 Antenas de PCB e chip · T05 Layout de RF · ⚒T06 VNA (NanoVNA) ·
T07 Medir potência e espectro de rádio · T08 Coexistência Wi-Fi/BLE ·
T09 Requisitos de certificação de rádio

### M3.5 — Projeto com SoC sem módulo · 200 h · hardware · Chefe 67
T01 Hardware design guidelines da Espressif · T02 Alimentação do ESP32 ·
T03 Cristal de 40 MHz e RTC · T04 Matching de RF e antena · T05 Flash e PSRAM
externas · T06 Strapping pins e modos de boot · T07 USB nativo e UART de
programação · ⚒T08 Esquemático completo revisado

### M3.6 — Memórias e interfaces rápidas · 120 h · hardware · Chefe 40
T01 QSPI/OSPI · T02 PSRAM · T03 DDR (introdução) · T04 USB 2.0 High-Speed ·
T05 Ethernet RMII · T06 Casamento de comprimento

### M3.7 — Bootloader, segurança e firmware de produção · 130 h · firmware · Chefe 43
T01 Bootloaders (ROM, 2º estágio) · T02 Secure boot · T03 Criptografia de flash ·
⚒T04 OTA robusta com rollback · T05 Provisionamento em fábrica · T06 Gestão de
chaves e eFuses

### M3.8 — DFM, DFA e DFT · 140 h · fabricacao · Chefe 47
T01 Regras de fabricação (DFM) · T02 Regras de montagem (DFA) · T03 Pontos de
teste e cobertura (DFT) · T04 Fiduciais e painelização para linha · T05 BOM
consolidada e alternativos · ⚒T06 Jig de teste com pogo pins · T07 Programação
em linha

### M3.9 — Testes e validação de hardware · 140 h · hardware · Chefe 47
T01 Plano de validação (EVT/DVT) · T02 Testes térmicos · T03 Testes ambientais
(umidade, vibração, queda) · T04 ESD e surtos · T05 Vida acelerada (HALT/HASS) ·
T06 Confiabilidade (MTBF, curva da banheira) · ⚒T07 Relatório de validação

### M3.10 — Projeto integrador 3: "meu ESP32" · 250 h · integrador · Chefe 83
⚒T01 Requisitos e arquitetura da placa · ⚒T02 Esquemático com SoC nu ·
⚒T03 Layout de 4 camadas com RF · ⚒T04 Fabricação e montagem SMT própria ·
⚒T05 Bring-up e firmware · ⚒T06 Medição de RF e consumo · ⚒T07 Documentação de
produção (BOM, montagem, teste)

---

## A4 — Produto IoT profissional · 1.000 h
*Da placa que funciona ao produto que dá para vender.*

### M4.1 — Segurança IoT · 180 h · firmware · Chefe 60
T01 Criptografia aplicada (simétrica, assimétrica, hash, MAC) · T02 TLS e mTLS ·
T03 PKI e certificados de dispositivo · ⚒T04 Secure element (ATECC608 ou
similar) · T05 Ataques físicos (glitching, canal lateral) · T06 OWASP IoT Top 10 ·
T07 Modelagem de ameaças · T08 Atualização segura e cadeia de confiança

### M4.2 — Firmware profissional · 160 h · firmware · Chefe 53
T01 Arquitetura em camadas e HAL própria · ⚒T02 Testes unitários em host ·
⚒T03 Hardware-in-the-loop · ⚒T04 CI para firmware · T05 Logs, telemetria e
crash dump · T06 Watchdog e recuperação · T07 Gestão de configuração e versões

### M4.3 — Edge, DSP e TinyML · 130 h · firmware · Chefe 43
T01 Sinais discretos e amostragem · T02 FFT · T03 Filtros digitais FIR/IIR ·
⚒T04 TinyML (TFLite Micro / Edge Impulse) · T05 Linux embarcado (Buildroot,
Yocto — introdução)

### M4.4 — Backend e gestão de frota · 150 h · firmware · Chefe 50
T01 Ingestão em escala · T02 Registro e identidade de dispositivos · ⚒T03 OTA
em frota com estágios · T04 Monitoramento e alertas · T05 Armazenamento e
retenção · T06 Custo por dispositivo na nuvem

### M4.5 — Certificação e regulatório · 130 h · produto · Chefe 43
T01 Homologação ANATEL de produtos de radiocomunicação · T02 FCC · T03 CE e RED ·
T04 RoHS e REACH · T05 Segurança elétrica (IEC 62368-1) · T06 Ensaios, laboratórios
e dossiê técnico · T07 Estratégia: módulo certificado × projeto próprio

### M4.6 — Mecânica e invólucro · 120 h · produto · Chefe 40
⚒T01 CAD 3D (FreeCAD/Fusion) · ⚒T02 Impressão 3D funcional · T03 Injeção
plástica e moldes · T04 Grau de proteção IP (IEC 60529) · T05 Térmica no
invólucro · T06 Conectores e vedação

### M4.7 — Engenharia de produto · 130 h · produto · Chefe 43
T01 Requisitos e especificação · T02 Custos: BOM, NRE, margem · T03 Cadeia de
suprimentos e lead time · T04 EVT, DVT, PVT · T05 Documentação e ciclo de vida ·
⚒T06 Dossiê de produto completo

---

## A5 — Manufatura eletrônica · 600 h
*Como uma fábrica transforma o projeto em mil placas iguais.*

### M5.1 — Linha SMT industrial · 150 h · fabricacao · Chefe 50
T01 Layout de uma linha SMT · T02 Impressora de pasta · T03 SPI (inspeção de
pasta) · T04 Pick-and-place: cabeças, bicos, alimentadores, visão ·
T05 Forno de refusão de zonas e nitrogênio · T06 AOI · T07 Raio-X automático ·
T08 THT: onda e onda seletiva

### M5.2 — Fabricação da PCB nua · 100 h · fabricacao · Chefe 33
T01 Laminados e preparação · T02 Furação e metalização · T03 Fotolito e
gravação · T04 Prensagem multicamada · T05 Máscara, legenda e acabamento ·
T06 Teste elétrico (flying probe, cama de pregos)

### M5.3 — Teste em produção · 100 h · fabricacao · Chefe 33
T01 ICT · T02 Flying probe · ⚒T03 Teste funcional (FCT) · T04 Boundary scan
(JTAG) · T05 Burn-in · T06 Rastreabilidade e número de série

### M5.4 — Qualidade e processos · 130 h · fabricacao · Chefe 43
T01 Lean e os 7 desperdícios · T02 Six Sigma e DMAIC · T03 CEP/SPC · T04 FMEA de
processo · T05 8D e análise de causa raiz · T06 ISO 9001 · T07 Programa de ESD
(ANSI/ESD S20.20)

### M5.5 — Planejamento de produção e custos · 60 h · fabricacao · Chefe 20
T01 Capacidade, takt time e gargalo · T02 OEE · T03 Setup e troca de produto ·
T04 Custo por placa · T05 EMS terceirizada × produção própria

### M5.6 — Projeto integrador 5 · 60 h · integrador · Chefe 20
⚒T01 Plano de produção de 1.000 unidades do "meu ESP32" · ⚒T02 Jigs e plano de
teste · ⚒T03 Visita técnica a uma EMS com relatório

---

## A6 — Semicondutores e chips · 1.400 h
*Como nascem os processadores — e fazer o seu.*

### M6.1 — Física de semicondutores · 200 h · silicio · Chefe 67
T01 Mecânica quântica para engenheiros · T02 Bandas de energia · T03 Portadores
e dopagem · T04 Deriva e difusão · T05 Junção PN · T06 MOSFET: física e modelos ·
T07 Efeitos de canal curto · T08 Outros materiais (GaN, SiC)

### M6.2 — Fabricação de semicondutores · 200 h · silicio · Chefe 67
T01 Do quartzo ao wafer (Czochralski) · T02 Oxidação · T03 Fotolitografia (DUV,
imersão, EUV) · T04 Gravação seca e úmida · T05 Deposição (CVD, PVD, ALD) ·
T06 Implantação iônica e recozimento · T07 CMP e metalização (cobre damasceno) ·
T08 Sala limpa e controle de contaminação · T09 Nós de processo, FinFET e GAA ·
T10 Yield e economia de uma fab

### M6.3 — Encapsulamento e teste de chips · 100 h · silicio · Chefe 33
T01 Wafer sort · T02 Wire bonding e flip-chip · T03 Chiplets, 2.5D e 3D ·
T04 ATE e teste final · T05 Confiabilidade de CI

### M6.4 — Lógica digital avançada e HDL · 200 h · silicio · Chefe 67
T01 Verilog/SystemVerilog · T02 Simulação e testbench · T03 FPGA: arquitetura ·
⚒T04 Primeiro projeto em FPGA · T05 Restrições de temporização · T06 Síntese ·
T07 Verificação (assertivas, cobertura) · ⚒T08 Periférico próprio (UART, SPI) em FPGA

### M6.5 — Arquitetura de processadores · 200 h · silicio · Chefe 67
T01 Pipeline e hazards · T02 Caches e hierarquia de memória · T03 Previsão de
desvio · T04 Execução fora de ordem e superescalar · T05 Multicore e coerência ·
T06 GPU e modelo SIMT · T07 Aceleradores de IA · T08 Como Intel, AMD, NVIDIA e
ARM diferem · ⚒T09 CPU RISC-V própria em FPGA

### M6.6 — Projeto de CI digital (fluxo ASIC) · 200 h · silicio · Chefe 67
T01 Fluxo RTL → GDSII · T02 Células padrão e PDK (SkyWater 130) · T03 Síntese
lógica · T04 Floorplan e place & route (OpenLane) · T05 Árvore de clock ·
T06 STA · T07 DRC e LVS · ⚒T08 Bloco digital até o GDSII

### M6.7 — Projeto de CI analógico e misto · 150 h · silicio · Chefe 50
T01 Espelhos de corrente · T02 Amp-op CMOS · T03 Referência bandgap ·
T04 Conversores em silício · T05 Layout analógico e casamento ·
⚒T06 Bloco analógico no Magic/xschem

### M6.8 — Projeto integrador 6: "meu chip" · 150 h · integrador · Chefe 50
⚒T01 Especificação do chip · ⚒T02 RTL e verificação · ⚒T03 Hardening e
submissão ao shuttle · ⚒T04 Placa de teste para o chip · ⚒T05 Testar o chip
recebido

---

## A7 — Sensores do zero absoluto · 1.000 h
*Não comprar o sensor: fabricar o elemento, condicionar, calibrar, entregar.*

### M7.1 — Princípios de transdução · 120 h · sensores · Chefe 40
T01 Resistivo e piezorresistivo · T02 Capacitivo · T03 Indutivo e magnético
(Hall, magnetorresistivo) · T04 Piezoelétrico · T05 Termoelétrico e piroelétrico ·
T06 Fotoelétrico · T07 Eletroquímico

### M7.2 — Ciência dos materiais · 150 h · sensores · Chefe 50
T01 Estrutura cristalina e defeitos · T02 Cerâmicas e óxidos metálicos ·
T03 Polímeros funcionais · T04 Filmes finos · T05 Propriedades elétricas,
mecânicas e térmicas · T06 Caracterização (SEM, XRD, perfilometria — conceitual) ·
T07 Segurança química no laboratório

### M7.3 — Fabricação caseira de sensores · 180 h · sensores · Chefe 60
⚒T01 Termistor/RTD de filme · ⚒T02 Strain gauge e célula de carga ·
⚒T03 Sensor capacitivo de umidade · ⚒T04 Sensor piezoelétrico ·
⚒T05 Fotodetector · ⚒T06 Sensor de gás por óxido metálico · ⚒T07 Eletrodo de pH

### M7.4 — Microfabricação e MEMS · 200 h · sensores · Chefe 67
T01 Microusinagem de volume e de superfície · T02 Acelerômetro MEMS ·
T03 Giroscópio MEMS · T04 Microfone e sensor de pressão MEMS · T05 Encapsulamento
de MEMS · ⚒T06 Fotolitografia caseira · ⚒T07 Deposição amadora de filmes
(sputtering/evaporação) · ⚒T08 Estrutura MEMS em macroescala

### M7.5 — Metrologia e calibração · 120 h · sensores · Chefe 40
T01 Vocabulário de metrologia (VIM) · T02 Incerteza de medição (GUM) ·
T03 Rastreabilidade e padrões · ⚒T04 Calibração multiponto · T05 Compensação de
temperatura · T06 Deriva, histerese e envelhecimento

### M7.6 — Front-end e smart sensor · 100 h · sensores · Chefe 33
T01 AFE dedicado · T02 ADC sigma-delta · T03 Linearização · T04 Autocalibração e
autodiagnóstico · T05 Interfaces digitais de sensor (I2C, SPI, SENT)

### M7.7 — Projeto final: sensor do zero ao produto · 130 h · integrador · Chefe 43
⚒T01 Escolha e especificação do sensor · ⚒T02 Fabricação do elemento sensor ·
⚒T03 Condicionamento e calibração · ⚒T04 Integração no "meu ESP32" ·
⚒T05 Firmware, nuvem e painel · ⚒T06 Artigo técnico público
