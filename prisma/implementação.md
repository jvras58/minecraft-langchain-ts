# Sistema de Métricas - Minecraft LangChain Template

## Visão Geral
O sistema de métricas é responsável por coletar, armazenar e analisar dados de performance das interações com provedores de IA (Groq e Ollama). Ele registra informações sobre tempo de resposta, uso de tokens e detalhes do ambiente de hardware onde o bot está rodando.

## O que Foi Implementado

### 1. Modelo de Dados (Prisma)
- **Tabela Metric**: Armazena métricas de cada chamada de IA
  - `id`: Identificador único
  - `timestamp`: Data/hora da coleta
  - `provider`: Nome do provedor (Groq/Ollama)
  - `model`: Modelo específico usado
  - `inputTokens`: Número estimado de tokens de entrada
  - `outputTokens`: Número estimado de tokens de saída
  - `responseTime`: Tempo de resposta em segundos
  - `environment`: JSON com dados de hardware (CPU, memória, GPU)

### 2. Coleta de Dados com Callbacks do LangChain
- **Classe `MetricsCallbackHandler`**: Callback handler customizado que intercepta eventos do LLM
  - Localização: `src/utils/MetricsCallbackHandler.ts`
  - Estende `BaseCallbackHandler` do `@langchain/core`
  - Captura métricas reais via `handleLLMStart()` e `handleLLMEnd()`

- **Extração Híbrida de Tokens** (prioridade):
  1. `response_metadata` das gerações (mais confiável para ChatModels)
  2. `llmOutput.tokenUsage` (fallback para alguns providers)
  3. Formato Ollama específico (`prompt_eval_count`, `eval_count`)
  4. Estimativa (1 token ≈ 4 caracteres) - último recurso

- **Métricas Capturadas**:
  - `responseTime`: Tempo real medido com `performance.now()` (em segundos)
  - `inputTokens`: Extraído de múltiplas fontes via `extractTokenUsage()`
  - `outputTokens`: Extraído de múltiplas fontes via `extractTokenUsage()`

- **Providers Suportados**: Groq, Ollama, OpenAI e outros compatíveis com LangChain
- **Função `collectAndStoreMetric`**: Registra métricas no Prisma após cada chamada

### 3. Dados de Hardware
- **Biblioteca systeminformation**: Coleta informações do sistema
- **Dados Coletados**:
  - CPU: fabricante, marca, núcleos, velocidade
  - Memória: total e livre
  - GPU: modelo, fabricante, VRAM
- **Formato**: Dados serializados em JSON na coluna `environment`

### 4. Armazenamento
- **Banco SQLite**: Via Prisma ORM
- **Instância Singleton**: Uso compartilhado do Prisma Client em `src/utils/db.ts`
- **Migração**: Tabela criada com `prisma migrate dev`

## Como Usar

### Uso nos Providers
O callback é usado automaticamente nos providers:
```typescript
import { MetricsCallbackHandler } from '../../utils/MetricsCallbackHandler';

// No método invoke do provider
const metricsCallback = new MetricsCallbackHandler({
  provider: 'Groq',
  model: this.modelName,
  userBotId,
});

const result = await this.llm.invoke(messages, {
  callbacks: [metricsCallback],
});
```

### Ver Dados
- Use Prisma Studio: `npx prisma studio`
- Ou queries diretas no código

## O que é Proposto Obter

### Objetivos
- Monitorar performance dos provedores de IA
- Analisar eficiência de modelos em diferentes hardwares
- Identificar gargalos e otimizar uso de recursos
- Fornecer dados para tomada de decisões sobre escolha de provedor/modelo


### Outputs Esperados

- Insights sobre escalabilidade em diferentes hardwares

### Próximos Passos
- **Dashboard Web**: Interface para visualizar métricas em tempo real
- **Análises Estatísticas**: Médias, medianas, distribuições
- **Comparação de Modelos**: Gráficos de performance entre provedores
- **Exportação**: Relatórios em CSV/JSON
- **Banco de Dados Online**: Migrar para um banco cloud (ex: Prisma Postgres ou Neon) para reduzir carga local e permitir acesso remoto às métricas
- ~~**Integração Nativa com LangChain**~~: ✅ Implementado via `MetricsCallbackHandler`

---

## Decisões de Design

### Snapshot por Interação (Abordagem Atual)

Cada chamada ao LLM cria um registro completo incluindo dados de hardware:

```
Metric: { tokens, latência, environment: {CPU, RAM, GPU} }
```

**Por que essa abordagem?**
- ✅ **Precisão histórica**: Captura o estado exato do hardware no momento da chamada
- ✅ **Simplicidade de queries**: Cada registro é autocontido, sem necessidade de JOINs
- ✅ **Análise de benchmark**: Facilita correlacionar performance com recursos disponíveis
- ⚠️ **Trade-off**: Dados de environment são repetidos (redundância aceita)

**Alternativa considerada (Session-based)**:
Criar tabela `Session` com environment e referenciar em `Metric`. Não implementado porque:
- Memória livre varia constantemente durante execução
- Adiciona complexidade sem ganho significativo para SQLite local

