-- CreateTable
CREATE TABLE "UserBot" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "UserBot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Metric" (
    "id" TEXT NOT NULL,
    "userBotId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "responseTime" DOUBLE PRECISION NOT NULL,
    "gpuName" TEXT,
    "cpuName" TEXT,
    "os" TEXT,
    "taskName" TEXT,
    "environment" JSONB NOT NULL,

    CONSTRAINT "Metric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActionMetric" (
    "id" TEXT NOT NULL,
    "userBotId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "action" TEXT NOT NULL,
    "direction" TEXT,
    "content" TEXT,
    "success" BOOLEAN NOT NULL,
    "errorMessage" TEXT,
    "executionTimeMs" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "ActionMetric_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserBot_name_key" ON "UserBot"("name");

-- CreateIndex
CREATE INDEX "Metric_userBotId_timestamp_idx" ON "Metric"("userBotId", "timestamp");

-- CreateIndex
CREATE INDEX "Metric_provider_idx" ON "Metric"("provider");

-- CreateIndex
CREATE INDEX "Metric_taskName_idx" ON "Metric"("taskName");

-- CreateIndex
CREATE INDEX "ActionMetric_userBotId_timestamp_idx" ON "ActionMetric"("userBotId", "timestamp");

-- CreateIndex
CREATE INDEX "ActionMetric_userBotId_action_idx" ON "ActionMetric"("userBotId", "action");

-- AddForeignKey
ALTER TABLE "Metric" ADD CONSTRAINT "Metric_userBotId_fkey" FOREIGN KEY ("userBotId") REFERENCES "UserBot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionMetric" ADD CONSTRAINT "ActionMetric_userBotId_fkey" FOREIGN KEY ("userBotId") REFERENCES "UserBot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
