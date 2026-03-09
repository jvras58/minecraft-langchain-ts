import { jsonrepair } from 'jsonrepair';

/**
 * Extrai e repara JSON de respostas de LLM.
 *
 * LLMs (especialmente modelos locais menores) frequentemente retornam:
 * - JSON envolto em ```json ... ``` ou texto extra
 * - Vírgulas pendentes (trailing commas)
 * - Aspas simples em vez de duplas
 * - Comentários dentro do JSON
 * - Propriedades sem aspas
 * - Texto antes/depois do JSON
 *
 * Pipeline:
 * 1. Limpa markdown e texto extra
 * 2. Tenta JSON.parse direto (caso mais rápido)
 * 3. Se falhar, usa jsonrepair para consertar
 * 4. Se tudo falhar, retorna null com o erro
 */
export interface ParseResult<T = unknown> {
  data: T | null;
  error: string | null;
  repaired: boolean;
  status: 'valid' | 'repaired' | 'failed';
  rawInput: string;
}

export function safeParseJSON<T = unknown>(raw: string): ParseResult<T> {
  const cleaned = extractJSON(raw);

  // Tenta parse direto — rápido quando o JSON já está correto
  try {
    return { data: JSON.parse(cleaned) as T, error: null, repaired: false, status: 'valid', rawInput: raw };
  } catch {
    // Segue para reparo
  }

  // Usa jsonrepair para consertar JSON malformado
  try {
    const repaired = jsonrepair(cleaned);
    return { data: JSON.parse(repaired) as T, error: null, repaired: true, status: 'repaired', rawInput: raw };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { data: null, error: `Falha ao parsear JSON mesmo com reparo: ${msg}`, repaired: false, status: 'failed', rawInput: raw };
  }
}

/**
 * Extrai o bloco JSON mais provável de uma string que pode conter
 * markdown, texto explicativo, ou lixo ao redor.
 */
function extractJSON(raw: string): string {
  let text = raw.trim();

  // Remove blocos de código markdown
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    text = codeBlockMatch[1].trim();
  }

  // Se começa com { ou [, provavelmente já é JSON
  if (text.startsWith('{') || text.startsWith('[')) {
    return text;
  }

  // Tenta encontrar o primeiro { e o último } (ou [ e ])
  const firstBrace = text.indexOf('{');
  const firstBracket = text.indexOf('[');

  let start = -1;
  let end = -1;
  let opener: '{' | '[' = '{';

  if (firstBrace >= 0 && (firstBracket < 0 || firstBrace < firstBracket)) {
    start = firstBrace;
    opener = '{';
  } else if (firstBracket >= 0) {
    start = firstBracket;
    opener = '[';
  }

  if (start >= 0) {
    const closer = opener === '{' ? '}' : ']';
    end = text.lastIndexOf(closer);
    if (end > start) {
      return text.slice(start, end + 1);
    }
  }

  // Retorna o texto original — jsonrepair vai tentar dar um jeito
  return text;
}