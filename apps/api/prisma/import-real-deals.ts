import { PrismaClient, DealStage, DealStatus, DealType } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface RealDeal {
  name: string;
  city: string | null;
  stage: string;
  status: string;
  amount: number;
  startDate: string | null;
  endDate: string | null;
  riskScore: number;
  description: string | null;
  source: string;
}

const OWNER_EMAIL = 'nick.banza@icloud.com';
// Pre-hashed with bcrypt (cost 12) — never commit the plaintext password to git.
const OWNER_PASSWORD_HASH = '$2b$12$FVO0SvVdyQBzX05VDEohR.1danBXQUaTadJKVc1MdasacnULCenJi';
const ORG_SLUG = 'portefeuille-nick';
const ORG_NAME = 'Portefeuille Nick';
const REFERENCE_PREFIX = 'NB';

function monthsBetween(start: Date | null, end: Date | null): number | null {
  if (!start || !end) return null;
  const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  return months > 0 ? months : null;
}

async function main() {
  console.log('Import des opérations réelles (fichier de suivi Excel)…');

  const dataPath = path.join(__dirname, 'data', 'real-deals.json');
  const realDeals: RealDeal[] = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

  const organization = await prisma.organization.upsert({
    where: { slug: ORG_SLUG },
    update: {},
    create: { name: ORG_NAME, slug: ORG_SLUG },
  });

  const owner = await prisma.user.upsert({
    where: { email: OWNER_EMAIL },
    update: {},
    create: {
      email: OWNER_EMAIL,
      passwordHash: OWNER_PASSWORD_HASH,
      firstName: 'Nick',
      lastName: 'Banza',
      role: 'ADMIN',
      organizationId: organization.id,
    },
  });

  let created = 0;
  let updated = 0;

  for (const [index, d] of realDeals.entries()) {
    const reference = `${REFERENCE_PREFIX}-${String(index + 1).padStart(3, '0')}`;
    const startDate = d.startDate ? new Date(d.startDate) : null;
    const endDate = d.endDate ? new Date(d.endDate) : null;
    const amount = Math.round(d.amount) || 1;

    const data = {
      organizationId: organization.id,
      name: d.name,
      type: DealType.CROWDFUNDING,
      stage: d.stage as DealStage,
      status: d.status as DealStatus,
      description: d.description ?? undefined,
      amountTarget: amount,
      amountRaised: amount,
      currency: 'EUR',
      durationMonths: monthsBetween(startDate, endDate) ?? undefined,
      city: d.city ?? undefined,
      country: 'FR',
      riskScore: d.riskScore,
      atlasScore: Math.max(0, 100 - d.riskScore),
      startDate: startDate ?? undefined,
      endDate: endDate ?? undefined,
      createdById: owner.id,
      assignedToId: owner.id,
    };

    const existing = await prisma.deal.findUnique({ where: { reference } });
    if (existing) {
      await prisma.deal.update({ where: { reference }, data });
      updated++;
    } else {
      await prisma.deal.create({ data: { ...data, reference } });
      created++;
    }
  }

  console.log(`Import terminé : ${created} opération(s) créée(s), ${updated} mise(s) à jour.`);
  console.log(`Organisation : ${ORG_NAME} (${ORG_SLUG})`);
  console.log(`Connexion : ${OWNER_EMAIL}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
