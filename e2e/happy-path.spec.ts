import { test, expect, type Browser, type Page } from "@playwright/test";

// The happy path for this prototype's current scope (job-board/escrow were
// dropped in favour of direct search-and-hire + chat — see DECISIONS.md):
// a company searches for a live worker, messages them, sends a proposal,
// the worker replies, the company marks them as hired, and a document
// they exchange goes through admin review before the other party sees it.

async function loginAs(browser: Browser, demoButtonLabel: string): Promise<Page> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("/login");
  await page.getByRole("button", { name: demoButtonLabel }).click();
  await page.waitForURL(/\/dashboard/);
  return page;
}

test("search, message, propose, hire and document review happy path", async ({
  browser,
}) => {
  const company = await loginAs(browser, "Company — Builder Co");
  const worker = await loginAs(browser, "Worker — Jack Thompson");
  const admin = await loginAs(browser, "Admin");

  // 1. Company searches for a live NSW plumber and opens the profile.
  await company.goto("/company/workers?trade=PLUMBER&state=NSW");
  await expect(company.getByText("Jack Thompson")).toBeVisible();
  await company.getByText("Jack Thompson").click();
  await expect(
    company.getByRole("button", { name: "Message this worker" })
  ).toBeVisible();

  // 2. Message the worker — finds-or-creates the conversation.
  await company.getByRole("button", { name: "Message this worker" }).click();
  await company.waitForURL(/\/company\/messages\/[a-z0-9]+$/);
  const conversationUrl = company.url();
  const conversationId = conversationUrl.split("/").pop()!;

  // 3. Send a proposal.
  await company.getByRole("button", { name: "Send a proposal" }).click();
  await company.locator("#proposal-title").fill("E2E: hot water repair");
  await company
    .locator("#proposal-description")
    .fill("Diagnose and repair a leaking hot water system.");
  await company.locator("#proposal-budget").fill("450");
  await company.getByRole("button", { name: "Send proposal" }).click();
  await expect(company.locator("p.font-medium", { hasText: "E2E: hot water repair" })).toBeVisible();

  // 4. The worker sees the proposal and replies.
  await worker.goto(`/worker/messages/${conversationId}`);
  await expect(worker.getByText("E2E: hot water repair")).toBeVisible();
  await worker.locator("textarea").first().fill("Can attend tomorrow morning.");
  await worker.getByRole("button", { name: "Send", exact: true }).click();

  // 5. The company sees the reply via polling — no reload.
  await expect(
    company.getByText("Can attend tomorrow morning.")
  ).toBeVisible({ timeout: 8000 });

  // 6. Mark as hired — job goes straight to HIRED.
  await company.getByRole("button", { name: "Mark as hired" }).click();
  await company.locator("#hire-postcode").fill("2010");
  await company.locator("#hire-startDate").fill("2026-12-01");
  await company.getByRole("button", { name: "Confirm hire" }).click();
  await expect(company.getByText("HIRED", { exact: true })).toBeVisible();

  // 7. Company shares a document on the conversation.
  await company.locator("#doc-category").selectOption("CONTRACT");
  await company.setInputFiles("#doc-file", "prisma/seed-files/sample-licence.pdf");
  await company.getByRole("button", { name: "Upload" }).click();
  await expect(company.getByText("PENDING_REVIEW")).toBeVisible();

  // 8. Invisible to the worker until admin approves it.
  await worker.reload();
  await expect(worker.getByText("No documents shared yet.")).toBeVisible();

  await admin.goto("/admin/documents");
  const contractCard = admin
    .locator('[data-slot="card"]')
    .filter({ hasText: "CONTRACT" })
    .filter({ has: admin.getByRole("button", { name: "Approve" }) });
  await expect(contractCard).toBeVisible();
  await contractCard.getByRole("button", { name: "Approve" }).click();

  // 9. Worker now sees it, approved.
  await worker.reload();
  await expect(worker.locator("p.font-medium", { hasText: "CONTRACT" })).toBeVisible();
  await expect(worker.getByText("APPROVED").first()).toBeVisible();

  // 10. Job appears on both dashboards.
  await company.goto("/company/jobs");
  await expect(company.getByText("E2E: hot water repair")).toBeVisible();
  await worker.goto("/worker/jobs");
  await expect(worker.getByText("E2E: hot water repair")).toBeVisible();
});
