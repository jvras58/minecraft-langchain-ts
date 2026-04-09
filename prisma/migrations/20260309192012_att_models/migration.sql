-- AlterTable
ALTER TABLE "ActionMetric" ADD COLUMN     "sessionId" TEXT;

-- AlterTable
ALTER TABLE "Metric" ADD COLUMN     "environmentAfter" JSONB,
ADD COLUMN     "environmentBefore" JSONB,
ADD COLUMN     "localInputTokens" INTEGER,
ADD COLUMN     "localOutputTokens" INTEGER,
ADD COLUMN     "sessionId" TEXT,
ADD COLUMN     "tokensPerSecond" DOUBLE PRECISION,
ADD COLUMN     "totalTokens" INTEGER;

-- CreateTable
CREATE TABLE "ExperimentSession" (
    "id" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "quantization" TEXT,
    "modelFamily" TEXT,
    "parameterSize" TEXT,
    "modelSizeBytes" BIGINT,
    "vramAllocatedBytes" BIGINT,
    "contextLength" INTEGER,
    "hardwareProfile" JSONB NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'gameplay',
    "totalCycles" INTEGER NOT NULL DEFAULT 0,
    "validJsonCount" INTEGER NOT NULL DEFAULT 0,
    "repairedJsonCount" INTEGER NOT NULL DEFAULT 0,
    "failedJsonCount" INTEGER NOT NULL DEFAULT 0,
    "disconnections" INTEGER NOT NULL DEFAULT 0,
    "reconnections" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "userBotId" TEXT NOT NULL,

    CONSTRAINT "ExperimentSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParseEvent" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL,
    "rawResponse" TEXT,
    "errorMessage" TEXT,

    CONSTRAINT "ParseEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConnectionEvent" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "eventType" TEXT NOT NULL,
    "reason" TEXT,

    CONSTRAINT "ConnectionEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExperimentSession_provider_model_idx" ON "ExperimentSession"("provider", "model");

-- CreateIndex
CREATE INDEX "ExperimentSession_startedAt_idx" ON "ExperimentSession"("startedAt");

-- CreateIndex
CREATE INDEX "ParseEvent_sessionId_status_idx" ON "ParseEvent"("sessionId", "status");

-- CreateIndex
CREATE INDEX "ConnectionEvent_sessionId_eventType_idx" ON "ConnectionEvent"("sessionId", "eventType");

-- CreateIndex
CREATE INDEX "ActionMetric_sessionId_idx" ON "ActionMetric"("sessionId");

-- CreateIndex
CREATE INDEX "Metric_sessionId_idx" ON "Metric"("sessionId");

-- AddForeignKey
ALTER TABLE "ExperimentSession" ADD CONSTRAINT "ExperimentSession_userBotId_fkey" FOREIGN KEY ("userBotId") REFERENCES "UserBot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Metric" ADD CONSTRAINT "Metric_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ExperimentSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionMetric" ADD CONSTRAINT "ActionMetric_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ExperimentSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParseEvent" ADD CONSTRAINT "ParseEvent_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ExperimentSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConnectionEvent" ADD CONSTRAINT "ConnectionEvent_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ExperimentSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
