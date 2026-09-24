import { test, expect, type Browser, type Page } from "@playwright/test";

// The trimmed happy path for this prototype's remaining scope (escrow and
// its "flow 5" e2e target were dropped — see DECISIONS.md): a company
// posts a job, a live eligible worker quotes on it, the company hires them,
// and a document they exchange goes through admin review before the other
// party can see it.

async function loginAs(browser: Browser, demoButtonLabel: string): Promise<Page> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("/login");
  await page.getByRole("button", { name: demoButtonLabel }).click();
  await page.waitForURL(/\/dashboard/);
  return page;
}

test("hiring and document review happy path", async ({ browser }) => {
  const company = await loginAs(browser, "Company — Builder");
  const worker = await loginAs(browser, "Worker — live");
  const admin = await loginAs(browser, "Admin");

  // 1. Company posts a job.
  await company.goto("/company/jobs/new");
  await company.locator("#title").fill("E2E: hot water repair");
  await company
    .locator("#description")
    .fill("Diagnose and repair a leaking hot water system.");
  await company.locator("#trade").selectOption("PLUMBER");
  await company.locator("#state").selectOption("NSW");
  await company.locator("#postcode").fill("2010");
  await company.locator("#startDate").fill("2026-12-01");
  await company.locator("#budgetDollars").fill("500");
  await company.getByRole("button", { name: "Post job" }).click();
  await company.waitForSelector("text=Quotes (0)");
  const jobUrl = company.url();
  const jobId = jobUrl.split("/").pop()!;

  // 2. The live NSW plumber sees it in their feed and quotes.
  await worker.goto("/worker/jobs");
  await expect(worker.getByText("E2E: hot water repair")).toBeVisible();
  await worker.getByText("E2E: hot water repair").click();
  await worker.locator("#amountDollars").fill("450");
  await worker.locator("#message").fill("Can attend tomorrow morning.");
  await worker.getByRole("button", { name: "Submit quote" }).click();
  await expect(worker.getByText("SUBMITTED")).toBeVisible();

  // 3. The company accepts the quote — job goes straight to HIRED.
  await company.goto(jobUrl);
  await company.getByRole("button", { name: "Accept & hire" }).click();
  await expect(company.getByText("HIRED", { exact: true })).toBeVisible();

  // 4. The company shares a contract document on the job.
  await company.locator("#doc-category").selectOption("CONTRACT");
  await company.setInputFiles("#doc-file", "prisma/seed-files/sample-licence.pdf");
  await company.getByRole("button", { name: "Upload" }).click();
  await expect(company.getByText("PENDING_REVIEW")).toBeVisible();

  // 5. It's invisible to the worker until admin approves it.
  await worker.goto(`/worker/jobs/${jobId}`);
  await expect(worker.getByText("No documents shared yet.")).toBeVisible();

  await admin.goto("/admin/documents");
  await expect(admin.getByText("CONTRACT")).toBeVisible();
  await admin.getByRole("button", { name: "Approve" }).first().click();

  // 6. Now the worker sees it, approved.
  await worker.goto(`/worker/jobs/${jobId}`);
  await expect(worker.locator("p.font-medium", { hasText: "CONTRACT" })).toBeVisible();
  await expect(worker.getByText("APPROVED")).toBeVisible();

  // 7. The worker was notified when they were hired.
  await worker.goto("/worker/dashboard");
  await worker.getByRole("button", { name: "Notifications" }).click();
  await expect(worker.getByText(/hired for/i)).toBeVisible();
});
