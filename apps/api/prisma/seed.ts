import { PrismaClient, DealStage, DealType, Priority, AlertSeverity } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const FRENCH_CITIES = [
  { city: 'Paris', postcode: '75008', lat: 48.8566, lng: 2.3522 },
  { city: 'Lyon', postcode: '69002', lat: 45.764, lng: 4.8357 },
  { city: 'Marseille', postcode: '13001', lat: 43.2965, lng: 5.3698 },
  { city: 'Bordeaux', postcode: '33000', lat: 44.8378, lng: -0.5792 },
  { city: 'Nantes', postcode: '44000', lat: 47.2184, lng: -1.5536 },
  { city: 'Toulouse', postcode: '31000', lat: 43.6047, lng: 1.4442 },
  { city: 'Lille', postcode: '59000', lat: 50.6292, lng: 3.0573 },
  { city: 'Strasbourg', postcode: '67000', lat: 48.5734, lng: 7.7521 },
  { city: 'Nice', postcode: '06000', lat: 43.7102, lng: 7.262 },
  { city: 'Rennes', postcode: '35000', lat: 48.1173, lng: -1.6778 },
];

const DEAL_NAMES = [
  'Résidence Les Terrasses du Parc',
  'Villa Bellevue',
  'Le Clos des Vignes',
  'Cœur de Ville',
  'Les Jardins de la Loire',
  'Horizon Atlantique',
  'Le Belvédère',
  'Quartier des Docks',
  'Les Hauts de Fontenay',
  'Villa Marina',
  'Le Patio Saint-Michel',
  'Résidence Grand Angle',
  'Les Berges du Rhône',
  'Le Clos Fleuri',
  'Terra Nova',
  'Les Allées Vertes',
  'Le Prisme',
  'Villa des Oliviers',
  'Le Faubourg Créatif',
  'Résidence Émeraude',
];

