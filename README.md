# 🤖 Bot Autônomo de Minecraft com IA

Bot inteligente para Minecraft com arquitetura modular, memória de curto prazo e sistema de métricas eficiente. Usa LangChain com provedores de IA intercambiáveis (Groq, Ollama, etc.) para tomar decisões autônomas no jogo.

Inclui uma **plataforma de benchmark reproduzível** para avaliar modelos locais em diferentes hardwares — com contagem de tokens independente, sessões de experimento, cenários fixos e exportação de dados para análise.

## 🚀 Recursos

- ✅ **100% Node.js/TypeScript** — Código moderno e type-safe
- 🧠 **Memória de curto prazo** — Ring buffer de 15 entradas para evitar loops e agir com contexto
- 🔗 **Chain-of-thought** — Campo `raciocinio` no JSON força raciocínio antes de agir
- 🔌 **Providers intercambiáveis** — Groq, Ollama ou qualquer LLM via `BaseLLMProvider`
- 👁️ **Percepção enriquecida** — Inventário, entidades, blocos próximos, bioma e clima
- 📊 **Métricas em lote** — `MetricsBatcher` reduz ~95% do I/O no banco
- 🗃️ **PostgreSQL (Neon)** — Banco cloud para métricas acessíveis remotamente
- 🔧 **JSON resiliente** — `jsonrepair` corrige saídas quebradas de modelos locais
- 🔄 **Reconexão automática** — Se cair, reconecta sozinho
- 🎮 **Novas ações** — SEGUIR, FUGIR, COLETAR, ATACAR
- 🎯 **Modo Benchmark** — Cenários fixos para comparar modelos sem servidor Minecraft
- 🔢 **Tokenizer local** — Contagem de tokens consistente entre providers (`gpt-tokenizer`)
- 📋 **Sessões de experimento** — Cada execução agrupa métricas, contadores e metadados
- 📤 **Exportação CSV/JSON** — Pipeline pronto para pandas/matplotlib/paper

## 📋 Pré-requisitos

