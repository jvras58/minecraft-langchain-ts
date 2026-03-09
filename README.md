# 🤖 Bot Autônomo de Minecraft com IA

Bot inteligente para Minecraft com arquitetura modular, memória de curto prazo e sistema de métricas eficiente. Usa LangChain com provedores de IA intercambiáveis (Groq, Ollama, etc.) para tomar decisões autônomas no jogo.

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
├── bot/                         # Camada Minecraft
│   ├── ActionExecutor.ts        # Executa ações (FALAR, ANDAR, SEGUIR, FUGIR, COLETAR, ATACAR...)
│   ├── BotManager.ts            # Conexão e eventos do bot
│   ├── MovementManager.ts       # Controle de movimento (follow, flee, explorar)
│   └── PerceptionManager.ts     # Percepção rica (inventário, blocos, entidades, bioma)
├── config/
│   └── settings.ts              # Configurações centralizadas (bot, LLM, métricas, agente)
├── core/                        # Lógica principal
│   ├── AgentLoop.ts             # Loop: Percepção → Memória → Raciocínio → Ação
│   └── MemoryManager.ts         # Memória de curto prazo (ring buffer)
├── metrics/                     # Sistema de métricas
│   ├── MetricsBatcher.ts        # Fila em memória com flush em lote
│   └── HardwareMonitor.ts       # Snapshot de hardware com cache agressivo
├── providers/                   # Provedores de IA
│   ├── BaseLLMProvider.ts       # Base com timing e métricas automáticas
│   ├── ProviderFactory.ts       # Factory via configuração
│   └── providers/
│       ├── GroqProvider.ts      # Extrai tokens do response_metadata
│       └── OllamaProvider.ts    # Extrai tokens do formato Ollama
├── prompts/
│   └── botPrompts.ts            # Prompts com chain-of-thought e memória
├── schemas/
│   └── botAction.ts             # Schema Zod com campo "raciocinio" e novas ações
├── types/
│   └── types.ts                 # Interfaces completas (GameContext, MemoryEntry, etc.)
├── utils/
│   ├── db.ts                    # Prisma singleton
│   ├── jsonParser.ts            # Parse resiliente com jsonrepair
│   └── sleep.ts
└── index.ts                     # Bootstrap com graceful shutdown
```

## 🎮 Como Funciona

O bot opera em um ciclo de 4 etapas a cada 3 segundos:

1. **Percepção** 👁️ — Coleta `GameContext` completo: vida, fome, posição, inventário, entidades próximas, blocos notáveis, bioma, clima
2. **Memória** 🗂️ — Injeta no prompt as últimas 15 entradas do ring buffer (ações, eventos, interações)
3. **Raciocínio** 🧠 — Envia contexto + memória ao LLM; o modelo retorna JSON com `raciocinio` e `acao`
4. **Ação** 🎯 — Executa a ação, registra resultado na memória e enfileira métricas

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

> Timing e enfileiramento de métricas são automáticos — o `BaseLLMProvider` cuida disso.

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

## 📊 Métricas

O sistema salva automaticamente em PostgreSQL:
- **`Metric`**: latência, tokens (input/output), provider, modelo, snapshot de hardware
- **`ActionMetric`**: tipo de ação, sucesso/falha, tempo de execução

Métricas são acumuladas em memória e gravadas em lote (transação única) para minimizar I/O.

```bash
pnpm db:studio   # abre Prisma Studio no browser para visualizar os dados
```

Veja [prisma/implementacao.md](prisma/implementacao.md) para detalhes do sistema de métricas.

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

**Bot preso em loop repetindo a mesma ação**
- A memória de curto prazo é injetada no prompt exatamente para evitar isso
- Verifique se o `MemoryManager` está sendo alimentado corretamente no `AgentLoop`

## 📦 Dependências Principais

| Pacote | Uso |
|--------|-----|
| `mineflayer` | Controle do bot no Minecraft |
| `@langchain/groq` | Integração com Groq |
| `@langchain/ollama` | Integração com Ollama |
| `@prisma/client` | ORM para PostgreSQL |
| `systeminformation` | Coleta de dados de hardware |
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

