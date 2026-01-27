# Decisões Técnicas - POC Minecraft Bot

## Escolha Inicial: Python com Framework Agno

Na fase inicial da POC, optei por usar **Python** com a framework **Agno** para criação de agentes inteligentes no bot do Minecraft.

[Link](https://github.com/jvras58/Bot-Minecraft-Agno-mineflayer)

### Motivos da Escolha:
- **Facilidade de Conexão com Modelos**: Agno oferece integração simples com diversos modelos de IA, similar ao que o LangChain proporciona.
- **Ecossistema Python**: Linguagem familiar e rica em bibliotecas para IA e automação.

## Abandono do Python e Migração para Node.js

Decidi abandonar o Python devido a limitações críticas na integração com Minecraft.

### Problemas Identificados:
- **Falta de Biblioteca Completa**: Não existe uma biblioteca tão robusta quanto **Mineflayer** para Python. Mineflayer é a biblioteca de referência para controle de bots em Minecraft, mas está disponível apenas para Node.js.
- **Integração Cruzada**: Embora seja tecnicamente possível usar Mineflayer no Python via `require(mineflayer)`, isso introduziria duas linguagens no mesmo projeto (Python + JavaScript), complicando a manutenção e deployment.
- **Não Justificável**: A vantagem do Agno não compensa a complexidade de misturar linguagens, especialmente quando o **LangChain** (já usado neste projeto) pode substituir facilmente as funcionalidades do Agno.

### Benefícios da Migração para Node.js:
- **Integração Nativa**: Mineflayer funciona perfeitamente em Node.js/TypeScript.
- **Ecossistema Consistente**: Todo o projeto em uma única linguagem, facilitando desenvolvimento e debugging.
- **Performance**: Melhor para aplicações em tempo real como bots de jogos.

## Decisão: Arquitetura Extensível

Optei por deixar o repositório inicial **bem fácil de implementar mais coisas**, como:
- Novos modelos de IA
- Comandos adicionais
- Funcionalidades customizadas

### Implementação:
- **Provedores Modulares**: Estrutura em `providers/` permite adicionar novos provedores de LLM facilmente (ex: GroqProvider, OllamaProvider).
- **Schemas Flexíveis**: Uso de schemas Zod para validação de ações, facilitando expansão.
- **Configurações Centralizadas**: Arquivo `settings.ts` para configurações globais.
- **Separação de Responsabilidades**: Módulos distintos para BotManager, ActionExecutor, PerceptionManager, etc.

### Benefícios:
- **Facilidade de Contribuição**: Novos desenvolvedores podem adicionar funcionalidades sem refatorar o core.
- **Manutenibilidade**: Código organizado e documentado.
- **Escalabilidade**: Estrutura preparada para crescimento do projeto.

## Conclusão

A migração para Node.js/TypeScript com LangChain foi essencial para manter a simplicidade e eficiência do projeto, priorizando a integração robusta com Minecraft via Mineflayer. A arquitetura extensível garante que o template possa evoluir facilmente para incluir novas funcionalidades de IA e comandos.

## Substituição do MovementManager pelo ActionExecutor

Inicialmente, o projeto utilizava o arquivo `MovementManager.ts` para gerenciar os movimentos do bot, que funcionava bem para ações básicas de locomoção. No entanto, para aumentar a flexibilidade e eficiência das interações no Minecraft, optamos por substituir essa implementação pela adoção direta dos plugins no `ActionExecutor.ts`, que integra plugins avançados do Mineflayer.

### Plugins Utilizados:
- **mineflayer-pathfinder**: Permite navegação inteligente e planejamento de caminhos no mundo do Minecraft.
- **mineflayer-collectblock**: Especializado em detectar blocos específicos e realizar coleta/mineração automática.
- **mineflayer-tool**: Facilita o gerenciamento e uso de ferramentas para otimizar tarefas como mineração.
- **mineflayer-auto-eat**: Mantém o bot vivo automaticamente, gerenciando a fome e consumindo alimentos quando necessário.

### Motivos da Substituição:
- **Maior Flexibilidade**: Os plugins oferecem funcionalidades especializadas que o `MovementManager` não conseguia replicar de forma eficiente, como mineração direcionada e manutenção automática da saúde.
- **Integração Nativa**: Esses plugins são projetados especificamente para o Mineflayer, garantindo melhor performance e compatibilidade.
- **Centralização de Ações**: O `ActionExecutor` consolida todas as ações do bot em um único módulo, simplificando a lógica e facilitando expansões futuras.

### Benefícios:
- **Funcionalidades Avançadas**: Permite ações mais complexas, como exploração inteligente e coleta automatizada de recursos.
- **Manutenibilidade Melhorada**: Código mais modular e fácil de atualizar com novos plugins.
- **Experiência de Jogo Otimizada**: O bot agora pode operar de forma mais autônoma e eficiente no ambiente do Minecraft.