import mineflayer, { Bot, ControlState } from 'mineflayer';
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
  acao: 'FALAR' | 'ANDAR' | 'PULAR' | 'OLHAR' | 'EXPLORAR' | 'PARAR' | 'NADA';
  conteudo?: string;
  direcao?: 'frente' | 'tras' | 'esquerda' | 'direita' | 'aleatorio';
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
let ultimaAcao = 'NADA';
let contadorAcoes = { FALAR: 0, ANDAR: 0, PULAR: 0, EXPLORAR: 0 };

// --- CÉREBRO LANGCHAIN + GROQ ---
const llm = new ChatGroq({
  apiKey: GROQ_API_KEY,
  model: 'llama-3.3-70b-versatile',
  temperature: 0.8, // Aumentado para mais variedade
});

const promptTemplate = ChatPromptTemplate.fromMessages([
  [
    'system',
    `Você é um bot de Minecraft aventureiro e dinâmico.
Você DEVE VARIAR suas ações - não fique apenas falando!

IMPORTANTE: Alterne entre diferentes ações! Se você falou muito, ANDE ou EXPLORE.

Responda APENAS com JSON válido no formato:
{{"acao": "ANDAR", "direcao": "frente"}}
{{"acao": "EXPLORAR"}}
{{"acao": "PULAR"}}
{{"acao": "FALAR", "conteudo": "mensagem curta"}}
{{"acao": "PARAR"}}
{{"acao": "OLHAR"}}

Ações disponíveis:
- ANDAR: andar em uma direção (frente/tras/esquerda/direita/aleatorio)
- EXPLORAR: andar aleatoriamente explorando o mundo
- PULAR: pular (útil para subir ou se divertir)
- FALAR: enviar mensagem no chat (use raramente, seja breve)
- PARAR: parar de se mover
- OLHAR: olhar ao redor
- NADA: não fazer nada (use raramente)

REGRAS:
1. Varie as ações! Não repita a mesma ação muitas vezes
2. EXPLORE o mundo com frequência
3. ANDE bastante para descobrir coisas
4. Fale POUCO (só quando realmente necessário)
5. Se há jogadores, interaja andando perto deles
6. Pule ocasionalmente para ser divertido`,
  ],
  [
    'human',
    `STATUS DO JOGO:
{contexto}

Última ação: {ultimaAcao}
Contador de ações: {contadorAcoes}

O que você deve fazer AGORA? (Lembre-se: VARIE as ações!)`,
  ],
]);

const outputParser = new StringOutputParser();
const chain = promptTemplate.pipe(llm).pipe(outputParser);

// --- FUNÇÃO DE PENSAMENTO ---
async function pensar(contexto: string): Promise<BotAction | null> {
  if (!botConectado) return null;

  try {
    const resposta = await chain.invoke({
      contexto,
      ultimaAcao,
      contadorAcoes: JSON.stringify(contadorAcoes),
    });

    const textoLimpo = resposta
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();

    const decisao = JSON.parse(textoLimpo) as BotAction;

    // Atualiza contador
    if (decisao.acao in contadorAcoes) {
      contadorAcoes[decisao.acao as keyof typeof contadorAcoes]++;
    }

    return decisao;
  } catch (erro) {
    console.error('❌ Erro no raciocínio:', erro);
    // Ação padrão: explorar
    return { acao: 'EXPLORAR' };
  }
}

// --- LOOP DE VIDA DO BOT ---
async function cicloVida(): Promise<void> {
  console.log('🧠 Cérebro ativado...');

  while (true) {
    if (!botConectado || !bot) {
      await sleep(2000);
      continue;
    }

    try {
      // 1. PERCEPÇÃO
      const vida = bot.health;
      const fome = bot.food;
      const posicao = bot.entity.position;
      const velocidade = bot.entity.velocity;
      const estaAndando = Math.abs(velocidade.x) > 0.01 || Math.abs(velocidade.z) > 0.01;

      const jogadoresProximos = Object.keys(bot.players).filter(
        (nome) => nome !== bot!.username
      );

      const contexto = `
Vida: ${vida.toFixed(0)}/20
Fome: ${fome}/20
Posição: X=${posicao.x.toFixed(0)} Y=${posicao.y.toFixed(0)} Z=${posicao.z.toFixed(0)}
Está andando: ${estaAndando ? 'SIM' : 'NÃO'}
Jogadores próximos: ${jogadoresProximos.length > 0 ? jogadoresProximos.join(', ') : 'nenhum'}
Hora do dia: ${bot.time.timeOfDay}
      `.trim();

      // 2. PENSAMENTO
      const decisao = await pensar(contexto);

      if (!botConectado || !decisao) {
        continue;
      }

      // 3. AÇÃO
      await executarAcao(decisao);

      // Aguarda antes do próximo ciclo
      await sleep(3000); // Reduzido para 3s para mais dinamismo
    } catch (erro) {
      console.error('❌ Erro no loop:', erro);
      await sleep(5000);
    }
  }
}

