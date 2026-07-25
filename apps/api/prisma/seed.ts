import {
  PrismaClient,
  DealStage,
  DealType,
  Priority,
  AlertSeverity,
  GraphEntityType,
  DealEntityRole,
  GraphRelationType,
  ArticleCategory,
  GuaranteeType,
} from '@prisma/client';
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

// City-centroid coordinates for Knowledge Graph entities headquartered outside
// the FRENCH_CITIES sample above (Paris-region business addresses).
const ENTITY_CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  Paris: { lat: 48.8566, lng: 2.3522 },
  Lyon: { lat: 45.764, lng: 4.8357 },
  Bordeaux: { lat: 44.8378, lng: -0.5792 },
  'Issy-les-Moulineaux': { lat: 48.8241, lng: 2.2734 },
  'Rueil-Malmaison': { lat: 48.8779, lng: 2.1807 },
  Montrouge: { lat: 48.8163, lng: 2.3138 },
};

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
  const createdDeals: { id: string; name: string; type: DealType }[] = [];
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

      createdDeals.push({ id: deal.id, name: deal.name, type: deal.type });

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

    // ── Knowledge Graph: real, publicly-known intervenants (name/city/site
    // only — no invented financials) plus the crowdfunding/fractionné
    // platforms named in the ATLAS competitive-watch scope.
    const promoteurDefs = [
      { name: 'Nexity', city: 'Paris', website: 'https://www.nexity.fr' },
      { name: 'Bouygues Immobilier', city: 'Issy-les-Moulineaux', website: 'https://www.bouygues-immobilier.com' },
      { name: 'Vinci Immobilier', city: 'Rueil-Malmaison', website: 'https://www.vinci-immobilier.com' },
    ];
    const banqueDefs = [
      { name: 'BNP Paribas', city: 'Paris', website: 'https://www.bnpparibas.fr' },
      { name: 'Société Générale', city: 'Paris', website: 'https://www.societegenerale.fr' },
      { name: 'Crédit Agricole', city: 'Montrouge', website: 'https://www.credit-agricole.fr' },
    ];
    const notaireDefs = [{ name: 'Office notarial Dupont & Associés', city: 'Lyon' }];
    const architecteDefs = [{ name: 'Atelier Michel Roux', city: 'Bordeaux' }];
    const collectiviteDefs = [{ name: 'Métropole de Lyon', city: 'Lyon' }];
    const investisseurDefs = [{ name: 'Atlas Capital Partenaires', city: 'Paris' }];

    const platformDefs: { name: string; category: 'CROWDFUNDING' | 'FRACTIONNE'; website?: string }[] = [
      { name: 'La Première Brique', category: 'CROWDFUNDING' },
      { name: 'ClubFunding', category: 'CROWDFUNDING' },
      { name: 'Homunity', category: 'CROWDFUNDING' },
      { name: 'Baltis', category: 'CROWDFUNDING' },
      { name: 'Fundimmo', category: 'CROWDFUNDING' },
      { name: 'Raizers', category: 'CROWDFUNDING' },
      { name: 'Monego', category: 'CROWDFUNDING' },
      { name: 'Anaxago', category: 'CROWDFUNDING' },
      { name: 'Tokimo', category: 'CROWDFUNDING' },
      { name: 'Proximea', category: 'CROWDFUNDING' },
      { name: 'Tantiem', category: 'FRACTIONNE' },
      { name: 'Bricks', category: 'FRACTIONNE' },
    ];

    const createEntities = async (type: GraphEntityType, defs: { name: string; city?: string; website?: string }[]) =>
      Promise.all(
        defs.map((d) => {
          const coords = d.city ? ENTITY_CITY_COORDS[d.city] : undefined;
          return prisma.graphEntity.create({
            data: {
              organizationId: organization.id,
              type,
              name: d.name,
              city: d.city,
              website: d.website,
              lat: coords?.lat,
              lng: coords?.lng,
            },
          });
        }),
      );

    const [promoteurs, banques, notaires, architectes, collectivites, investisseurs] = await Promise.all([
      createEntities(GraphEntityType.PROMOTEUR, promoteurDefs),
      createEntities(GraphEntityType.BANQUE, banqueDefs),
      createEntities(GraphEntityType.NOTAIRE, notaireDefs),
      createEntities(GraphEntityType.ARCHITECTE, architecteDefs),
      createEntities(GraphEntityType.COLLECTIVITE, collectiviteDefs),
      createEntities(GraphEntityType.INVESTISSEUR, investisseurDefs),
    ]);
    const platforms = await Promise.all(
      platformDefs.map((p) =>
        prisma.graphEntity.create({
          data: {
            organizationId: organization.id,
            type: GraphEntityType.PLATEFORME,
            name: p.name,
            website: p.website,
            metadata: { category: p.category },
          },
        }),
      ),
    );

    // A few cross-entity relations and deal linkages to populate the graph view.
    await prisma.graphRelation.create({
      data: {
        organizationId: organization.id,
        fromEntityId: promoteurs[0].id,
        toEntityId: banques[0].id,
        type: GraphRelationType.FINANCEUR,
        label: 'Financement récurrent',
      },
    });
    await prisma.graphRelation.create({
      data: {
        organizationId: organization.id,
        fromEntityId: platforms[0].id,
        toEntityId: platforms[1].id,
        type: GraphRelationType.CONCURRENT,
      },
    });

    const dealsForLinks = createdDeals.slice(0, 6);
    for (const [idx, d] of dealsForLinks.entries()) {
      await prisma.dealEntityLink.create({
        data: { dealId: d.id, entityId: promoteurs[idx % promoteurs.length].id, role: DealEntityRole.PROMOTEUR },
      });
      await prisma.dealEntityLink.create({
        data: { dealId: d.id, entityId: banques[idx % banques.length].id, role: DealEntityRole.BANQUE_FINANCEUR },
      });
      if (idx % 2 === 0) {
        await prisma.dealEntityLink.create({
          data: { dealId: d.id, entityId: notaires[0].id, role: DealEntityRole.NOTAIRE },
        });
      }
    }

    // ── Dossiers: guarantees + financial model on the promotion/marchand-de-biens deals.
    const financeable = createdDeals.filter((d) => ['PROMOTION', 'MARCHAND_DE_BIENS'].includes(d.type)).slice(0, 5);
    for (const d of financeable) {
      await prisma.guarantee.create({
        data: {
          dealId: d.id,
          type: randomFrom(Object.values(GuaranteeType)),
          description: 'Garantie principale du dossier',
          amount: randomInt(100, 900) * 1000,
          rank: 1,
        },
      });
      const surface = randomInt(400, 2000);
      const constructionCost = randomInt(1400, 2200);
      const sellingPrice = Math.round(constructionCost * (randomInt(150, 190) / 100));
      await prisma.financialAssumption.create({
        data: {
          dealId: d.id,
          surfaceSqm: surface,
          constructionCostPerSqm: constructionCost,
          sellingPricePerSqm: sellingPrice,
          otherCosts: randomInt(50, 300) * 1000,
          targetMarginPct: 15,
        },
      });
    }

    // ── Intelligence Marché: one automated source (real, public data.gouv.fr
    // connector) and one manual source with a couple of analyst-entered notes.
    await prisma.newsSource.create({
      data: {
        organizationId: organization.id,
        name: 'data.gouv.fr — Immobilier & construction',
        connector: 'data-gouv-catalogue',
        url: 'immobilier logement construction permis de construire',
        active: true,
      },
    });
    const manualSource = await prisma.newsSource.create({
      data: {
        organizationId: organization.id,
        name: 'Veille interne',
        connector: 'manual',
        active: true,
      },
    });
    await prisma.article.create({
      data: {
        organizationId: organization.id,
        sourceId: manualSource.id,
        title: 'Point de conjoncture — taux des crédits immobiliers',
        summary:
          "Note interne de suivi macro : à documenter avec les dernières données de la Banque de France lors de la prochaine revue.",
        category: ArticleCategory.TAUX,
        publishedAt: new Date(),
        dedupeHash: `seed-${manualSource.id}-taux`,
        priority: Priority.MEDIUM,
      },
    });
    await prisma.article.create({
      data: {
        organizationId: organization.id,
        sourceId: manualSource.id,
        title: 'Veille réglementaire — évolutions à surveiller ce trimestre',
        summary: "Rubrique à alimenter par les analystes au fil de l'eau.",
        category: ArticleCategory.REGLEMENTATION,
        publishedAt: new Date(Date.now() - 2 * 86_400_000),
        dedupeHash: `seed-${manualSource.id}-reglementation`,
        priority: Priority.LOW,
      },
    });
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
