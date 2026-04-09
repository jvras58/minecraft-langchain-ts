import 'dotenv/config';

import { prisma } from '../utils/db';
import * as fs from 'fs';
import * as path from 'path';

const EXPORTS_DIR = path.join(process.cwd(), 'exports');

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const sessionFilter = getStringArg(args, '--session');
  const modelFilter = getStringArg(args, '--model');
  const summaryOnly = args.includes('--summary-only');

  console.log('📤 Exportando métricas...');
  if (sessionFilter) console.log(`   Filtro por sessão: ${sessionFilter}`);
  if (modelFilter) console.log(`   Filtro por modelo: ${modelFilter}`);

  fs.mkdirSync(EXPORTS_DIR, { recursive: true });

  // Build where clause for sessions
  const sessionWhere: any = {};
  if (sessionFilter) sessionWhere.id = sessionFilter;
  if (modelFilter) sessionWhere.model = { contains: modelFilter };

  // Fetch sessions
  const sessions = await prisma.experimentSession.findMany({
    where: sessionWhere,
    orderBy: { startedAt: 'desc' },
  });

  if (sessions.length === 0) {
    console.log('⚠️  Nenhuma sessão encontrada com os filtros especificados.');
    return;
  }

  const sessionIds = sessions.map((s) => s.id);

  if (!summaryOnly) {
    // Export sessions CSV
    await exportSessionsCsv(sessions);

    // Build metric filters
    const metricWhere = sessionIds.length > 0 ? { sessionId: { in: sessionIds } } : {};

    // Export LLM metrics
    const metrics = await prisma.metric.findMany({
      where: metricWhere,
      orderBy: { timestamp: 'asc' },
    });
    await exportLLMMetricsCsv(metrics);

    // Export action metrics
    const actionMetrics = await prisma.actionMetric.findMany({
      where: metricWhere,
      orderBy: { timestamp: 'asc' },
    });
    await exportActionMetricsCsv(actionMetrics);

    // Export parse events
    const parseEvents = await prisma.parseEvent.findMany({
      where: sessionIds.length > 0 ? { sessionId: { in: sessionIds } } : {},
      orderBy: { timestamp: 'asc' },
    });
    await exportParseEventsCsv(parseEvents);

    // Export connection events
    const connectionEvents = await prisma.connectionEvent.findMany({
      where: sessionIds.length > 0 ? { sessionId: { in: sessionIds } } : {},
      orderBy: { timestamp: 'asc' },
    });
    await exportConnectionEventsCsv(connectionEvents);
  }

  // Generate summary for each session
  const summaries = [];
  for (const session of sessions) {
    const summary = await generateSessionSummary(session);
    summaries.push(summary);
  }

  const summaryPath = path.join(EXPORTS_DIR, 'summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify(summaries, null, 2));
  console.log(`✅ summary.json (${summaries.length} sessões)`);

  console.log(`\n📁 Arquivos exportados em: ${EXPORTS_DIR}`);
}

function toCsvRow(values: (string | number | null | undefined | boolean | bigint)[]): string {
  return values.map((v) => {
    if (v === null || v === undefined) return '';
    const str = String(v);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }).join(',');
}

function writeCsv(filename: string, headers: string[], rows: string[]): void {
  const filePath = path.join(EXPORTS_DIR, filename);
  const content = [headers.join(','), ...rows].join('\n');
  fs.writeFileSync(filePath, content);
  console.log(`✅ ${filename} (${rows.length} linhas)`);
}

async function exportSessionsCsv(sessions: any[]): Promise<void> {
  const headers = [
    'id', 'startedAt', 'endedAt', 'provider', 'model', 'quantization',
    'modelFamily', 'parameterSize', 'modelSizeBytes', 'vramAllocatedBytes',
    'contextLength', 'mode', 'totalCycles', 'validJsonCount',
    'repairedJsonCount', 'failedJsonCount', 'disconnections', 'reconnections', 'notes',
  ];

  const rows = sessions.map((s) => toCsvRow([
    s.id, s.startedAt?.toISOString(), s.endedAt?.toISOString(), s.provider,
    s.model, s.quantization, s.modelFamily, s.parameterSize,
    s.modelSizeBytes?.toString(), s.vramAllocatedBytes?.toString(),
    s.contextLength, s.mode, s.totalCycles, s.validJsonCount,
    s.repairedJsonCount, s.failedJsonCount, s.disconnections, s.reconnections, s.notes,
  ]));

  writeCsv('sessions.csv', headers, rows);
}

