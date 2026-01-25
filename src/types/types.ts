declare module 'mineflayer' {
  interface Bot {
    autoEat: {
      options: {
        priority: string;
        bannedFood: string[];
      };
    };
    collectBlock: any;
    tool: any;
  }

  interface BotEvents {
    autoeat_started: () => void;
  }
}

export interface BotConfig {
  host: string;
  port: number;
  username: string;
  auth: 'offline' | 'microsoft';
  checkTimeoutInterval: number;
}

export interface BotAction {
  acao: "FALAR" | "ANDAR" | "PULAR" | "OLHAR" | "EXPLORAR" | "PARAR" | "NADA" | "MINERAR" | "COLETAR" | "IR_ATE";
  conteudo?: string;
  direcao?: 'frente' | 'tras' | 'esquerda' | 'direita' | 'aleatorio';
  alvo?: string;
}

export interface LLMProvider {
  invoke(variables: Record<string, any>, userBotId: string, taskName?: string): Promise<string>;
}

export interface PromptTemplate {
  system: string;
  human: string;
}