// --- EXECUÇÃO DE AÇÕES ---
async function executarAcao(decisao: BotAction): Promise<void> {
  if (!bot || !botConectado) return;

  ultimaAcao = decisao.acao;

  try {
    switch (decisao.acao) {
      case 'FALAR':
        if (decisao.conteudo) {
          bot.chat(decisao.conteudo);
          console.log(`🗣️  Falei: ${decisao.conteudo}`);
        }
        break;

      case 'ANDAR':
        const direcao = decisao.direcao || 'frente';
        andarNaDirecao(direcao);
        console.log(`🚶 Andando para ${direcao}`);
        break;

      case 'EXPLORAR':
        explorarAleatorio();
        console.log('🗺️  Explorando o mundo...');
        break;

      case 'PULAR':
        bot.setControlState('jump', true);
        await sleep(100);
        bot.setControlState('jump', false);
        console.log('🦘 Pulei!');
        break;

      case 'PARAR':
        pararMovimento();
        console.log('🛑 Parei de andar');
        break;

      case 'OLHAR':
        const jogadores = Object.values(bot.players).filter(
          (p) => p.username !== bot!.username && p.entity
        );
        if (jogadores.length > 0) {
          const jogadorAleatorio =
            jogadores[Math.floor(Math.random() * jogadores.length)];
          if (jogadorAleatorio.entity) {
            bot.lookAt(jogadorAleatorio.entity.position.offset(0, 1.6, 0));
            console.log(`👀 Olhei para ${jogadorAleatorio.username}`);
          }
        } else {
          // Olha para uma direção aleatória
          const yaw = Math.random() * Math.PI * 2;
          bot.look(yaw, 0);
          console.log('👀 Olhei ao redor');
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

// --- FUNÇÕES DE MOVIMENTO ---
function andarNaDirecao(direcao: string): void {
  if (!bot) return;

  // Para movimento anterior
  pararMovimento();

  switch (direcao) {
    case 'frente':
      bot.setControlState('forward', true);
      break;
    case 'tras':
      bot.setControlState('back', true);
      break;
    case 'esquerda':
      bot.setControlState('left', true);
      break;
    case 'direita':
      bot.setControlState('right', true);
      break;
    case 'aleatorio':
      const direcoes: ControlState[] = ['forward', 'back', 'left', 'right'];
      const dir = direcoes[Math.floor(Math.random() * direcoes.length)];
      bot.setControlState(dir, true);
      break;
  }

  // Para automaticamente após 2-4 segundos
  const tempo = 2000 + Math.random() * 2000;
  setTimeout(() => pararMovimento(), tempo);
}

function explorarAleatorio(): void {
  if (!bot) return;

  // Para movimento anterior
  pararMovimento();

  // Escolhe direção aleatória
  const direcoes: ControlState[] = ['forward', 'back', 'left', 'right'];
  const dir = direcoes[Math.floor(Math.random() * direcoes.length)];

  bot.setControlState(dir, true);

  // Olha para direção aleatória
  const yaw = Math.random() * Math.PI * 2;
  bot.look(yaw, 0);

  // Para após 3-6 segundos
  const tempo = 3000 + Math.random() * 3000;
  setTimeout(() => pararMovimento(), tempo);
}

function pararMovimento(): void {
  if (!bot) return;

  bot.setControlState('forward', false);
  bot.setControlState('back', false);
  bot.setControlState('left', false);
  bot.setControlState('right', false);
  bot.setControlState('sprint', false);
}

// --- CRIAÇÃO E GERENCIAMENTO DO BOT ---
function criarBot(): void {
  console.log('🔌 Conectando ao servidor...');

  bot = mineflayer.createBot(botConfig);

  bot.on('spawn', () => {
    console.log('✅ Bot entrou no jogo!');
    botConectado = true;

    // Reset contadores
    contadorAcoes = { FALAR: 0, ANDAR: 0, PULAR: 0, EXPLORAR: 0 };
  });

  bot.on('chat', (usuario, mensagem) => {
    if (usuario === bot?.username) return;
    console.log(`💬 ${usuario}: ${mensagem}`);
  });

  bot.on('death', () => {
    console.log('💀 Morri! Respawnando...');
    pararMovimento();
  });

  bot.on('end', (razao) => {
    console.log(`❌ Bot desconectado. Motivo: ${razao}`);
    botConectado = false;
    pararMovimento();

    console.log('🔄 Reconectando em 5 segundos...');
    setTimeout(() => {
      criarBot();
    }, 5000);
  });

  bot.on('error', (erro) => {
    console.error('⚠️  Erro de conexão:', erro.message);
  });

  bot.on('kicked', (razao) => {
    console.log(`👢 Fui kickado! Razão: ${razao}`);
  });

  // Evento: Colidiu com algo
  bot.on('physicsTick', () => {
    if (!bot || !botConectado) return;

    // Se está colidindo, tenta pular
    if (bot.entity.onGround && bot.entity.velocity.y === 0) {
      const estaAndando =
        bot.controlState.forward ||
        bot.controlState.back ||
        bot.controlState.left ||
        bot.controlState.right;

      // Se está tentando andar mas não se move, pula
      if (estaAndando) {
        const vel = bot.entity.velocity;
        if (Math.abs(vel.x) < 0.01 && Math.abs(vel.z) < 0.01) {
          // Às vezes pula para superar obstáculos
          if (Math.random() > 0.7) {
            bot.setControlState('jump', true);
          }
        }
      }
    }
  });
}

// --- UTILITÁRIO ---
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// --- INICIALIZAÇÃO ---
async function main(): Promise<void> {
  console.log('🤖 Iniciando Bot de Minecraft com IA...\n');

  criarBot();

  await sleep(2000);

  cicloVida();
}

main().catch((erro) => {
  console.error('❌ Erro fatal:', erro);
  process.exit(1);
});