async function exportLLMMetricsCsv(metrics: any[]): Promise<void> {
  const headers = [
    'id', 'sessionId', 'timestamp', 'provider', 'model',
    'inputTokens', 'outputTokens', 'localInputTokens', 'localOutputTokens',
    'tokensPerSecond', 'totalTokens', 'responseTime',
    'gpuName', 'cpuName', 'os', 'taskName',
  ];

  const rows = metrics.map((m) => toCsvRow([
    m.id, m.sessionId, m.timestamp?.toISOString(), m.provider, m.model,
    m.inputTokens, m.outputTokens, m.localInputTokens, m.localOutputTokens,
    m.tokensPerSecond, m.totalTokens, m.responseTime,
    m.gpuName, m.cpuName, m.os, m.taskName,
  ]));

  writeCsv('llm_metrics.csv', headers, rows);
}

async function exportActionMetricsCsv(metrics: any[]): Promise<void> {
  const headers = [
    'id', 'sessionId', 'timestamp', 'action', 'direction',
    'content', 'success', 'errorMessage', 'executionTimeMs',
  ];

  const rows = metrics.map((m) => toCsvRow([
    m.id, m.sessionId, m.timestamp?.toISOString(), m.action, m.direction,
    m.content, m.success, m.errorMessage, m.executionTimeMs,
  ]));

  writeCsv('action_metrics.csv', headers, rows);
}

async function exportParseEventsCsv(events: any[]): Promise<void> {
  const headers = ['id', 'sessionId', 'timestamp', 'status', 'rawResponse', 'errorMessage'];

  const rows = events.map((e) => toCsvRow([
    e.id, e.sessionId, e.timestamp?.toISOString(), e.status,
    e.rawResponse?.slice(0, 500), e.errorMessage,
  ]));

  writeCsv('parse_events.csv', headers, rows);
}

async function exportConnectionEventsCsv(events: any[]): Promise<void> {
  const headers = ['id', 'sessionId', 'timestamp', 'eventType', 'reason'];

  const rows = events.map((e) => toCsvRow([
    e.id, e.sessionId, e.timestamp?.toISOString(), e.eventType, e.reason,
  ]));

  writeCsv('connection_events.csv', headers, rows);
}

async function generateSessionSummary(session: any): Promise<any> {
  const metrics = await prisma.metric.findMany({
    where: { sessionId: session.id },
    orderBy: { timestamp: 'asc' },
  });

  const actionMetrics = await prisma.actionMetric.findMany({
    where: { sessionId: session.id },
  });

  // Compute statistics
  const responseTimes = metrics.map((m) => m.responseTime * 1000); // back to ms
  const tps = metrics.map((m) => m.tokensPerSecond).filter((v): v is number => v !== null);
  const outputTokens = metrics.map((m) => m.localOutputTokens).filter((v): v is number => v !== null);

  const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  const median = (arr: number[]) => {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  };
  const percentile = (arr: number[], p: number) => {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const idx = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, idx)];
  };

  // Action distribution
  const actionDist: Record<string, number> = {};
  for (const am of actionMetrics) {
    actionDist[am.action] = (actionDist[am.action] || 0) + 1;
  }

  // Hardware info
  const hw = session.hardwareProfile as any;
  const hardwareSummary = hw
    ? `${hw.cpuName || 'Unknown CPU'} + ${hw.gpuName || 'No GPU'}`
    : 'Unknown';

  return {
    session_id: session.id,
    model: session.model,
    provider: session.provider,
    quantization: session.quantization,
    mode: session.mode,
    hardware: hardwareSummary,
    started_at: session.startedAt?.toISOString(),
    ended_at: session.endedAt?.toISOString(),
    total_cycles: session.totalCycles,
    metrics: {
      avg_tokens_per_second: round(avg(tps)),
      median_tokens_per_second: round(median(tps)),
      p95_response_time_ms: round(percentile(responseTimes, 95)),
      avg_response_time_ms: round(avg(responseTimes)),
      json_valid_rate: session.totalCycles > 0 ? round(session.validJsonCount / session.totalCycles) : 0,
      json_repaired_rate: session.totalCycles > 0 ? round(session.repairedJsonCount / session.totalCycles) : 0,
      json_failed_rate: session.totalCycles > 0 ? round(session.failedJsonCount / session.totalCycles) : 0,
      avg_output_tokens: round(avg(outputTokens)),
      total_llm_calls: metrics.length,
    },
    action_distribution: actionDist,
  };
}

function round(n: number, decimals = 2): number {
  return Math.round(n * 10 ** decimals) / 10 ** decimals;
}

function getStringArg(args: string[], flag: string): string | undefined {
  const idx = args.indexOf(flag);
  if (idx >= 0 && idx + 1 < args.length) {
    return args[idx + 1];
  }
  return undefined;
}

main().catch((err) => {
  console.error('❌ Erro na exportação:', err);
  process.exit(1);
});
