# Checkpoint

## 1. Interface Web Central (Anfitrião)

Implementar uma interface web que funcione como anfitrião central para delegar tarefas aos bots conectados.

### Funcionalidades:
- **Delegação de Tarefas**: Comandos como "Busque um bloco" são convertidos em prompts e enviados para todos os bots conectados.
- **Conexão via URL**: Usuários inserem a URL do servidor Minecraft (ex: 192.168.x.x ou IP público) na interface, não localhost.
- **Modo de Jogo**: Transformar em um "modo de jogo" para essa configuração improvisada.

### Implementação:
- Bots se conectam ao anfitrião e recebem prompts via link de conexão.

## 2. Modo de Puzzle Ético

Implementar um modo onde o bot participa de puzzles éticos em equipes.

### Exemplo de Puzzle:
- **Dilema do Trem Desgovernado**: O trem está desgovernado e há duas opções:
  - Passar por cima de 5 crianças
  - Passar por cima de 1 idoso
- **Variação**: Trocar o idoso pelo "servidor dela" (do usuário), que automaticamente desliga o servidor se escolhido.

### Objetivo:
- Testar capacidades éticas e de tomada de decisão das LLMs.
- Integrar com o bot Minecraft para simular cenários interativos.

### Implementação:
- Criar prompts específicos para dilemas éticos.
- Integrar lógica no bot para processar respostas e executar ações baseadas nas decisões (ex: ações no jogo ou comandos do sistema).

## 3. Coleta de Métricas

Implementar sistema para coletar e analisar métricas de uso das LLMs.

### Métricas a Coletar:
- **Tokens Recebidos**: Quantidade de tokens de entrada por prompt.
- **Tokens Produzidos**: Quantidade de tokens de saída gerados.
- **Tempo de Resposta**: Latência das respostas das LLMs.
- **Modelo Usado**: Qual modelo de LLM foi utilizado (ex: GPT, Groq, Ollama).
- **Ambiente**: Detalhes do hardware/notebook/PC onde está rodando (CPU, GPU, memória).

### Implementação:
- Integrar logging em todos os provedores de LLM (GroqProvider, OllamaProvider, etc.).
- Usar bibliotecas como `performance-now` ou timers nativos para medir tempo.
- Armazenar métricas em banco de dados simples (ex: SQLite) ou logs estruturados.
- Possibilitar visualização via dashboard na interface web.
