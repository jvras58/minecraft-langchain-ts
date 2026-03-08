# Sistema de Métricas - Minecraft LangChain Template

## Visão Geral
O sistema de métricas é responsável por coletar, armazenar e analisar dados de performance das interações com provedores de IA (Groq e Ollama). Ele registra informações sobre tempo de resposta, uso de tokens, dados de hardware e ações executadas pelo bot.

## O que Foi Implementado

### 1. Modelo de Dados (Prisma)

**Banco**: PostgreSQL via Neon (configurado em `DATABASE_URL`).

**Tabela `Metric`** — métricas de cada chamada ao LLM:
| Campo | Tipo | Descrição |
|---|---|---|
| `id` | String (cuid) | Identificador único |
| `userBotId` | String | Referência ao bot que gerou a métrica |
| `timestamp` | DateTime | Data/hora da coleta |
| `provider` | String | Nome do provedor (Groq / Ollama) |
| `model` | String | Modelo específico usado |
| `inputTokens` | Int? | Tokens de entrada (extraído da API) |
| `outputTokens` | Int? | Tokens de saída (extraído da API) |
| `responseTime` | Float | Tempo de resposta em **segundos** |
| `gpuName` | String? | Nome da GPU no momento da chamada |
| `cpuName` | String? | Nome da CPU no momento da chamada |
| `os` | String? | Sistema operacional |
| `taskName` | String? | Nome da tarefa associada (opcional) |
| `environment` | Json | Snapshot detalhado de hardware (ver abaixo) |

**Tabela `ActionMetric`** — métricas de cada ação executada pelo bot:
| Campo | Tipo | Descrição |
|---|---|---|
| `action` | String | Tipo de ação (FALAR, ANDAR, PULAR, etc.) |
| `success` | Boolean | Se a ação foi executada com sucesso |
| `executionTime` | Float | Tempo de execução em ms |
| `errorMessage` | String? | Mensagem de erro, se houver |

**Tabela `UserBot`** — referência ao bot:
- Relaciona `Metric` e `ActionMetric` via `userBotId`

### 2. Fluxo de Coleta de Métricas

A coleta acontece em três camadas independentes:

```
Provider (callModel)
   └─> BaseLLMProvider.invoke()   ← mede responseTimeMs com performance.now()
         └─> MetricsBatcher.pushLLMMetric()   ← enfileira sem bloquear
               └─> HardwareMonitor.getSnapshot()  ← snapshot de hardware (throttled)
                     └─> flush() a cada 10s ou 20 métricas   ← escreve no banco em lote
```

#### `BaseLLMProvider` (`src/providers/BaseLLMProvider.ts`)
- Classe abstrata que todos os providers estendem
- Mede o tempo de resposta automaticamente via `performance.now()` antes e após `callModel()`
- Chama `MetricsBatcher.pushLLMMetric()` de forma **fire-and-forget** (não bloqueia a resposta ao agente)
- Cada provider implementa `callModel()` e retorna `{ content, inputTokens, outputTokens }`

#### Extração de Tokens por Provider
- **Groq**: extraído de `result.response_metadata` → `token_usage` → campos `prompt_tokens` / `completion_tokens`
- **Ollama**: extraído de `result.response_metadata` → campos `prompt_eval_count` / `eval_count`
- Campos opcionais (`Int?`): se a API não retornar, o registro é salvo com `null`

### 3. `MetricsBatcher` (`src/metrics/MetricsBatcher.ts`)

Acumula métricas em memória e grava no banco em **lotes via transação única**, reduzindo o I/O em ~95%.

- **Singleton**: uma instância compartilhada em todo o processo
- **Fila dupla**: `llmQueue` (métricas LLM) e `actionQueue` (métricas de ação)
- **Flush automático**: a cada `batchFlushIntervalMs` (padrão: **10s**) via `setInterval`
- **Flush por tamanho**: quando a fila acumula `batchMaxSize` itens (padrão: **20**)
- **Transação única**: todas as escritas pendentes são feitas em um único `prisma.$transaction()`
- O timer usa `.unref()` para não impedir o processo de encerrar normalmente

```typescript
// Configuração em src/config/settings.ts
export const metricsConfig = {
  batchFlushIntervalMs: 10_000,   // flush a cada 10s
  batchMaxSize: 20,               // ou ao acumular 20 itens
  hardwarePollIntervalMs: 5_000,  // throttle do HardwareMonitor
};
```

