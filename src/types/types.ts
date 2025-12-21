export interface BotConfig {
  host: string;
  port: number;
  username: string;
  auth: 'offline' | 'microsoft';
  checkTimeoutInterval: number;
}

export interface BotAction {
  acao: 'FALAR' | 'ANDAR' | 'PULAR' | 'OLHAR' | 'EXPLORAR' | 'PARAR' | 'NADA';
  conteudo?: string;
  direcao?: 'frente' | 'tras' | 'esquerda' | 'direita' | 'aleatorio';
}

export interface LLMProvider {
  invoke(variables: Record<string, any>, userBotId: string, taskName?: string): Promise<string>;
}

/** Resultado detalhado do invoke, incluindo dados para métricas */
export interface InvokeResult {
  text: string;
  metrics: {
    provider: string;
    model: string;
    inputTokens?: number;
    outputTokens?: number;
    responseTime: number;
  };
}

export interface PromptTemplate {
  system: string;
  human: string;
}