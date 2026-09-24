import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma";
import {
  Role,
  Trade,
  AustralianState,
  CredentialType,
  CredentialStatus,
  DocumentCategory,
  DocumentStatus,
  JobStatus,
  MessageKind,
  EscrowStatus,
  DisputeStatus,
} from "../src/generated/prisma";
import { saveUpload } from "../src/lib/storage";
import { calculateFeeAndPayout } from "../src/lib/rules/escrow";
import { isValidAbn } from "../src/lib/rules/abn";

const db = new PrismaClient();

const DEMO_PASSWORD = "Password123!";
const SEED_FILES_DIR = path.join(process.cwd(), "prisma", "seed-files");

const DAY_MS = 24 * 60 * 60 * 1000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY_MS);
const daysFromNow = (n: number) => new Date(Date.now() + n * DAY_MS);

async function fileFromSeed(
  ownerId: string,
  name: "sample-licence.pdf" | "sample-photo.png",
  displayName: string
) {
  const buffer = await readFile(path.join(SEED_FILES_DIR, name));
  const saved = await saveUpload(buffer);
  return db.file.create({
    data: {
      ownerId,
      originalName: displayName,
      mimeType: saved.mimeType,
      sizeBytes: saved.sizeBytes,
      storagePath: saved.storagePath,
    },
  });
}

/** Deterministically generates `count` distinct ABNs that pass the real checksum. */
function generateValidAbns(count: number): string[] {
  const abns: string[] = [];
  let seed = 100000000;
  while (abns.length < count) {
    seed += 7919; // step by a prime so digits vary across the run
    const candidate = String(1_000_000_0000 + (seed % 89_999_999_999)).slice(0, 11);
    if (isValidAbn(candidate) && !abns.includes(candidate)) abns.push(candidate);
  }
  return abns;
}