### 4. `HardwareMonitor` (`src/metrics/HardwareMonitor.ts`)

Coleta dados de hardware com **cache agressivo em duas camadas**:

- **Info estática** (coletada uma única vez por processo): modelo de CPU, GPU, SO, RAM total
- **Info dinâmica** (throttled por `hardwarePollIntervalMs`, padrão 5s): % de CPU, RAM livre, temperatura e uso da GPU

```json
// Estrutura do campo environment salvo no banco
{
  "cpu":    { "manufacturer": "AMD", "brand": "Ryzen 9", "cores": 16, "speed": 3.7 },
  "memory": { "total": 34359738368 },
  "gpu":    [{ "model": "RTX 4070", "vendor": "NVIDIA", "vram": 12288 }],
  "dynamic": {
    "cpuUsage": 34.2,
    "ramUsed": 12345678,
    "ramFree": 21985432,
    "gpuUsage": 12,
    "gpuTemp": 51
  }
}
```

- Biblioteca: `systeminformation`
- O snapshot é capturado no momento do `pushLLMMetric()`, não no flush

### 5. Armazenamento
- **Banco PostgreSQL (Neon)**: via Prisma ORM
- **Instância Singleton**: `src/utils/db.ts` exporta um único `PrismaClient`
- **Índices**: `(userBotId, timestamp)`, `provider`, `taskName` para queries eficientes

## Como Usar

### Inicialização
O `MetricsBatcher` precisa ser iniciado junto com o agente:
```typescript
import { MetricsBatcher } from './metrics/MetricsBatcher';

MetricsBatcher.getInstance().start();
```

### Coleta Automática via Providers
Nenhuma configuração adicional é necessária. Ao chamar `provider.invoke()`, as métricas são capturadas automaticamente:
```typescript
const response = await provider.invoke(messages, {
  userBotId: 'id-do-bot',
  taskName: 'decisao-principal', // opcional
});
// response.tokenUsage.inputTokens, response.responseTimeMs disponíveis
```

### Métricas de Ação
Chamadas pelo `ActionExecutor` diretamente:
```typescript
MetricsBatcher.getInstance().pushActionMetric({
  userBotId,
  action: result.action,
  success: result.success,
  executionTimeMs: result.executionTime,
});
```

### Ver Dados
```bash
pnpm db:studio   # abre Prisma Studio no browser
pnpm db:push     # aplica schema no banco
pnpm db:generate # regenera Prisma Client
```

## Objetivos e Próximos Passos

### Objetivos
- Monitorar performance dos provedores de IA em hardware real
- Correlacionar latência com uso de CPU/GPU no momento da chamada
- Rastrear taxa de sucesso das ações do bot
- Fornecer dados para decisões sobre escolha de provedor/modelo

### Próximos Passos
- **Dashboard Web**: Interface para visualizar métricas em tempo real
- **Análises Estatísticas**: Médias, medianas, distribuições por provider/modelo
- **Comparação de Modelos**: Gráficos de performance entre Groq e Ollama
- **Exportação**: Relatórios em CSV/JSON
- ~~**Banco de Dados Online**~~: ✅ Migrado para PostgreSQL Neon
- ~~**Integração com LangChain Callbacks**~~: Removido — tokens extraídos diretamente do `response_metadata`

---

## Decisões de Design

### Batch de Métricas em vez de Escrita Imediata
Cada escrita no banco envolve I/O de disco e lock de conexão. Com Ollama local, o bot pode gerar 10+ métricas LLM por minuto. Escrever em lote reduz o overhead de ~95% sem perda de dados (as métricas ficam em memória até o flush).

### Hardware Snapshot no Enfileiramento, não no Flush
O snapshot de hardware é capturado no `pushLLMMetric()` para registrar o estado *no momento da chamada*, não segundos depois. A info dinâmica é throttled para evitar chamadas excessivas a `systeminformation`.

### Info Estática vs. Dinâmica Separadas
CPU model e GPU model raramente mudam durante execução — são coletados uma única vez e reutilizados. Já CPU%, RAM livre e GPU temp variam constantemente e são re-coletados via throttle de 5s.

### Tokens como `Int?` (nullable)
Nem todos os providers retornam contagem de tokens (ex: Ollama em alguns modos). Usar `Int?` em vez de estimativas garante que o dado salvo seja sempre real ou ausente — nunca fabricado.

