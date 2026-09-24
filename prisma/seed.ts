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
  QuoteStatus,
  EscrowStatus,
  DisputeStatus,
} from "../src/generated/prisma";
import { saveUpload } from "../src/lib/storage";
import { calculateFeeAndPayout } from "../src/lib/rules/escrow";

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

async function main() {
  console.log("Seeding LFA demo data…");
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  // ---------- Admin ----------
  const admin = await db.user.create({
    data: { email: "admin@demo.test", passwordHash, role: Role.ADMIN },
  });

  // ---------- Companies ----------
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

  const facilitiesUser = await db.user.create({
    data: { email: "facilities@demo.test", passwordHash, role: Role.COMPANY },
  });
  const facilities = await db.companyProfile.create({
    data: {
      userId: facilitiesUser.id,
      companyName: "Facilities Management Group",
      abn: "51046555916",
      contactName: "Priya Kaur",
      phone: "0400 333 444",
      state: AustralianState.VIC,
      postcode: "3000",
      verified: true,
    },
  });

  // ---------- Workers ----------

  // 1. Fully verified and live — plumber, NSW
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

  // 2. Pending review — carpenter, VIC
  const pendingUser = await db.user.create({
    data: {
      email: "worker.pending@demo.test",
      passwordHash,
      role: Role.WORKER,
    },
  });
  const pendingWorker = await db.workerProfile.create({
    data: {
      userId: pendingUser.id,
      fullName: "Maria Souza",
      phone: "0411 000 002",
      abn: "17622127362",
      primaryTrade: Trade.CARPENTER,
      otherTrades: "[]",
      yearsExperience: 4,
      bio: "Carpenter specialising in fit-outs and joinery, recently relocated to Melbourne and building a local client base.",
      hourlyRate: 7000,
      homeState: AustralianState.VIC,
      serviceRadiusKm: 30,
      postcode: "3000",
      profileStatus: "PENDING_REVIEW",
    },
  });
  for (const type of [
    CredentialType.WHITE_CARD,
    CredentialType.PUBLIC_LIABILITY,
  ]) {
    const file = await fileFromSeed(
      pendingUser.id,
      "sample-licence.pdf",
      `${type}.pdf`
    );
    await db.credential.create({
      data: {
        workerId: pendingWorker.id,
        type,
        fileId: file.id,
        status: CredentialStatus.PENDING,
        expiryDate: daysFromNow(365),
      },
    });
  }

  // 3. Expired insurance -> hidden — labourer, QLD
  const hiddenUser = await db.user.create({
    data: {
      email: "worker.hidden@demo.test",
      passwordHash,
      role: Role.WORKER,
    },
  });
  const hiddenWorker = await db.workerProfile.create({
    data: {
      userId: hiddenUser.id,
      fullName: "Dave Okafor",
      phone: "0411 000 003",
      abn: "27103641638",
      primaryTrade: Trade.LABOURER,
      otherTrades: "[]",
      yearsExperience: 6,
      bio: "General labourer available for demolition, site clean-up and materials handling across Brisbane.",
      hourlyRate: 5500,
      homeState: AustralianState.QLD,
      serviceRadiusKm: 50,
      postcode: "4000",
      profileStatus: "HIDDEN",
    },
  });
  const hiddenWhiteCardFile = await fileFromSeed(
    hiddenUser.id,
    "sample-licence.pdf",
    "white-card.pdf"
  );
  await db.credential.create({
    data: {
      workerId: hiddenWorker.id,
      type: CredentialType.WHITE_CARD,
      fileId: hiddenWhiteCardFile.id,
      status: CredentialStatus.APPROVED, // stored APPROVED — expiry makes it EXPIRED at read time
      reviewedBy: admin.id,
      reviewedAt: daysAgo(400),
      expiryDate: daysAgo(10), // expired 10 days ago
    },
  });

  // 4. Rejected licence — electrician, VIC
  const rejectedUser = await db.user.create({
    data: {
      email: "worker.rejected@demo.test",
      passwordHash,
      role: Role.WORKER,
    },
  });
  const rejectedWorker = await db.workerProfile.create({
    data: {
      userId: rejectedUser.id,
      fullName: "Liam Fitzgerald",
      phone: "0411 000 004",
      abn: "76211272261",
      primaryTrade: Trade.ELECTRICIAN,
      otherTrades: "[]",
      yearsExperience: 3,
      bio: "Electrician currently resolving a licence document issue with the platform before taking on jobs.",
      hourlyRate: 8000,
      homeState: AustralianState.VIC,
      serviceRadiusKm: 25,
      postcode: "3121",
      profileStatus: "PENDING_REVIEW",
    },
  });
  const rejectedLicenceFile = await fileFromSeed(
    rejectedUser.id,
    "sample-licence.pdf",
    "trade-licence.pdf"
  );
  await db.credential.create({
    data: {
      workerId: rejectedWorker.id,
      type: CredentialType.TRADE_LICENCE,
      trade: Trade.ELECTRICIAN,
      licenceNumber: "EL-40021",
      issuingState: AustralianState.VIC,
      issuer: "Energy Safe Victoria",
      fileId: rejectedLicenceFile.id,
      status: CredentialStatus.REJECTED,
      reviewedBy: admin.id,
      reviewedAt: daysAgo(5),
      rejectionReason:
        "The uploaded document is illegible — please re-upload a clear scan of your current licence.",
      expiryDate: daysFromNow(365),
    },
  });

  // 5. Electrician licensed in NSW only — live, demonstrates the state rule
  const nswUser = await db.user.create({
    data: { email: "worker.nsw@demo.test", passwordHash, role: Role.WORKER },
  });
  const nswWorker = await db.workerProfile.create({
    data: {
      userId: nswUser.id,
      fullName: "Chen Wei",
      phone: "0411 000 005",
      abn: "88000014675",
      primaryTrade: Trade.ELECTRICIAN,
      otherTrades: "[]",
      yearsExperience: 11,
      bio: "Fully licensed electrician based in Sydney, available for commercial and residential rewiring and switchboard upgrades.",
      hourlyRate: 10500,
      homeState: AustralianState.NSW,
      serviceRadiusKm: 60,
      postcode: "2010",
      profileStatus: "LIVE",
    },
  });
  for (const [type, extra] of [
    [
      CredentialType.TRADE_LICENCE,
      {
        trade: Trade.ELECTRICIAN,
        licenceNumber: "EL-10098",
        issuingState: AustralianState.NSW,
        issuer: "NSW Fair Trading",
        expiryDate: daysFromNow(500),
      },
    ],
    [CredentialType.WHITE_CARD, { expiryDate: daysFromNow(700) }],
    [CredentialType.PUBLIC_LIABILITY, { expiryDate: daysFromNow(400) }],
  ] as const) {
    const file = await fileFromSeed(
      nswUser.id,
      "sample-licence.pdf",
      `${type}.pdf`
    );
    await db.credential.create({
      data: {
        workerId: nswWorker.id,
        type,
        fileId: file.id,
        status: CredentialStatus.APPROVED,
        reviewedBy: admin.id,
        reviewedAt: daysAgo(60),
        ...extra,
      },
    });
  }

  // ---------- Jobs ----------

  // Job A: OPEN — Builder Co, plumber, NSW. A couple of open quotes.
  const jobOpen = await db.job.create({
    data: {
      companyId: builder.id,
      title: "Kitchen pipe replacement",
      description:
        "Replace ageing copper pipework under the kitchen sink and connect a new dishwasher line. Half-day job.",
      trade: Trade.PLUMBER,
      state: AustralianState.NSW,
      postcode: "2010",
      startDate: daysFromNow(10),
      budget: 60000,
      status: JobStatus.OPEN,
    },
  });
  await db.quote.create({
    data: {
      jobId: jobOpen.id,
      workerId: liveWorker.id,
      amount: 55000,
      message: "Can start next week, happy to supply fittings.",
      status: QuoteStatus.SUBMITTED,
    },
  });

  // Job B: IN_PROGRESS — Facilities Co, electrician (NSW), hired worker.nsw.
  // Escrow: FUNDED -> IN_PROGRESS.
  const jobInProgress = await db.job.create({
    data: {
      companyId: facilities.id,
      title: "Office switchboard upgrade",
      description:
        "Upgrade the main switchboard for a 12-desk office fit-out, including new circuit breakers and safety switches.",
      trade: Trade.ELECTRICIAN,
      state: AustralianState.NSW,
      postcode: "2010",
      startDate: daysAgo(2),
      budget: 320000,
      status: JobStatus.IN_PROGRESS,
      hiredWorkerId: nswWorker.id,
    },
  });
  const quoteB = await db.quote.create({
    data: {
      jobId: jobInProgress.id,
      workerId: nswWorker.id,
      amount: 300000,
      message: "Can do this over two days, including compliance certificate.",
      status: QuoteStatus.ACCEPTED,
    },
  });
  {
    const { platformFee, workerPayout } = calculateFeeAndPayout(
      quoteB.amount
    );
    const escrowB = await db.escrowTransaction.create({
      data: {
        jobId: jobInProgress.id,
        amount: quoteB.amount,
        platformFee,
        workerPayout,
        status: EscrowStatus.IN_PROGRESS,
        providerRef: "hold_seed_b",
        fundedAt: daysAgo(3),
        startedAt: daysAgo(2),
      },
    });
    await db.escrowEvent.createMany({
      data: [
        {
          escrowId: escrowB.id,
          fromStatus: EscrowStatus.AWAITING_FUNDING,
          toStatus: EscrowStatus.FUNDED,
          actorId: facilitiesUser.id,
          note: "Job funded (mock payment).",
          createdAt: daysAgo(3),
        },
        {
          escrowId: escrowB.id,
          fromStatus: EscrowStatus.FUNDED,
          toStatus: EscrowStatus.IN_PROGRESS,
          actorId: nswUser.id,
          note: "Worker started the job.",
          createdAt: daysAgo(2),
        },
      ],
    });
  }

  // Job C: PROOF_SUBMITTED — Builder Co, plumber, hired worker.live.
  // Escrow PROOF_SUBMITTED, proof document already admin-approved, awaiting
  // company approval.
  const jobProof = await db.job.create({
    data: {
      companyId: builder.id,
      title: "Bathroom fit-out plumbing",
      description:
        "Rough-in and fit-off plumbing for a full bathroom renovation, including new shower and vanity connections.",
      trade: Trade.PLUMBER,
      state: AustralianState.NSW,
      postcode: "2000",
      startDate: daysAgo(6),
      budget: 450000,
      status: JobStatus.PROOF_SUBMITTED,
      hiredWorkerId: liveWorker.id,
    },
  });
  const quoteC = await db.quote.create({
    data: {
      jobId: jobProof.id,
      workerId: liveWorker.id,
      amount: 420000,
      message: "Includes all fittings and a compliance certificate.",
      status: QuoteStatus.ACCEPTED,
    },
  });
  const proofFile = await fileFromSeed(
    liveUser.id,
    "sample-photo.png",
    "completed-bathroom.png"
  );
  await db.document.create({
    data: {
      jobId: jobProof.id,
      uploaderId: liveUser.id,
      recipientId: builderUser.id,
      category: DocumentCategory.PROOF_OF_COMPLETION,
      fileId: proofFile.id,
      status: DocumentStatus.APPROVED,
      reviewNote: "Photos confirm the described work.",
    },
  });
  {
    const { platformFee, workerPayout } = calculateFeeAndPayout(
      quoteC.amount
    );
    const escrowC = await db.escrowTransaction.create({
      data: {
        jobId: jobProof.id,
        amount: quoteC.amount,
        platformFee,
        workerPayout,
        status: EscrowStatus.PROOF_SUBMITTED,
        providerRef: "hold_seed_c",
        fundedAt: daysAgo(6),
        startedAt: daysAgo(5),
        proofSubmittedAt: daysAgo(1),
      },
    });
    await db.escrowEvent.createMany({
      data: [
        {
          escrowId: escrowC.id,
          fromStatus: EscrowStatus.AWAITING_FUNDING,
          toStatus: EscrowStatus.FUNDED,
          actorId: builderUser.id,
          note: "Job funded (mock payment).",
          createdAt: daysAgo(6),
        },
        {
          escrowId: escrowC.id,
          fromStatus: EscrowStatus.FUNDED,
          toStatus: EscrowStatus.IN_PROGRESS,
          actorId: liveUser.id,
          note: "Worker started the job.",
          createdAt: daysAgo(5),
        },
        {
          escrowId: escrowC.id,
          fromStatus: EscrowStatus.IN_PROGRESS,
          toStatus: EscrowStatus.PROOF_SUBMITTED,
          actorId: liveUser.id,
          note: "Proof of completion submitted.",
          createdAt: daysAgo(1),
        },
      ],
    });
  }

  // Job D: DISPUTED — Facilities Co, carpenter, hired worker.pending
  // (seed only — normally only LIVE workers can be hired).
  const jobDisputed = await db.job.create({
    data: {
      companyId: facilities.id,
      title: "Warehouse shelving install",
      description:
        "Install freestanding timber shelving units across the warehouse mezzanine.",
      trade: Trade.CARPENTER,
      state: AustralianState.VIC,
      postcode: "3000",
      startDate: daysAgo(8),
      budget: 180000,
      status: JobStatus.DISPUTED,
      hiredWorkerId: pendingWorker.id,
    },
  });
  const quoteD = await db.quote.create({
    data: {
      jobId: jobDisputed.id,
      workerId: pendingWorker.id,
      amount: 170000,
      message: "Can complete within a week.",
      status: QuoteStatus.ACCEPTED,
    },
  });
  {
    const { platformFee, workerPayout } = calculateFeeAndPayout(
      quoteD.amount
    );
    const escrowD = await db.escrowTransaction.create({
      data: {
        jobId: jobDisputed.id,
        amount: quoteD.amount,
        platformFee,
        workerPayout,
        status: EscrowStatus.DISPUTED,
        providerRef: "hold_seed_d",
        fundedAt: daysAgo(8),
        startedAt: daysAgo(7),
      },
    });
    await db.escrowEvent.createMany({
      data: [
        {
          escrowId: escrowD.id,
          fromStatus: EscrowStatus.AWAITING_FUNDING,
          toStatus: EscrowStatus.FUNDED,
          actorId: facilitiesUser.id,
          note: "Job funded (mock payment).",
          createdAt: daysAgo(8),
        },
        {
          escrowId: escrowD.id,
          fromStatus: EscrowStatus.FUNDED,
          toStatus: EscrowStatus.IN_PROGRESS,
          actorId: pendingUser.id,
          note: "Worker started the job.",
          createdAt: daysAgo(7),
        },
        {
          escrowId: escrowD.id,
          fromStatus: EscrowStatus.IN_PROGRESS,
          toStatus: EscrowStatus.DISPUTED,
          actorId: facilitiesUser.id,
          note: "Dispute raised over incomplete shelving units.",
          createdAt: daysAgo(1),
        },
      ],
    });
    await db.dispute.create({
      data: {
        jobId: jobDisputed.id,
        raisedBy: facilitiesUser.id,
        reason:
          "Only half of the shelving units were installed and the worker has stopped responding.",
        status: DisputeStatus.OPEN,
      },
    });
  }

  // ---------- Notifications ----------
  await db.notification.createMany({
    data: [
      {
        userId: pendingUser.id,
        message: "Your credentials are awaiting admin review.",
        link: "/worker/credentials",
      },
      {
        userId: rejectedUser.id,
        message: "Your trade licence was rejected — see the reason and re-upload.",
        link: "/worker/credentials",
      },
      {
        userId: hiddenUser.id,
        message: "Your public liability insurance has expired — your profile is hidden.",
        link: "/worker/credentials",
      },
      {
        userId: facilitiesUser.id,
        message: "A dispute was opened on 'Warehouse shelving install'.",
        link: `/company/jobs/${jobDisputed.id}`,
      },
      {
        userId: builderUser.id,
        message: "Proof of completion was approved for 'Bathroom fit-out plumbing' — review and release payment.",
        link: `/company/jobs/${jobProof.id}`,
      },
    ],
  });

  console.log("Seed complete.");
  console.log(`  Admin:      admin@demo.test`);
  console.log(`  Companies:  builder@demo.test, facilities@demo.test`);
  console.log(
    `  Workers:    worker.live@demo.test, worker.pending@demo.test, worker.hidden@demo.test, worker.rejected@demo.test, worker.nsw@demo.test`
  );
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