- Node.js 20+
- Servidor Minecraft Java Edition rodando (local ou remoto)
- Banco PostgreSQL — recomendado [Neon](https://console.neon.tech) (free tier)
- Chave da API do Groq ([obtenha aqui](https://console.groq.com/keys)) **ou** Ollama instalado localmente

## 🔧 Instalação

### 1. Clone o projeto

```bash
git clone https://github.com/jvras58/minecraft-langchain-ts-template.git
cd minecraft-langchain-ts-template
```

### 2. Instale as dependências

```bash
pnpm install
```

### 3. Configure as variáveis de ambiente

```bash
cp .env.example .env
```

Edite o `.env`:

```env
# Banco de Dados (Neon PostgreSQL)
DATABASE_URL=postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/dbname?sslmode=require

# Provedor de IA
LLM_PROVIDER=groq  # ou 'ollama'

# Groq (obrigatório se LLM_PROVIDER=groq)
GROQ_API_KEY=sua-chave-aqui
GROQ_MODEL=llama-3.3-70b-versatile

# Ollama (obrigatório se LLM_PROVIDER=ollama)
OLLAMA_MODEL=llama2
OLLAMA_BASE_URL=http://localhost:11434

# Servidor Minecraft
MINECRAFT_HOST=localhost
MINECRAFT_PORT=25565
BOT_USERNAME=AgenteBot
BOT_AUTH=offline

# Benchmark (opcional)
SESSION_NOTES="Meu setup de hardware"
BENCHMARK_MODE=false
BENCHMARK_REPS=10
WARMUP_ROUNDS=3
```

### 4. Setup do banco (obrigatório no primeiro uso)

```bash
pnpm db:generate   # gera o Prisma Client
pnpm db:push       # cria as tabelas no PostgreSQL
```

> [!IMPORTANT]
> Esses comandos são **obrigatórios** antes da primeira execução. `db:generate` deve ser reexecutado sempre que o `schema.prisma` for alterado.

### 5. Execute

```bash
pnpm dev       # desenvolvimento (hot reload)
pnpm build     # compila para produção
pnpm start     # executa o build
```

## 🏗️ Arquitetura

```
src/
├── benchmark/                   # Plataforma de benchmark
│   ├── BenchmarkRunner.ts       # Executa cenários fixos com métricas
│   ├── WarmupRunner.ts          # Warm-up para eliminar cold start
│   ├── scenarios.json           # 15 cenários padronizados
│   └── index.ts                 # Entry point: pnpm benchmark
├── bot/                         # Camada Minecraft
│   ├── ActionExecutor.ts        # Executa ações (FALAR, ANDAR, SEGUIR, FUGIR, COLETAR, ATACAR...)
│   ├── BotManager.ts            # Conexão e eventos do bot
│   ├── MovementManager.ts       # Controle de movimento (follow, flee, explorar)
│   └── PerceptionManager.ts     # Percepção rica (inventário, blocos, entidades, bioma)
├── config/
│   └── settings.ts              # Configurações centralizadas (bot, LLM, métricas, agente, benchmark)
├── core/                        # Lógica principal
│   ├── AgentLoop.ts             # Loop: Percepção → Memória → Raciocínio → Ação
│   ├── MemoryManager.ts         # Memória de curto prazo (ring buffer)
│   └── SessionManager.ts        # Gerencia sessões de experimento
├── metrics/                     # Sistema de métricas
│   ├── MetricsBatcher.ts        # Fila em memória com flush em lote (LLM, ação, parse, conexão)
│   └── HardwareMonitor.ts       # Snapshot estático + dinâmico de hardware
├── providers/                   # Provedores de IA
│   ├── BaseLLMProvider.ts       # Base com timing, tokens locais e hardware before/after
│   ├── ProviderFactory.ts       # Factory + ModelInfoProvider via configuração
│   └── providers/
│       ├── GroqProvider.ts      # Extrai tokens do response_metadata
│       └── OllamaProvider.ts    # Extrai tokens do formato Ollama
├── prompts/
│   └── botPrompts.ts            # Prompts com chain-of-thought e memória
├── schemas/
│   └── botAction.ts             # Schema Zod com campo "raciocinio" e novas ações
├── scripts/
│   └── exportMetrics.ts         # Exporta métricas para CSV/JSON
├── types/
│   └── types.ts                 # Interfaces completas (GameContext, MemoryEntry, métricas, sessão, etc.)
├── utils/
│   ├── db.ts                    # Prisma singleton
│   ├── jsonParser.ts            # Parse resiliente com jsonrepair (retorna status)
│   ├── ollamaModelInfo.ts       # Metadados do modelo via API Ollama
│   ├── tokenCounter.ts          # Contagem local de tokens (gpt-tokenizer)
│   └── sleep.ts
└── index.ts                     # Bootstrap com graceful shutdown e sessão
```

## 🎮 Como Funciona

O bot opera em um ciclo de 4 etapas a cada 3 segundos:

1. **Percepção** 👁️ — Coleta `GameContext` completo: vida, fome, posição, inventário, entidades próximas, blocos notáveis, bioma, clima
2. **Memória** 🗂️ — Injeta no prompt as últimas 15 entradas do ring buffer (ações, eventos, interações)
3. **Raciocínio** 🧠 — Envia contexto + memória ao LLM; o modelo retorna JSON com `raciocinio` e `acao`
4. **Ação** 🎯 — Executa a ação, registra resultado na memória e enfileira métricas

Cada execução do bot cria uma **sessão de experimento** que agrupa todas as métricas, eventos de parse JSON e eventos de conexão.

## 🤝 Ações Disponíveis

| Ação | Descrição |
|------|-----------|
| `FALAR` | Envia mensagem no chat |
| `ANDAR` | Move em uma direção (frente, trás, esquerda, direita) |
| `EXPLORAR` | Movimento aleatório de exploração |
| `PULAR` | Faz o bot pular |
| `OLHAR` | Olha para jogadores próximos |
| `PARAR` | Para qualquer movimento |
| `SEGUIR` | Segue um jogador específico (`alvo`) |
| `FUGIR` | Corre na direção oposta a uma entidade (`alvo`) |
| `COLETAR` | Minera/coleta bloco próximo |
| `ATACAR` | Ataca entidade próxima |
| `NADA` | Apenas observa |

## 🎯 Modo Benchmark

Executa cenários fixos contra o modelo LLM **sem precisar de servidor Minecraft**. Ideal para comparar modelos, quantizações e hardwares de forma reproduzível.

### Executando

```bash
# Benchmark com configuração padrão (3 warm-up + 10 reps x 15 cenários)
pnpm benchmark

# Configuração customizada
pnpm benchmark --reps 20 --warmup 5
```

### Como funciona

1. **Warm-up**: N rodadas de aquecimento (métricas descartadas) para eliminar cold start
2. **Sessão**: Cria uma `ExperimentSession` no banco com metadados do modelo e hardware
3. **Cenários**: 15 cenários padronizados cobrindo sobrevivência, social, exploração, combate e anti-loop
4. **Registro**: Cada resposta do modelo gera métricas de LLM, evento de parse JSON e validação da ação

### Cenários incluídos

| Categoria | Exemplos | Ação esperada |
|-----------|----------|---------------|
| Sobrevivência | Vida baixa + mob perto | FUGIR |
| Sobrevivência | Vida baixa + sem mobs | FALAR, COLETAR |
| Social | Jogador falou no chat | FALAR |
| Social | Jogador perto sem interação | SEGUIR, OLHAR, FALAR |
| Exploração | Inventário vazio | COLETAR, EXPLORAR |
| Exploração | Blocos interessantes perto | COLETAR |
| Anti-loop | 3x ANDAR seguido | Qualquer exceto ANDAR |
| Combate | Mob hostil próximo | ATACAR, FUGIR |
| Inatividade | Tudo calmo + inventário cheio | EXPLORAR, FALAR |

### Resultado

O benchmark imprime um resumo com taxa de acerto, taxa de JSON válido/reparado/falho e tempo médio de resposta. Todos os dados ficam no banco, filtrável por sessão.

## 📊 Métricas e Sessões

### Dados coletados automaticamente

| Tabela | O que armazena |
|--------|----------------|
| `ExperimentSession` | Sessão completa: modelo, quantização, hardware, contadores de JSON válido/reparado/falho |
| `Metric` | Cada chamada LLM: tokens (provider + local), tokens/segundo, tempo de resposta, hardware antes/depois |
| `ActionMetric` | Cada ação do bot: tipo, sucesso/falha, tempo de execução |
| `ParseEvent` | Cada tentativa de parse JSON: status, resposta bruta, erro |
| `ConnectionEvent` | Conexões, desconexões, kicks, mortes — com timestamp e motivo |

### Tokenizer local

O sistema usa `gpt-tokenizer` (cl100k_base) para contagem de tokens **independente do provider**. Isso garante comparações justas entre Ollama, Groq e qualquer outro provider — cada um reporta tokens de forma diferente, mas a contagem local é sempre consistente.

Campos no banco:
- `inputTokens` / `outputTokens` — do provider (pode ser `null`)
- `localInputTokens` / `localOutputTokens` — sempre presente
- `tokensPerSecond` — calculado: `localOutputTokens / (responseTime)`

### Metadados do modelo (Ollama)

Para o provider Ollama, metadados são capturados automaticamente via API:
- **Família** (qwen3, llama, etc.)
- **Tamanho** (8B, 70B, etc.)
- **Quantização** (Q4_K_M, Q8_0, etc.)
- **VRAM alocada** (via `/api/ps`)
- **Tamanho do contexto**

### Visualização

```bash
pnpm db:studio   # abre Prisma Studio no browser para visualizar os dados
```

## 📤 Exportação de Dados

Exporta métricas para CSV e JSON, prontas para análise com pandas/matplotlib.

```bash
# Exporta tudo
pnpm metrics:export

# Filtra por sessão
pnpm metrics:export --session <id>

# Filtra por modelo
pnpm metrics:export --model qwen3

# Apenas summary JSON (sem CSVs)
pnpm metrics:summary
```

### Arquivos gerados em `exports/`

| Arquivo | Conteúdo |
|---------|----------|
| `sessions.csv` | Uma linha por sessão |
| `llm_metrics.csv` | Uma linha por chamada LLM |
| `action_metrics.csv` | Uma linha por ação executada |
| `parse_events.csv` | Uma linha por tentativa de parse |
| `connection_events.csv` | Uma linha por evento de conexão |
| `summary.json` | Agregações por sessão (médias, medianas, percentis, distribuição de ações) |

### Formato do `summary.json`

```json
{
  "session_id": "...",
  "model": "qwen3:8b",
  "quantization": "Q4_K_M",
  "hardware": "AMD Ryzen 5 5600X + RTX 3060",
  "total_cycles": 150,
  "metrics": {
    "avg_tokens_per_second": 42.3,
    "median_tokens_per_second": 41.8,
    "p95_response_time_ms": 2340,
    "avg_response_time_ms": 1850,
    "json_valid_rate": 0.92,
    "json_repaired_rate": 0.06,
    "json_failed_rate": 0.02,
    "avg_output_tokens": 85
  },
  "action_distribution": {
    "EXPLORAR": 45,
    "FALAR": 23,
    "ANDAR": 18
  }
}
```

## 🔌 Adicionando um Novo Provider

1. Crie `src/providers/providers/NovoProvider.ts`:

```typescript
import { BaseLLMProvider } from '../BaseLLMProvider';
import { ChatMessage, InvokeOptions } from '../../types/types';

export class NovoProvider extends BaseLLMProvider {
  readonly providerName = 'NovoProvider';
  readonly modelName: string;

  constructor(config: any) {
    super();
    this.modelName = config.model;
    // inicializa SDK...
  }

  protected async callModel(messages: ChatMessage[], options?: InvokeOptions) {
    const result = await this.sdk.chat(messages);
    return {
      content: result.text,
      inputTokens: result.usage?.input,
      outputTokens: result.usage?.output,
    };
  }
}
```

2. Adicione o `case` em `src/providers/ProviderFactory.ts`
3. Adicione as configurações em `settings.ts` e `.env`
4. (Opcional) Implemente `ModelInfoProvider` para capturar metadados do modelo automaticamente

> Timing, contagem local de tokens e enfileiramento de métricas são automáticos — o `BaseLLMProvider` cuida disso.

## 🎛️ Configurações

Todas as configurações ficam em `src/config/settings.ts`:

```typescript
export const metricsConfig = {
  batchFlushIntervalMs: 10_000,   // flush a cada 10s
  batchMaxSize: 20,               // ou ao acumular 20 itens
  hardwarePollIntervalMs: 5_000,  // throttle do HardwareMonitor
};

export const agentConfig = {
  loopIntervalMs: 3_000,          // intervalo entre ciclos
  shortTermMemorySize: 15,        // tamanho do ring buffer de memória
  perceptionBlockRadius: 8,       // raio de percepção de blocos
  perceptionEntityRadius: 16,     // raio de percepção de entidades
};

export const benchmarkConfig = {
  warmupRounds: 3,                // rodadas de warm-up
  repetitionsPerScenario: 10,     // repetições por cenário
  enabled: false,                 // ativado via BENCHMARK_MODE=true
};
```

### Trocando o Provider de IA

```env
# Groq
LLM_PROVIDER=groq
GROQ_MODEL=llama-3.3-70b-versatile

# Ollama local
LLM_PROVIDER=ollama
OLLAMA_MODEL=qwen3:8b
OLLAMA_BASE_URL=http://localhost:11434
```

> Para ver modelos Ollama disponíveis: `ollama list`

### Modificando o Comportamento

- **Personalidade / raciocínio**: edite `src/prompts/botPrompts.ts`
- **Validação de ações**: edite `src/schemas/botAction.ts`
- **Percepção**: ajuste os raios em `agentConfig` ou edite `PerceptionManager.ts`
- **Cenários de benchmark**: edite `src/benchmark/scenarios.json`

## 🐛 Solução de Problemas

**Bot não conecta**
- Verifique se o servidor Minecraft está rodando
- Confirme host e porta no `.env`
- Para servidores online, use `BOT_AUTH=microsoft`

**Erro de conexão com banco**
- Verifique se `DATABASE_URL` está correta no `.env`
- Confirme que o projeto Neon está ativo no console
- Execute `pnpm db:push` para garantir que as tabelas existem

**Erro de API Key**
- Verifique se `GROQ_API_KEY` está definida
- Confirme créditos disponíveis em https://console.groq.com

**Bot responde com JSON inválido (modelos locais)**
- O `jsonParser` com `jsonrepair` tenta corrigir automaticamente
- Se persistir, tente um modelo mais capaz ou ajuste o prompt em `botPrompts.ts`
- Verifique a taxa de JSON válido/reparado/falho via `pnpm metrics:summary`

**Bot preso em loop repetindo a mesma ação**
- A memória de curto prazo é injetada no prompt exatamente para evitar isso
- Verifique se o `MemoryManager` está sendo alimentado corretamente no `AgentLoop`

**Benchmark mostra taxa de acerto baixa**
- Modelos menores (< 7B) tendem a ter dificuldade com o formato JSON exigido
- Tente ajustar o prompt ou usar uma quantização mais alta

## 📦 Dependências Principais

| Pacote | Uso |
|--------|-----|
| `mineflayer` | Controle do bot no Minecraft |
| `@langchain/groq` | Integração com Groq |
| `@langchain/ollama` | Integração com Ollama |
| `@prisma/client` | ORM para PostgreSQL |
| `systeminformation` | Coleta de dados de hardware |
| `gpt-tokenizer` | Contagem local de tokens (cl100k_base) |
| `jsonrepair` | Reparo de JSON mal-formado |
| `zod` | Validação de schemas |
| `tsx` | Execução TypeScript (dev) |

## 📜 Licença

MIT

## 🙏 Créditos

- jvras58

## 📜 Referências

- [Mineflayer](https://github.com/PrismarineJS/mineflayer)
- [LangChain JS](https://js.langchain.com/)
- [Groq](https://groq.com/)
- [Neon PostgreSQL](https://neon.tech/)
- [Modelos disponíveis (LangChain)](https://js.langchain.com/docs/integrations/chat/)
