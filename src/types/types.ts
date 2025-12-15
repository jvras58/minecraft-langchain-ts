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
  invoke(variables: Record<string, any>): Promise<string>;
}

export interface PromptTemplate {
  system: string;
  human: string;
}