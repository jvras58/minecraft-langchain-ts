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

### 2. Coleta de Dados
- **Função `collectAndStoreMetric`**: Registra métricas automaticamente após cada chamada de IA
- **Estimativa de Tokens**: Cálculo simples (1 token ≈ 4 caracteres) para entrada e saída
- **Integração Automática**: Chamada nos providers GroqProvider e OllamaProvider

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

### Importar e Chamar
```typescript
import { collectAndStoreMetric } from './utils/metrics';

await collectAndStoreMetric({
  provider: 'Groq',
  model: 'llama-3.3-70b-versatile',
  inputTokens: 150,
  outputTokens: 50,
  responseTime: 2.5,
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
- **Integração Nativa com LangChain**: Usar callbacks e middlewares do LangChain para obter métricas precisas de tokens, custos e uso, em vez de estimativas manuais (similar ao que outros frameworks como Agno fazem)
- **Banco de Dados Online**: Migrar para um banco cloud (ex: Prisma Postgres ou Neon) para reduzir carga local e permitir acesso remoto às métricas

