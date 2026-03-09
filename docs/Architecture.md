Este documento descreve a arquitetura do projeto usando o [modelo C4](https://c4model.com/diagrams) (Context, Container, Component, Code) com diagramas [Mermaid](https://www.mermaidchart.com/app/dashboard). O projeto é um bot autônomo para Minecraft que utiliza IA para tomar decisões, baseado em percepções do ambiente.

> Use a [extensão Markdown Preview Mermaid](https://marketplace.visualstudio.com/items?itemName=bierner.markdown-mermaid) para visualizar os diagramas diretamente no VS Code.

## 1. Context Diagram (C1)

Visão geral do sistema, mostrando os atores externos e o sistema principal.

```mermaid
graph TD
    A[Jogador de Minecraft] --> B[Servidor Minecraft]
    B --> C[Bot Autônomo de Minecraft]
    C --> D["Provedor de IA (Groq / Ollama)"]
    C --> E[PostgreSQL - Neon]
    F[Administrador] --> C
```

- **Jogador de Minecraft**: Interage com o bot no servidor (chat, proximidade).
- **Servidor Minecraft**: Ambiente onde o bot opera via protocolo Mineflayer.
- **Bot Autônomo de Minecraft**: Sistema principal — percebe, raciocina, age e registra métricas.
- **Provedor de IA**: API externa (Groq) ou local (Ollama) para geração de decisões.
- **PostgreSQL (Neon)**: Banco cloud que armazena métricas de LLM e ações do bot.
- **Administrador**: Configura variáveis de ambiente e monitora o sistema.

## 2. Container Diagram (C2)

Mostra os containers (aplicações e serviços) e suas interações.

```mermaid
graph TD
    subgraph "Aplicação Node.js (Bot)"
        A[AgentLoop] --> B[BotManager]
        A --> C[ActionExecutor]
        A --> D[PerceptionManager]
        A --> E[MemoryManager]
        A --> F[BaseLLMProvider]
        B --> G[Mineflayer]
        C --> H[MovementManager]
        F --> I[MetricsBatcher]
        I --> J[HardwareMonitor]
    end
    K[Servidor Minecraft] --> G
    L["Provedor de IA (Groq/Ollama)"] --> F
    I --> M[PostgreSQL - Neon]
    N["Configurações (.env / settings.ts)"] --> A
```

- **AgentLoop**: Orquestra o ciclo Percepção → Memória → Raciocínio → Ação.
- **BotManager**: Gerencia conexão e eventos do bot via Mineflayer.
- **ActionExecutor**: Executa as ações decididas pela IA (incluindo SEGUIR, FUGIR, COLETAR, ATACAR).
- **PerceptionManager**: Coleta `GameContext` completo (inventário, entidades, blocos, bioma, clima).
- **MemoryManager**: Ring buffer de curto prazo — injeta histórico no prompt a cada ciclo.
- **BaseLLMProvider**: Abstração dos providers com timing e métricas automáticas.
- **MetricsBatcher**: Acumula métricas em memória e grava em lote no PostgreSQL.
- **HardwareMonitor**: Snapshot de hardware com cache (info estática 1x, dinâmica throttled 5s).
- **MovementManager**: Controla movimento, follow, flee e exploração.

## 3. Component Diagram (C3)

Detalha os componentes dentro do container principal (Aplicação Node.js).

```mermaid
graph TD
    subgraph AgentLoop
        AL1[loop] --> AL2[PerceptionManager.getContextString]
        AL1 --> AL3[pensar]
        AL3 --> AL4[BaseLLMProvider.invoke]
        AL4 --> AL5[safeParseJSON + botActionSchema.parse]
        AL1 --> AL6[ActionExecutor.executar]
        AL1 --> AL7[MemoryManager.recordAction]
        AL1 --> AL8[MetricsBatcher.pushActionMetric]
        AL9[onConnected] --> AL10[ActionExecutor.constructor]
        AL9 --> AL11[PerceptionManager.constructor]
    end

    subgraph MemoryManager
        MM1[add] --> MM2[ring buffer]
        MM3[recordAction] --> MM1
        MM4[recordEvent] --> MM1
        MM5[recordInteraction] --> MM1
        MM6[toPromptString] --> MM2
    end

    subgraph "MetricsBatcher + HardwareMonitor"
        MB1[pushLLMMetric] --> HM1[HardwareMonitor.getSnapshot]
        MB2[pushActionMetric] --> MB3[actionQueue]
        MB1 --> MB4[llmQueue]
        MB5[flush] --> MB6["prisma.$transaction()"]
    end

    subgraph BotManager
        BM1[createBot] --> BM2[mineflayer.createBot]
        BM2 --> BM3[setupEvents]
        BM3 --> BM4["bot.on('spawn')"]
        BM3 --> BM5["bot.on('chat')"]
        BM3 --> BM6["bot.on('death')"]
        BM3 --> BM7["bot.on('end')"]
    end

    AL4 --> MB1
    AL7 --> MM3
```

- **AgentLoop**: Ciclo principal; o campo `raciocinio` do JSON é logado antes de executar a ação.
- **MemoryManager**: Ring buffer em memória (zero I/O); serializado como string para o prompt.
- **MetricsBatcher**: Fila dupla (LLM + ação); flush periódico (10s) ou por tamanho (20 itens).
- **HardwareMonitor**: Info estática coletada uma vez; dinâmica throttled a cada 5s.
- **BotManager**: Eventos de reconexão automática e registro de `UserBot` no banco.

## 4. Code Diagram (C4)

Diagrama de classes mostrando as principais classes e suas relações.

```mermaid
classDiagram
    class AgentLoop {
        -provider: LLMProvider
        -memory: MemoryManager
        -batcher: MetricsBatcher
        +start()
        +stop()
        -loop()
        -pensar(contexto: string)
        -onConnected()
        -onDisconnected()
    }
    class MemoryManager {
        -entries: MemoryEntry[]
        -maxSize: number
        +add(tipo, resumo)
        +recordAction(acao, sucesso)
        +recordEvent(evento)
        +recordInteraction(jogador, msg)
        +toPromptString(): string
    }
    class MetricsBatcher {
        <<singleton>>
        -llmQueue: QueuedLLMMetric[]
        -actionQueue: QueuedActionMetric[]
        +start()
        +stop()
        +pushLLMMetric(data)
        +pushActionMetric(data)
        +flush()
        +shutdown()
    }
    class HardwareMonitor {
        <<singleton>>
        -staticInfo: StaticInfo
        -dynamicInfo: DynamicInfo
        +getSnapshot(): HardwareSnapshot
    }
    class BotManager {
        +createBot()
        +isConnected(): boolean
        +setCallbacks(onConnect, onDisconnect)
        -setupEventHandlers()
    }
    class ActionExecutor {
        +executar(decisao: BotAction): ActionResult
        -olharAoRedor()
        -coletarBlocoProximo(alvo?)
        -atacarEntidade(alvo?)
    }
    class MovementManager {
        +andarNaDirecao(direcao)
        +explorarAleatorio()
        +pararMovimento()
        +pular()
        +seguirJogador(nome)
        +fugirDeEntidade(nome)
    }
    class PerceptionManager {
        +getContextString(): string
        +getGameContext(): GameContext
    }
    class BaseLLMProvider {
        <<abstract>>
        +providerName: string
        +modelName: string
        +invoke(messages, options?): LLMResponse
        #callModel(messages, options?)*
    }
    class GroqProvider {
        #callModel(messages, options?)
    }
    class OllamaProvider {
        #callModel(messages, options?)
    }
    class ProviderFactory {
        +createLLMProvider(): LLMProvider
    }

    AgentLoop --> BotManager
    AgentLoop --> ActionExecutor
    AgentLoop --> PerceptionManager
    AgentLoop --> MemoryManager
    AgentLoop --> MetricsBatcher
    AgentLoop --> BaseLLMProvider
    ActionExecutor --> MovementManager
    BaseLLMProvider --> MetricsBatcher
    MetricsBatcher --> HardwareMonitor
    BaseLLMProvider <|-- GroqProvider
    BaseLLMProvider <|-- OllamaProvider
    ProviderFactory ..> GroqProvider : cria
    ProviderFactory ..> OllamaProvider : cria
```

- **AgentLoop** orquestra todos os componentes; substituiu o `GameLoop` monolítico.
- **MemoryManager** é injetado no prompt via `toPromptString()` — sem I/O.
- **BaseLLMProvider** mede tempo e enfileira métricas automaticamente em todo provider concreto.
- **MetricsBatcher** recebe dados de `BaseLLMProvider` (LLM) e `AgentLoop` (ações) e grava em lote.
- **ProviderFactory** instancia o provider correto via `LLM_PROVIDER` no `.env`.