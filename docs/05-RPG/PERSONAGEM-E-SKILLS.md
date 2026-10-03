# Personagem e skills

## Personagem
| Elemento | Como funciona |
|---|---|
| **Nível** | Por XP, numa **curva por faixas de 2.000 h**: cada nível custa o dobro do anterior, e cada Marco de horas destrava (D014). ~45 no fim da jornada |
| **Vida** | 6 no nível 1, **+1 por nível do personagem**, +1 por nível de Vitalidade |
| **Defesa** | % de redução do dano; vem da skill Defesa + Preparo; **teto de 80%** |
| **Título** | Por horas: Aprendiz (0) · Técnico (1.000) · Projetista (2.500) · Engenheiro (4.500) · Sênior (6.500) · Especialista (8.000) · Mestre da Forja (10.000) |
| **Atributos de trilha** | Firmware, Hardware, Fabricação, Silício, Sensores, Produto; valor = horas na trilha ÷ 10 (só acompanhamento) |
| **Pontos de skill** | **2 por nível do personagem, e só isso** (chefes e projetos dão XP, não pontos). Nível ~45 ≈ **88 pontos** na jornada inteira |
| **Energia** | Gasta em skills ativas; recarrega com revisão e laboratório |

## Os limites (valem para todas as skills)
1. **Nenhuma skill reduz o tempo mínimo de estudo.**
2. **Nenhuma skill mostra a resposta** nem deixa só a alternativa certa.
3. **Nenhuma skill vence o piso de conhecimento**: 0/3 no combate e menos de
   60% no chefe perdem sempre.
4. **Fantasmas não aceitam skills nem têm dano.** Revisão é onde se prova
   que ficou.
5. No chefe, no máximo **20% das questões** podem receber ajuda ativa.
6. Toda questão com ajuda fica marcada; o tópico ganha um fantasma extra.
7. Skills ativas custam **energia**, que só vem de estudo real.

## Árvore

### Ramo do Guerreiro (atributos de combate)
Valores definidos pelo Matheus (D013). Custo **fixo** por nível.

| Skill | Nv. máx. | Custo/nível | Efeito |
|---|---:|---:|---|
| **Vitalidade** | 50 | 1 | +1 de Vida máxima por nível |
| **Defesa** | 40 | 1 | +2% de redução de dano por nível (máx. **80%**; Preparo soma, mas o total também para em 80%) |
| **Esquiva** | 50 | 1 | +1% por nível de chance do golpe errar (dano 0), máx. **50%** |
| **Sorte** | 3 | 3 | Rola o dado de novo e fica com o menor: 1/2/3 vezes por luta |
| **Regeneração** | 20 | 1 | **A cada acerto** (combate e chefe), cura 0,05 × poder por nível. Nv. 20 = 1 × poder por acerto |

### Ramo do Estudioso (passivas, recompensam bons hábitos)
Subir do nível `k−1` para `k` custa **k pontos**.

| Skill | Nv. máx. | Efeito |
|---|---:|---|
| **Foco Profundo** | 5 | +5% de XP por nível em blocos ≥ 50 min sem pausa |
| **Memória de Ferro** | 5 | +10% de XP por nível em fantasmas vencidos no dia |
| **Ferreiro** | 5 | +10% de XP por nível em evidências de laboratório |
| **Vigor** | 5 | +2 de energia máxima por nível |
| **Recuperação** | 3 | Cooldown do chefe: 48 h → 40 / 32 / 24 h (exige curar as feridas antes) |

### Ramo do Estrategista (ativas, ajudam sem dar a resposta)
Custo `k` pontos por nível; energia por uso na coluna "⚡".

| Skill | Nv. máx. | ⚡ | Efeito |
|---|---:|---:|---|
| **Lupa** | 3 | 1 | Mostra uma **dica conceitual** da questão (nunca o valor). Nv. 2–3: dica mais específica. A questão vale metade do XP |
| **Corte** | 3 | 2 | Elimina **uma** alternativa errada (nunca deixa só a certa). Nv. 3: em questões de 5 alternativas, elimina duas |
| **Rascunho** | 1 | 1 | Abre sua folha de fórmulas do módulo (das notas pessoais) numa questão numérica |
| **Segunda Chance** | 3 | 3 | Depois de errar, escreva por que errou e responda uma **questão irmã**; se acertar, cura o dano daquele golpe. Usos por luta = nível |
| **Escudo** | 3 | 3 | Anula o dano de um erro (o erro conta no piso e vira ferida). Usos por luta = nível |

### Ramo do Explorador (conhecimento do terreno)
| Skill | Nv. máx. | ⚡ | Efeito |
|---|---:|---:|---|
| **Olho do Batedor** | 1 | 2 | Revela a variante do chefe **antes** de entrar (ela é sorteada e fixada nesse momento) |
| **Mapa Estelar** | 1 | — | Mostra no mapa quando cada fase será alcançada no seu ritmo |
| **Sangue-Frio** | 2 | 2 | Contra ataques surpresa (Traiçoeiro, Lich): dano −50%; nv. 2 também uma Lupa grátis |
| **Fôlego** | 3 | 1 | +15% de tempo por nível nas variantes cronometradas |

### Pré-requisitos na árvore
- Vitalidade nv. 3 → Defesa → Esquiva → Sorte
- Defesa nv. 3 → Regeneração
- Lupa → Corte → Segunda Chance → Escudo
- Foco Profundo nv. 2 → Vigor
- Olho do Batedor → Sangue-Frio
- Memória de Ferro nv. 3 → Recuperação

## Por que essas e não outras
| Ideia rejeitada | Por quê |
|---|---|
| "Reduz tempo mínimo em 10%" | Corta estudo real (limite 1) |
| "Revela a resposta certa" | Zero aprendizado (limite 2) |
| "Imortal: vida não zera" | A vida vira enfeite; o piso já é o mínimo |
| "Pular um inimigo" | O tópico deixaria de existir na sua cabeça |
| "Fantasma não aparece" | Mata a repetição espaçada |
