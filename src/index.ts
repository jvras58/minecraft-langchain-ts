import mineflayer, { Bot } from 'mineflayer';
import { ChatGroq } from '@langchain/groq';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import 'dotenv/config';

// --- CONFIGURAÇÃO ---
const GROQ_API_KEY = process.env.GROQ_API_KEY || 'sua-chave-aqui';

interface BotConfig {
  host: string;
  port: number;
  username: string;
  auth: 'offline' | 'microsoft';
  checkTimeoutInterval: number;
}

interface BotAction {
  acao: 'FALAR' | 'PULAR' | 'OLHAR' | 'NADA';
  conteudo?: string;
}

// Configurações do Bot
const botConfig: BotConfig = {
  host: 'localhost',
  port: 25565,
  username: 'AgenteGroq',
  auth: 'offline',
  checkTimeoutInterval: 60 * 1000,
};

// Estado global
let botConectado = false;
let bot: Bot | null = null;

// --- CÉREBRO LANGCHAIN + GROQ ---
const llm = new ChatGroq({
  apiKey: GROQ_API_KEY,
  model: 'llama-3.3-70b-versatile',
  temperature: 0.7,
});

const promptTemplate = ChatPromptTemplate.fromMessages([
  [
    'system',
    `Você é um bot de Minecraft sarcástico e divertido.
    Responda APENAS com JSON válido no formato exato:
    {{"acao": "FALAR", "conteudo": "sua mensagem"}}
    ou
    {{"acao": "PULAR"}}
    ou
    {{"acao": "NADA"}}

    Ações disponíveis:
    - FALAR: enviar mensagem no chat
    - PULAR: fazer o bot pular
    - OLHAR: olhar ao redor
    - NADA: não fazer nada

    Seja breve e sarcástico.`,
  ],
  ['human', 'STATUS DO JOGO: {contexto}\n\nO que você deve fazer?'],
]);

const outputParser = new StringOutputParser();
const chain = promptTemplate.pipe(llm).pipe(outputParser);

// --- FUNÇÃO DE PENSAMENTO ---
async function pensar(contexto: string): Promise<BotAction | null> {
  if (!botConectado) return null;

  try {
    const resposta = await chain.invoke({ contexto });
    
    // Remove markdown se existir
    const textoLimpo = resposta
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();

    const decisao = JSON.parse(textoLimpo) as BotAction;
    return decisao;
  } catch (erro) {
    console.error('❌ Erro no raciocínio:', erro);
    return null;
  }
}

// --- LOOP DE VIDA DO BOT ---
async function cicloVida(): Promise<void> {
  console.log('🧠 Cérebro ativado...');

  while (true) {
    // Aguarda conexão
    if (!botConectado) {
      await sleep(2000);
      continue;
    }

    if (!bot) {
      await sleep(2000);
      continue;
    }

    try {
      // 1. PERCEPÇÃO - Coleta informações do ambiente
      const vida = bot.health;
      const fome = bot.food;
      const posicao = bot.entity.position;
      const jogadoresProximos = Object.keys(bot.players).filter(
        (nome) => nome !== bot!.username
      );

      const contexto = `
        Vida: ${vida.toFixed(0)}/20
        Fome: ${fome}/20
        Posição: X=${posicao.x.toFixed(0)} Y=${posicao.y.toFixed(0)} Z=${posicao.z.toFixed(0)}
        Jogadores próximos: ${jogadoresProximos.length > 0 ? jogadoresProximos.join(', ') : 'nenhum'}
      `.trim();

      // 2. PENSAMENTO - Groq decide a ação
      const decisao = await pensar(contexto);

      // Verifica novamente se ainda está conectado
      if (!botConectado || !decisao) {
        continue;
      }

      // 3. AÇÃO - Executa a decisão
      await executarAcao(decisao);

      // Aguarda antes do próximo ciclo
      await sleep(5000);
    } catch (erro) {
      console.error('❌ Erro no loop:', erro);
      await sleep(5000);
    }
  }
}

// --- EXECUÇÃO DE AÇÕES ---
async function executarAcao(decisao: BotAction): Promise<void> {
  if (!bot || !botConectado) return;

  try {
    switch (decisao.acao) {
      case 'FALAR':
        if (decisao.conteudo) {
          bot.chat(decisao.conteudo);
          console.log(`🗣️  Falei: ${decisao.conteudo}`);
        }
        break;

      case 'PULAR':
        bot.setControlState('jump', true);
        await sleep(100);
        bot.setControlState('jump', false);
        console.log('🦘 Pulei!');
        break;

      case 'OLHAR':
        // Olha para um jogador aleatório se houver
        const jogadores = Object.values(bot.players).filter(
          (p) => p.username !== bot!.username && p.entity
        );
        if (jogadores.length > 0) {
          const jogadorAleatorio = jogadores[Math.floor(Math.random() * jogadores.length)];
          if (jogadorAleatorio.entity) {
            bot.lookAt(jogadorAleatorio.entity.position.offset(0, 1.6, 0));
            console.log(`👀 Olhei para ${jogadorAleatorio.username}`);
          }
        }
        break;

      case 'NADA':
        console.log('💤 Não fiz nada...');
        break;
    }
  } catch (erro) {
    console.error('❌ Erro ao executar ação:', erro);
  }
}

// --- CRIAÇÃO E GERENCIAMENTO DO BOT ---
function criarBot(): void {
  console.log('🔌 Conectando ao servidor...');

  bot = mineflayer.createBot(botConfig);

  // Evento: Bot entrou no jogo
  bot.on('spawn', () => {
    console.log('✅ Bot entrou no jogo!');
    botConectado = true;
  });

  // Evento: Mensagem no chat
  bot.on('chat', (usuario, mensagem) => {
    if (usuario === bot?.username) return;
    console.log(`💬 ${usuario}: ${mensagem}`);
  });

  // Evento: Bot morreu
  bot.on('death', () => {
    console.log('💀 Morri! Respawnando...');
  });

  // Evento: Desconexão
  bot.on('end', (razao) => {
    console.log(`❌ Bot desconectado. Motivo: ${razao}`);
    botConectado = false;
    
    console.log('🔄 Reconectando em 5 segundos...');
    setTimeout(() => {
      criarBot();
    }, 5000);
  });

  // Evento: Erro
  bot.on('error', (erro) => {
    console.error('⚠️  Erro de conexão:', erro.message);
  });

  // Evento: Kicked
  bot.on('kicked', (razao) => {
    console.log(`👢 Fui kickado! Razão: ${razao}`);
  });
}

// --- UTILITÁRIO ---
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// --- INICIALIZAÇÃO ---
async function main(): Promise<void> {
  console.log('🤖 Iniciando Bot de Minecraft com IA...\n');

  // Inicia o bot
  criarBot();

  // Aguarda um pouco antes de iniciar o cérebro
  await sleep(2000);

  // Inicia o loop de pensamento
  cicloVida();
}

// Executa o bot
main().catch((erro) => {
  console.error('❌ Erro fatal:', erro);
  process.exit(1);
});