-- Re-declares OUTPERFORMING/RECOVERY on the Prisma side of
-- DealSurveillanceStatus — no-op on the database, which has carried both
-- values since 20260830134948_risk_engine_v2_phase1 and never lost them
-- (20260830195946_surveillance_status_4_paliers only renamed the other four
-- and migrated live data, deliberately leaving them on historical
-- RiskScoreSnapshot rows — see that migration's own comments).
--
-- The bug this fixes lives entirely in schema.prisma: it declared only the
-- 4 renamed values, so Prisma Client — generated from that narrower
-- declaration — refused to deserialize any RiskScoreSnapshot row still
-- carrying OUTPERFORMING/RECOVERY ("Value 'OUTPERFORMING' not found in enum
-- 'DealSurveillanceStatus'"), crashing RiskHistoryService.maybeSnapshotLocked
-- on every dossier with history predating that migration. IF NOT EXISTS
-- guards make this safe to apply anywhere, including a fresh database built
-- from migrations alone, where both values are already present.
ALTER TYPE "DealSurveillanceStatus" ADD VALUE IF NOT EXISTS 'OUTPERFORMING';
ALTER TYPE "DealSurveillanceStatus" ADD VALUE IF NOT EXISTS 'RECOVERY';