const STAGES = Object.values(DealStage);
const TYPES = Object.values(DealType);

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function main() {
  console.log('Seeding ATLAS database…');

  const passwordHash = await bcrypt.hash('Atlas2026!', 12);

  const organization = await prisma.organization.upsert({
    where: { slug: 'atlas-capital' },
    update: {},
    create: { name: 'Atlas Capital', slug: 'atlas-capital' },
  });

  const [admin, analyst1, analyst2] = await Promise.all([
    prisma.user.upsert({
      where: { email: 'nick.banza@outlook.com' },
      update: {},
      create: {
        email: 'nick.banza@outlook.com',
        passwordHash,
        firstName: 'Nick',
        lastName: 'Banza',
        role: 'ADMIN',
        organizationId: organization.id,
      },
    }),
    prisma.user.upsert({
      where: { email: 'analyste1@atlas-capital.fr' },
      update: {},
      create: {
        email: 'analyste1@atlas-capital.fr',
        passwordHash,
        firstName: 'Camille',
        lastName: 'Rousseau',
        role: 'ANALYST',
        organizationId: organization.id,
      },
    }),
    prisma.user.upsert({
      where: { email: 'analyste2@atlas-capital.fr' },
      update: {},
      create: {
        email: 'analyste2@atlas-capital.fr',
        passwordHash,
        firstName: 'Thomas',
        lastName: 'Lefèvre',
        role: 'ANALYST',
        organizationId: organization.id,
      },
    }),
  ]);

  const users = [admin, analyst1, analyst2];

  const tagDefs = [
    { name: 'Résidentiel', color: '#6366f1' },
    { name: 'Commercial', color: '#0ea5e9' },
    { name: 'Rénovation', color: '#f59e0b' },
    { name: 'Neuf', color: '#22c55e' },
    { name: 'Prioritaire', color: '#ef4444' },
    { name: 'Watchlist', color: '#a855f7' },
  ];

  const tags = await Promise.all(
    tagDefs.map((t) =>
      prisma.tag.upsert({
        where: { organizationId_name: { organizationId: organization.id, name: t.name } },
        update: {},
        create: { organizationId: organization.id, name: t.name, color: t.color },
      }),
    ),
  );

  const existingDeals = await prisma.deal.count({ where: { organizationId: organization.id } });
  if (existingDeals === 0) {
    for (let i = 0; i < DEAL_NAMES.length; i++) {
      const location = randomFrom(FRENCH_CITIES);
      const stage = randomFrom(STAGES);
      const type = randomFrom(TYPES);
      const amountTarget = randomInt(300, 4500) * 1000;
      const isFunded = ['FINANCE', 'SUIVI', 'REMBOURSE'].includes(stage);
      const amountRaised = isFunded
        ? amountTarget
        : stage === 'COLLECTE'
          ? Math.round(amountTarget * (randomInt(10, 90) / 100))
          : 0;
      const createdBy = randomFrom(users);
      const reference = `ATL-${2026}-${String(i + 1).padStart(4, '0')}`;

      const deal = await prisma.deal.create({
        data: {
          organizationId: organization.id,
          reference,
          name: DEAL_NAMES[i],
          type,
          stage,
          status: stage === 'DEFAUT' ? 'ON_HOLD' : 'ACTIVE',
          description: `Opération de ${type.toLowerCase()} située à ${location.city}, actuellement en phase ${stage.toLowerCase()}.`,
          amountTarget,
          amountRaised,
          interestRate: type === 'CROWDFUNDING' ? randomInt(80, 120) / 10 : null,
          durationMonths: randomFrom([12, 18, 24, 36]),
          address: `${randomInt(1, 150)} rue de la République`,
          city: location.city,
          postcode: location.postcode,
          lat: location.lat + (Math.random() - 0.5) * 0.05,
          lng: location.lng + (Math.random() - 0.5) * 0.05,
          atlasScore: randomInt(35, 95),
          riskScore: randomInt(5, 70),
          startDate: new Date(Date.now() - randomInt(0, 200) * 86_400_000),
          endDate: new Date(Date.now() + randomInt(60, 700) * 86_400_000),
          createdById: createdBy.id,
          assignedToId: randomFrom(users).id,
          tags: {
            create: [randomFrom(tags), randomFrom(tags)]
              .filter((t, idx, arr) => arr.findIndex((x) => x.id === t.id) === idx)
              .map((t) => ({ tagId: t.id })),
          },
        },
      });

      await prisma.activity.create({
        data: {
          dealId: deal.id,
          userId: createdBy.id,
          type: 'DEAL_CREATED',
          message: `Opération créée : ${deal.name}`,
        },
      });

      await prisma.note.create({
        data: {
          dealId: deal.id,
          authorId: createdBy.id,
          content: `Première analyse : dossier ${type === 'PROMOTION' ? 'de promotion immobilière' : 'de financement'} suivi de près, prochaine étape à valider avec le comité.`,
        },
      });

      // A couple of tasks per deal, some due today/soon to populate Cockpit.
      const taskTitles = [
        'Vérifier les garanties bancaires',
        'Relancer le promoteur pour les pièces manquantes',
        'Préparer la note de comité',
        'Contrôler l’avancement des travaux',
        'Mettre à jour le modèle financier',
      ];
      const taskCount = randomInt(1, 3);
      for (let j = 0; j < taskCount; j++) {
        const dueOffsetDays = randomInt(-3, 10);
        await prisma.task.create({
          data: {
            dealId: deal.id,
            title: randomFrom(taskTitles),
            priority: randomFrom(Object.values(Priority)),
            dueDate: new Date(Date.now() + dueOffsetDays * 86_400_000),
            done: dueOffsetDays < -1 ? Math.random() > 0.5 : false,
            assigneeId: randomFrom(users).id,
            createdById: createdBy.id,
          },
        });
      }

      if (deal.riskScore! > 55 || stage === 'DEFAUT') {
        await prisma.alert.create({
          data: {
            organizationId: organization.id,
            dealId: deal.id,
            severity: stage === 'DEFAUT' ? AlertSeverity.CRITICAL : AlertSeverity.WARNING,
            title: stage === 'DEFAUT' ? 'Défaut détecté' : 'Score de risque élevé',
            message:
              stage === 'DEFAUT'
                ? `${deal.name} est en situation de défaut — action immédiate requise.`
                : `${deal.name} affiche un score de risque de ${deal.riskScore}/100.`,
          },
        });
      }
    }

    // A couple of tasks with no linked deal (personal admin tasks) for Cockpit "Aujourd'hui".
    await prisma.task.create({
      data: {
        title: 'Préparer le comité hebdomadaire',
        priority: Priority.HIGH,
        dueDate: new Date(),
        assigneeId: admin.id,
        createdById: admin.id,
      },
    });
    await prisma.task.create({
      data: {
        title: 'Revue de la veille concurrentielle',
        priority: Priority.MEDIUM,
        dueDate: new Date(Date.now() + 86_400_000),
        assigneeId: admin.id,
        createdById: admin.id,
      },
    });

    await prisma.alert.create({
      data: {
        organizationId: organization.id,
        severity: AlertSeverity.INFO,
        title: 'Bienvenue sur ATLAS',
        message: 'Votre organisation Atlas Capital est configurée avec des données de démonstration.',
      },
    });
  }

  console.log('Seed terminé.');
  console.log('Connexion de démonstration : nick.banza@outlook.com / Atlas2026!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
