# 🤖 Bot de Minecraft com IA (Node.js + LangChain + Groq)

Bot inteligente para Minecraft que usa LangChain e Groq LLaMA para tomar decisões autônomas no jogo.

## 🚀 Recursos

- ✅ **100% Node.js/TypeScript** - Código moderno e type-safe
- 🧠 **IA com LangChain + Groq** - Usa LLaMA 3.3 70B para decisões inteligentes
- 🎮 **Controle total do Minecraft** - Mineflayer para todas as ações
- 🔄 **Reconexão automática** - Se cair, reconecta sozinho
- 💬 **Interação no chat** - Responde de forma sarcástica
- 👀 **Percepção do ambiente** - Monitora vida, fome, jogadores próximos

## 📋 Pré-requisitos

- Node.js 18+ instalado
- Servidor Minecraft Java Edition rodando (local ou remoto)
- Chave da API do Groq ([obtenha aqui](https://console.groq.com/keys))

## 🔧 Instalação

### 1. Clone ou crie o projeto

```bash
mkdir minecraft-bot-ia
cd minecraft-bot-ia
```

### 2. Crie a estrutura de pastas

```bash
mkdir src
```

### 3. Salve os arquivos

- `src/index.ts` - Código principal do bot
- `package.json` - Dependências
- `tsconfig.json` - Configuração TypeScript
- `.env` - Variáveis de ambiente (copie do `.env.example`)

### 4. Instale as dependências

```bash
npm install
```

### 5. Configure a chave do Groq

Crie um arquivo `.env` na raiz do projeto:

```bash
GROQ_API_KEY=sua-chave-aqui
```

## ▶️ Como Executar

### Modo desenvolvimento (com hot reload)

```bash
npm run dev
```

### Modo produção

```bash
# Compilar TypeScript
npm run build

# Executar
npm start
```

## ⚙️ Configuração

Edite as configurações no arquivo `src/index.ts`:

```typescript
const botConfig: BotConfig = {
  host: 'localhost',        // IP do servidor
  port: 25565,              // Porta do servidor
  username: 'AgenteGroq',   // Nome do bot
  auth: 'offline',          // 'offline' ou 'microsoft'
  checkTimeoutInterval: 60 * 1000,
};
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
- O bot pode demorar alguns segundos para pensar
- Certifique-se que há créditos na conta Groq

## 📝 Personalização

### Mudar a personalidade

Edite o prompt do sistema em `src/index.ts`:

```typescript
const promptTemplate = ChatPromptTemplate.fromMessages([
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

- [Mineflayer](https://github.com/PrismarineJS/mineflayer)
- [LangChain](https://www.langchain.com/)
- [Groq](https://groq.com/)

---

**Divirta-se! 🎮🤖**