async function main() {
  console.log("Seeding LFA demo data…");
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  // ---------- Admin ----------
  const admin = await db.user.create({
    data: { email: "admin@demo.test", passwordHash, role: Role.ADMIN },
  });

  // ---------- The one company ----------
  const builderUser = await db.user.create({
    data: { email: "builder@demo.test", passwordHash, role: Role.COMPANY },
  });
  const builder = await db.companyProfile.create({
    data: {
      userId: builderUser.id,
      companyName: "Builder Co Pty Ltd",
      abn: "51824753556",
      contactName: "Sam Nguyen",
      phone: "0400 111 222",
      state: AustralianState.NSW,
      postcode: "2000",
      verified: true,
    },
  });

  // ---------- The one fully-featured worker ----------
  const liveUser = await db.user.create({
    data: { email: "worker.live@demo.test", passwordHash, role: Role.WORKER },
  });
  const liveWorker = await db.workerProfile.create({
    data: {
      userId: liveUser.id,
      fullName: "Jack Thompson",
      phone: "0411 000 001",
      abn: "51824753556",
      primaryTrade: Trade.PLUMBER,
      otherTrades: "[]",
      yearsExperience: 9,
      bio: "Licensed plumber with nine years' experience across residential and light commercial jobs in Sydney.",
      hourlyRate: 9500,
      homeState: AustralianState.NSW,
      serviceRadiusKm: 40,
      postcode: "2000",
      profileStatus: "LIVE",
    },
  });
  for (const [type, extra] of [
    [
      CredentialType.TRADE_LICENCE,
      {
        trade: Trade.PLUMBER,
        licenceNumber: "PL-88213",
        issuingState: AustralianState.NSW,
        issuer: "NSW Fair Trading",
        expiryDate: daysFromNow(300),
      },
    ],
    [CredentialType.WHITE_CARD, { expiryDate: daysFromNow(600) }],
    [CredentialType.PUBLIC_LIABILITY, { expiryDate: daysFromNow(200) }],
  ] as const) {
    const file = await fileFromSeed(
      liveUser.id,
      "sample-licence.pdf",
      `${type}.pdf`
    );
    await db.credential.create({
      data: {
        workerId: liveWorker.id,
        type,
        fileId: file.id,
        status: CredentialStatus.APPROVED,
        reviewedBy: admin.id,
        reviewedAt: daysAgo(30),
        ...extra,
      },
    });
  }

  // ---------- 20 dummy worker profiles for the directory ----------
  // Plain browsable data only — no credentials, no featured demo login (see
  // DECISIONS.md: "only one dashboard for the labour").
  const DUMMY_WORKERS: {
    fullName: string;
    trade: Trade;
    state: AustralianState;
    postcode: string;
    years: number;
    rateDollars: number;
    radiusKm: number;
  }[] = [
    { fullName: "Liam Carter", trade: Trade.PLUMBER, state: AustralianState.NSW, postcode: "2150", years: 6, rateDollars: 85, radiusKm: 30 },
    { fullName: "Olivia Bennett", trade: Trade.ELECTRICIAN, state: AustralianState.NSW, postcode: "2200", years: 8, rateDollars: 95, radiusKm: 35 },
    { fullName: "Noah Walker", trade: Trade.CARPENTER, state: AustralianState.NSW, postcode: "2560", years: 4, rateDollars: 75, radiusKm: 25 },
    { fullName: "Ava Mitchell", trade: Trade.LABOURER, state: AustralianState.NSW, postcode: "2170", years: 3, rateDollars: 55, radiusKm: 40 },
    { fullName: "Ethan Ross", trade: Trade.PLUMBER, state: AustralianState.VIC, postcode: "3121", years: 12, rateDollars: 105, radiusKm: 30 },
    { fullName: "Mia Coleman", trade: Trade.ELECTRICIAN, state: AustralianState.VIC, postcode: "3055", years: 7, rateDollars: 92, radiusKm: 35 },
    { fullName: "Lucas Reid", trade: Trade.CARPENTER, state: AustralianState.VIC, postcode: "3216", years: 15, rateDollars: 88, radiusKm: 45 },
    { fullName: "Charlotte Hughes", trade: Trade.LABOURER, state: AustralianState.VIC, postcode: "3020", years: 2, rateDollars: 50, radiusKm: 20 },
    { fullName: "Mason Clarke", trade: Trade.PLUMBER, state: AustralianState.QLD, postcode: "4051", years: 5, rateDollars: 80, radiusKm: 30 },
    { fullName: "Amelia Foster", trade: Trade.ELECTRICIAN, state: AustralianState.QLD, postcode: "4109", years: 10, rateDollars: 98, radiusKm: 40 },
    { fullName: "James Turner", trade: Trade.CARPENTER, state: AustralianState.QLD, postcode: "4218", years: 9, rateDollars: 82, radiusKm: 35 },
    { fullName: "Harper Bell", trade: Trade.LABOURER, state: AustralianState.QLD, postcode: "4350", years: 4, rateDollars: 52, radiusKm: 25 },
    { fullName: "Benjamin Ward", trade: Trade.PLUMBER, state: AustralianState.WA, postcode: "6053", years: 11, rateDollars: 100, radiusKm: 30 },
    { fullName: "Isla Hunt", trade: Trade.ELECTRICIAN, state: AustralianState.WA, postcode: "6150", years: 6, rateDollars: 90, radiusKm: 35 },
    { fullName: "Henry Palmer", trade: Trade.CARPENTER, state: AustralianState.WA, postcode: "6230", years: 3, rateDollars: 70, radiusKm: 20 },
    { fullName: "Grace Simmons", trade: Trade.LABOURER, state: AustralianState.SA, postcode: "5000", years: 5, rateDollars: 54, radiusKm: 30 },
    { fullName: "Jack Sullivan", trade: Trade.PLUMBER, state: AustralianState.SA, postcode: "5158", years: 7, rateDollars: 87, radiusKm: 30 },
    { fullName: "Zoe Marshall", trade: Trade.ELECTRICIAN, state: AustralianState.TAS, postcode: "7000", years: 8, rateDollars: 89, radiusKm: 25 },
    { fullName: "Leo Whitfield", trade: Trade.CARPENTER, state: AustralianState.ACT, postcode: "2600", years: 13, rateDollars: 91, radiusKm: 30 },
    { fullName: "Ruby Dawson", trade: Trade.LABOURER, state: AustralianState.NT, postcode: "0800", years: 6, rateDollars: 58, radiusKm: 40 },
  ];

  const TRADE_BLURB: Record<Trade, string> = {
    PLUMBER: "plumbing repairs, installations and maintenance",
    ELECTRICIAN: "residential and commercial electrical work",
    CARPENTER: "fit-outs, framing and general carpentry",
    LABOURER: "site labour, demolition and materials handling",
  };

  const dummyAbns = generateValidAbns(DUMMY_WORKERS.length);

  for (const [i, w] of DUMMY_WORKERS.entries()) {
    const email = `${w.fullName.toLowerCase().replace(/\s+/g, ".")}@demo.test`;
    const user = await db.user.create({
      data: { email, passwordHash, role: Role.WORKER },
    });
    await db.workerProfile.create({
      data: {
        userId: user.id,
        fullName: w.fullName,
        phone: `04${String(10000000 + i).padStart(8, "0")}`,
        abn: dummyAbns[i],
        primaryTrade: w.trade,
        otherTrades: "[]",
        yearsExperience: w.years,
        bio: `Experienced ${w.trade.toLowerCase()} offering ${TRADE_BLURB[w.trade]} across ${w.state}. ${w.years} years in the trade.`,
        hourlyRate: w.rateDollars * 100,
        homeState: w.state,
        serviceRadiusKm: w.radiusKm,
        postcode: w.postcode,
        profileStatus: "LIVE",
      },
    });
  }

  // ---------- The one company's 3 jobs with the one worker ----------
  // Each hire is its own Conversation (a company can re-hire the same
  // worker — see DECISIONS.md), all with Jack Thompson: 2 IN_PROGRESS,
  // 1 DISPUTED — the same scenario shows up on both dashboards.

  async function hireIntoJob(params: {
    title: string;
    description: string;
    budgetDollars: number;
    status: typeof JobStatus.IN_PROGRESS | typeof JobStatus.DISPUTED;
    startedDaysAgo: number;
    firstMessageDaysAgo: number;
  }) {
    const conversation = await db.conversation.create({
      data: { companyId: builder.id, workerId: liveWorker.id },
    });
    const budgetCents = params.budgetDollars * 100;

    await db.message.createMany({
      data: [
        {
          conversationId: conversation.id,
          senderId: builderUser.id,
          kind: MessageKind.TEXT,
          body: `Hi Jack, we've got a job — ${params.title.toLowerCase()}. Are you free?`,
          createdAt: daysAgo(params.firstMessageDaysAgo),
        },
        {
          conversationId: conversation.id,
          senderId: liveUser.id,
          kind: MessageKind.PROPOSAL,
          body: `Proposal: ${params.title} — $${params.budgetDollars.toFixed(2)}`,
          proposalTitle: params.title,
          proposalDescription: params.description,
          proposalBudget: budgetCents,
          createdAt: daysAgo(params.firstMessageDaysAgo - 1),
        },
      ],
    });

    const job = await db.job.create({
      data: {
        companyId: builder.id,
        workerId: liveWorker.id,
        title: params.title,
        description: params.description,
        trade: Trade.PLUMBER,
        state: AustralianState.NSW,
        postcode: "2000",
        startDate: daysAgo(params.startedDaysAgo),
        budget: budgetCents,
        status: params.status,
      },
    });
    await db.conversation.update({
      where: { id: conversation.id },
      data: { jobId: job.id },
    });
    await db.message.create({
      data: {
        conversationId: conversation.id,
        senderId: builderUser.id,
        kind: MessageKind.SYSTEM,
        body: `Jack Thompson was marked as hired for "${params.title}".`,
        createdAt: daysAgo(params.startedDaysAgo),
      },
    });

    const { platformFee, workerPayout } = calculateFeeAndPayout(budgetCents);
    const escrow = await db.escrowTransaction.create({
      data: {
        jobId: job.id,
        amount: budgetCents,
        platformFee,
        workerPayout,
        status:
          params.status === JobStatus.DISPUTED
            ? EscrowStatus.DISPUTED
            : EscrowStatus.IN_PROGRESS,
        providerRef: `hold_${job.id}`,
        fundedAt: daysAgo(params.startedDaysAgo + 1),
        startedAt: daysAgo(params.startedDaysAgo),
      },
    });
    await db.escrowEvent.createMany({
      data: [
        {
          escrowId: escrow.id,
          fromStatus: EscrowStatus.AWAITING_FUNDING,
          toStatus: EscrowStatus.FUNDED,
          actorId: builderUser.id,
          note: "Job funded (mock payment).",
          createdAt: daysAgo(params.startedDaysAgo + 1),
        },
        {
          escrowId: escrow.id,
          fromStatus: EscrowStatus.FUNDED,
          toStatus: EscrowStatus.IN_PROGRESS,
          actorId: liveUser.id,
          note: "Worker started the job.",
          createdAt: daysAgo(params.startedDaysAgo),
        },
      ],
    });

    return { conversation, job, escrow };
  }

  // Job 1: IN_PROGRESS, with an admin-approved contract document.
  const job1 = await hireIntoJob({
    title: "Bathroom renovation plumbing",
    description:
      "Rough-in and fit-off plumbing for a full bathroom renovation, including new shower and vanity connections.",
    budgetDollars: 3000,
    status: JobStatus.IN_PROGRESS,
    startedDaysAgo: 3,
    firstMessageDaysAgo: 6,
  });
  const contractFile = await fileFromSeed(
    builderUser.id,
    "sample-licence.pdf",
    "draft-contract.pdf"
  );
  await db.document.create({
    data: {
      conversationId: job1.conversation.id,
      uploaderId: builderUser.id,
      recipientId: liveUser.id,
      category: DocumentCategory.CONTRACT,
      fileId: contractFile.id,
      status: DocumentStatus.APPROVED,
      reviewNote: "Standard contract template, cleared.",
    },
  });

  // Job 2: IN_PROGRESS, with a document still awaiting admin review — keeps
  // the admin document queue non-empty for the demo.
  const job2 = await hireIntoJob({
    title: "Kitchen pipe replacement",
    description:
      "Replace ageing copper pipework under the kitchen sink and connect a new dishwasher line.",
    budgetDollars: 1800,
    status: JobStatus.IN_PROGRESS,
    startedDaysAgo: 6,
    firstMessageDaysAgo: 9,
  });
  const scopeFile = await fileFromSeed(
    liveUser.id,
    "sample-photo.png",
    "kitchen-scope-photo.png"
  );
  await db.document.create({
    data: {
      conversationId: job2.conversation.id,
      uploaderId: liveUser.id,
      recipientId: builderUser.id,
      category: DocumentCategory.SCOPE,
      fileId: scopeFile.id,
      status: DocumentStatus.PENDING_REVIEW,
    },
  });

  // Job 3: DISPUTED.
  const job3 = await hireIntoJob({
    title: "Hot water system installation",
    description:
      "Remove the old electric hot water unit and install a new gas continuous-flow system.",
    budgetDollars: 2200,
    status: JobStatus.DISPUTED,
    startedDaysAgo: 8,
    firstMessageDaysAgo: 11,
  });
  await db.escrowEvent.create({
    data: {
      escrowId: job3.escrow.id,
      fromStatus: EscrowStatus.IN_PROGRESS,
      toStatus: EscrowStatus.DISPUTED,
      actorId: builderUser.id,
      note: "Dispute raised — installed unit doesn't match the agreed model.",
      createdAt: daysAgo(1),
    },
  });
  await db.dispute.create({
    data: {
      jobId: job3.job.id,
      raisedBy: builderUser.id,
      reason:
        "The installed hot water unit doesn't match the model agreed in the proposal.",
      status: DisputeStatus.OPEN,
    },
  });
  await db.message.create({
    data: {
      conversationId: job3.conversation.id,
      senderId: builderUser.id,
      kind: MessageKind.TEXT,
      body: "This isn't the unit we agreed on — we need to sort this out.",
      createdAt: daysAgo(1),
    },
  });

  // ---------- Notifications ----------
  await db.notification.createMany({
    data: [
      {
        userId: liveUser.id,
        message: 'A dispute was raised on "Hot water system installation".',
        link: `/worker/messages/${job3.conversation.id}`,
      },
      {
        userId: builderUser.id,
        message: "A document is awaiting admin review on \"Kitchen pipe replacement\".",
        link: `/company/messages/${job2.conversation.id}`,
      },
    ],
  });

  console.log("Seed complete.");
  console.log(`  Admin:    admin@demo.test`);
  console.log(`  Company:  builder@demo.test`);
  console.log(`  Worker:   worker.live@demo.test`);
  console.log(`  Plus ${DUMMY_WORKERS.length} browsable dummy worker profiles.`);
  console.log(`  Password (all): ${DEMO_PASSWORD}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
