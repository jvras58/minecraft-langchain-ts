Este documento descreve a arquitetura do projeto usando o [modelo C4](https://c4model.com/diagrams) (Context, Container, Component, Code) com diagramas [Mermaid](https://www.mermaidchart.com/app/dashboard). O projeto é um bot autônomo para Minecraft que utiliza IA para tomar decisões, baseado em percepções do ambiente.

## 1. Context Diagram (C1)

Visão geral do sistema, mostrando os atores externos e o sistema principal.

```mermaid
graph TD
    A[Jogador de Minecraft] --> B[Servidor Minecraft]
    B --> C[Bot de Minecraft com IA]
    C --> D["Provedor de IA (Groq/Ollama)"]
    E[Administrador] --> C
```

- **Jogador de Minecraft**: Interage com o bot no servidor.
- **Servidor Minecraft**: Ambiente onde o bot opera.
- **Bot de Minecraft com IA**: Sistema principal que controla o bot.
- **Provedor de IA**: Fornece inteligência para decisões (Groq ou Ollama).
- **Administrador**: Configura e monitora o sistema.

## 2. Container Diagram (C2)

Mostra os containers (aplicações e serviços) e suas interações.

```mermaid
graph TD
    subgraph "Aplicação Node.js (Bot)"
        F[GameLoop] --> G[BotManager]
        F --> H[ActionExecutor]
        F --> I[PerceptionManager]
        F --> J[LLMProvider]
        G --> K[Mineflayer]
    end
    M[Servidor Minecraft] --> K
    N[Provedor de IA] --> J
    O["Configurações (.env)"] --> F
```

- **Aplicação Node.js**: Executa o bot em TypeScript.
  - GameLoop: Coordena o loop de percepção → pensamento → ação.
  - BotManager: Gerencia conexão com Minecraft via Mineflayer.
  - ActionExecutor: Executa ações decididas que Controla movimento do bot.
  - PerceptionManager: Coleta dados do ambiente.
  - LLMProvider: Interface com IA (Groq ou Ollama).
- **Servidor Minecraft**: Hospeda o mundo e jogadores.
- **Provedor de IA**: API externa para geração de decisões.
- **Configurações**: Arquivo .env para parâmetros.

## 3. Component Diagram (C3)

Detalha os componentes dentro do container principal (Aplicação Node.js).

```mermaid
graph TD
    A[GameLoop] --> B[runLoop]
    A --> C[pensar]
    A --> D[onBotConnected]
    B --> E[PerceptionManager.getGameContext]
    C --> F[LLMProvider.invoke]
    F --> G[botActionSchema.parse]
    D --> H[ActionExecutor.constructor]
    D --> I[PerceptionManager.constructor]
    K[BotManager] --> L[createBot]
    L --> M[mineflayer.createBot]
    M --> N[setupEventHandlers]
    N --> O["bot.on('spawn')"]
    N --> P["bot.on('chat')"]
    N --> Q["bot.on('death')"]
    N --> R["bot.on('end')"]
    N --> S["bot.on('physicsTick')"]
```

- **GameLoop**: Loop principal com métodos para executar o ciclo.
- **BotManager**: Gerencia eventos e reconexão.
- **ActionExecutor**: Executa ações como andar, falar, etc Controla movimento e navegação.
- **PerceptionManager**: Coleta contexto (vida, posição, etc.).
- **LLMProvider**: Abstração para provedores de IA.

## 4. Code Diagram (C4)

Diagrama de classes mostrando as principais classes e suas relações.

```mermaid
classDiagram
    class GameLoop {
        +start()
        +stop()
        -runLoop()
        -pensar()
        -onBotConnected()
        -onBotDisconnected()
    }
    class BotManager {
        +createBot()
        +getBot()
        +isConnected()
        -setupEventHandlers()
    }
    class ActionExecutor {
        +executarAcao()
        -olharAoRedor()
    }
    class PerceptionManager {
        +getGameContext()
    }
    class BaseLLMProvider {
        <<abstract>>
        +invoke()
    }
    class GroqProvider {
        +invoke()
    }
    class OllamaProvider {
        +invoke()
    }
    GameLoop --> BotManager
    GameLoop --> ActionExecutor
    GameLoop --> PerceptionManager
    GameLoop --> BaseLLMProvider
    ActionExecutor --> BotManager
    BaseLLMProvider <|-- GroqProvider
    BaseLLMProvider <|-- OllamaProvider
```

- Relações baseadas em dependências: GameLoop usa BotManager, ActionExecutor, etc.
- Provedores de IA herdam de BaseLLMProvider.

- Use a [extensão](https://marketplace.visualstudio.com/items?itemName=bierner.markdown-mermaid) para reproduzir os diagramas direto pelo readme