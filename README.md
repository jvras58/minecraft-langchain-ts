# 🤖 Bot de Minecraft com IA (Arquitetura Escalável)

Bot inteligente para Minecraft que usa LangChain com provedores de IA intercambiáveis (Groq, Ollama, etc.) para tomar decisões autônomas no jogo.

## 🚀 Recursos

- ✅ **100% Node.js/TypeScript** - Código moderno e type-safe
- 🧠 **IA Modular** - Troque facilmente entre Groq, Ollama ou outros provedores
- 🔍 **Validação com Zod** - Schemas robustos para ações do bot
- 📝 **Prompts Configuráveis** - Templates de prompt fáceis de modificar
- 🎮 **Controle total do Minecraft** - Mineflayer para todas as ações
- 🔄 **Reconexão automática** - Se cair, reconecta sozinho
- 💬 **Interação no chat** - Responde de forma sarcástica
- 👀 **Percepção do ambiente** - Monitora vida, fome, jogadores próximos

## 📋 Pré-requisitos

- Node.js 18+ instalado
- Servidor Minecraft Java Edition rodando (local ou remoto)
- Chave da API do Groq ([obtenha aqui](https://console.groq.com/keys)) ou Ollama instalado

## 🔧 Instalação

### 1. Clone ou baixe o projeto

```bash
git clone https://github.com/jvras58/minecraft-langchain-ts-template.git
cd minecraft-langchain-ts-template
```

### 2. Instale as dependências

```bash
pnpm install
```

### 3. Configure as variáveis de ambiente

Copie o arquivo `.env.example` para `.env` e configure:

```bash
cp .env.example .env
```

Edite o `.env` com suas configurações:

```env
# Escolha o provedor de IA
LLM_PROVIDER=groq  # ou 'ollama'

# Para Groq (na escolha de um modelo que não esteja disponivel localmente e obrigatorio passar a key)
GROQ_API_KEY=sua-chave-aqui

# Para Ollama(caso opte por uma versão local é necessario passar corretamente o modelo)
# o olhama oferece o olhama list para mostrar os modelos disponiveis localmente instalados.
OLLAMA_MODEL=llama2

# Configurações do Minecraft
MINECRAFT_HOST=localhost
MINECRAFT_PORT=25565
BOT_USERNAME=MeuBot
BOT_AUTH=offline
```
## Setup Inicial (Obrigatório)

Antes de rodar o projeto pela primeira vez, execute os comandos abaixo para configurar o Prisma:

```bash
# 1. Gerar o Prisma Client (necessário após clonar o repo ou alterar o schema)
npx prisma generate

# 2. Criar/atualizar o banco de dados SQLite(Por enquanto) com base no schema
npx prisma db push
```

> [!IMPORTANT]
> Esses comandos são **obrigatórios** para o projeto funcionar. Sem eles, o Prisma Client não será gerado e o banco de dados não existirá.

**Quando executar novamente:**
- `prisma generate`: Sempre que o `schema.prisma` for alterado
- `prisma db push`: Sempre que houver mudanças no modelo de dados

**Verificar dados:**
- Use Prisma Studio: `npx prisma studio`

## 🏗️ Arquitetura

O projeto usa uma arquitetura modular e escalável:

```
src/
├── bot/              # Lógica específica do Minecraft
│   ├── ActionExecutor.ts    # Executa ações do bot
│   ├── BotManager.ts        # Gerencia conexão e eventos do bot
│   ├── MovementManager.ts   # Controla movimento e navegação
│   └── PerceptionManager.ts # Coleta dados do ambiente
├── config/           # Configurações centralizadas
├── core/             # Lógica principal da aplicação
│   └── GameLoop.ts   # Loop principal de decisão e ação
├── providers/        # Provedores de IA (Groq, Ollama, etc.)
├── schemas/          # Validações Zod
├── prompts/          # Templates de prompt
├── types/            # Interfaces TypeScript
└── utils/            # Utilitários
    └── index.ts
```

### Adicionando um Novo Provedor de IA

1. Crie uma nova classe em `src/providers/providers` estendendo `BaseLLMProvider`
2. Configure no `.env` com `LLM_PROVIDER=novo_provedor`

Exemplo para OpenAI:

```typescript
// src/providers/providers/OpenAIProvider.ts
export class OpenAIProvider extends BaseLLMProvider {
  // implementação...
}
```

## 🏗️ Arquitetura Modular

O projeto segue uma arquitetura **hexagonal/modular** com responsabilidades bem definidas:

### Camadas Principais

- **Bot Layer** (`src/bot/`): Tudo relacionado ao Minecraft
  - `BotManager`: Conexão, eventos e ciclo de vida
  - `ActionExecutor`: Executa ações decididas pela IA
  - `MovementManager`: Controle de movimento e navegação
  - `PerceptionManager`: Coleta dados do ambiente

- **Core Layer** (`src/core/`): Lógica de negócio principal
  - `GameLoop`: Loop de percepção → pensamento → ação

- **Infrastructure Layer**: Provedores externos
  - LLM Providers: Groq, Ollama, etc.
  - Configurações e utilitários

### Benefícios da Arquitetura

- ✅ **Testabilidade**: Cada módulo pode ser testado isoladamente
- ✅ **Manutenibilidade**: Mudanças locais não afetam outros módulos
- ✅ **Extensibilidade**: Fácil adicionar novos providers ou comportamentos
- ✅ **Separação de Responsabilidades**: Cada classe tem uma função clara

## 🚀 Como Usar

### Desenvolvimento

```bash
pnpm run dev
```

### Produção

```bash
pnpm run build
pnpm start
```

## 🎛️ Configurações

### Trocando o Modelo de IA

Para usar Ollama em vez de Groq:

1. Instale e configure Ollama
2. No `.env`, mude:
   ```env
   LLM_PROVIDER=ollama
   OLLAMA_MODEL=qwen3:8b
   ```
> Para descobrir seus modelos use o comando: ollama list

### Modificando Prompts

Edite `src/prompts/botPrompts.ts` para alterar o comportamento do bot.

### Validações

As ações do bot são validadas com Zod em `src/schemas/botAction.ts`.

## ▶️ Como Executar

### Modo desenvolvimento (com hot reload)

```bash
pnpm run dev
```

### Modo produção

```bash
# Compilar TypeScript
npm run build

# Executar
npm start
```

## ⚙️ Configuração

Edite as configurações da conexão com o servidor do minecrafit:

```bash
MINECRAFT_HOST=localhost
MINECRAFT_PORT=25565
BOT_USERNAME=AgenteBot
BOT_AUTH=offline
```

## 🎮 Como Funciona

O bot opera em um loop contínuo:

1. **Percepção** 👁️
   - Coleta informações: vida, fome, posição, jogadores próximos

2. **Pensamento** 🧠
   - Envia o contexto para o Groq LLaMA
   - Recebe uma decisão em JSON

3. **Ação** 🎯
   - Executa a ação decidida (falar, pular, olhar, nada)

4. **Aguarda** ⏱️
   - Espera 5 segundos e repete

## 🤝 Ações Disponíveis

- **FALAR** - Envia mensagem no chat
- **PULAR** - Faz o bot pular
- **OLHAR** - Olha para jogadores próximos
- **NADA** - Apenas observa

## 📦 Dependências

- `mineflayer` - Controle do bot no Minecraft
- `@langchain/groq` - Integração com Groq
- `@langchain/core` - Framework LangChain
- `typescript` - Type safety
- `tsx` - Execução TypeScript (dev)

## 🐛 Solução de Problemas

### Bot não conecta

- Verifique se o servidor Minecraft está rodando
- Confirme o IP e porta corretos
- Para servidores online, use `auth: 'microsoft'`

### Erro de API Key

- Verifique se definiu a variável `GROQ_API_KEY`
- Teste a chave em: https://console.groq.com

### Bot não responde

- Verifique os logs no console
- O bot pode demorar alguns segundos para pensar(Dependendo se for modelo local demora mais ainda...)
- Certifique-se que há créditos na conta Groq(Se for usar o modelo online)

## 📝 Personalização

### Mudar a personalidade

Edite o prompt do sistema em `src/prompt/botPrompts.ts`:

```typescript
([
  [
    'system',
    `Você é um bot [SUA PERSONALIDADE AQUI].
    ...`,
  ],
  ...
]);
```

### Adicionar mais ações

1. Adicione a ação no tipo `BotAction`
2. Implemente no switch de `executarAcao()`
3. Atualize o prompt do sistema

### Ajustar velocidade

Mude o intervalo do loop (padrão: 5000ms):

```typescript
await sleep(5000); // <- Mude aqui
```

## 📜 Licença

MIT

## 🙏 Créditos

- jvras58

- [Mineflayer](https://github.com/PrismarineJS/mineflayer)
- [Modelos Disponiveis](https://docs.langchain.com/oss/javascript/integrations/providers/overview)
- [LangChain](https://www.langchain.com/)
- [Groq](https://groq.com/)

