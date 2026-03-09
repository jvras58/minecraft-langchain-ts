import { encode } from 'gpt-tokenizer';
import { ChatMessage } from '../types/types';

/**
 * Conta tokens localmente usando cl100k_base (GPT-4).
 *
 * Não é idêntico ao tokenizer de cada modelo (Llama, Qwen, etc.),
 * mas é consistente entre providers — o que importa para comparação.
 */
export function countTokens(text: string): number {
  return encode(text).length;
}

/**
 * Conta tokens de uma lista de mensagens de chat.
 * +4 por mensagem para overhead de formatação (role, separadores).
 */
export function countMessagesTokens(messages: ChatMessage[]): number {
  return messages.reduce((sum, m) => sum + countTokens(m.content) + 4, 0);
}
