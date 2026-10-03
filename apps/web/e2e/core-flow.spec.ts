import { expect, test } from "@playwright/test";

/** Spec §43 end-to-end flow: register → routine → habit → dashboard reflects both. */
test("core loop: register, plan, complete, and see the dashboard update @mobile", async ({ page }) => {
  const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@example.test`;

  // Register
  await page.goto("/register");
  await page.getByLabel("Name").fill("E2E Tester");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("Password123!");
  await page.getByLabel("Confirm password").fill("Password123!");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("E2E Tester");

  // Create a routine with one time block
  await page.goto("/routine");
  await page.getByRole("button", { name: "New routine" }).first().click();
  await page.getByLabel("Name").fill("Morning");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Routine created")).toBeVisible();
  await page.getByRole("button", { name: "Add time block" }).click();
  await page.getByLabel("Title").fill("Plan the day");
  await page.getByLabel("Start").fill("07:00");
  await page.getByLabel("End").fill("07:15");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Item added")).toBeVisible();

  // Complete it from Today
  await page.goto("/today");
  await page.getByRole("checkbox", { name: "Plan the day" }).click();
  await expect(page.getByRole("checkbox", { name: /Plan the day \(completed\)/ })).toBeChecked();

  // Create and complete a habit
  await page.goto("/habits");
  await page.getByRole("button", { name: "New habit" }).first().click();
  await page.getByRole("textbox", { name: "Habit" }).fill("Read");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Habit created")).toBeVisible();
  await page.getByRole("checkbox", { name: "Mark Read done today" }).click();
  await expect(page.getByRole("checkbox", { name: "Mark Read not done today" })).toBeChecked();

  // Dashboard reflects the activity
  await page.goto("/dashboard");
  await expect(page.getByText("1 of 1 done")).toBeVisible();
  await expect(page.getByRole("progressbar", { name: "Habits completed today" })).toHaveAttribute("aria-valuenow", "100");
  const score = page.getByRole("img", { name: /LifeOS score: \d+%/ });
  await expect(score).toBeVisible();
  await expect(score).not.toHaveAttribute("aria-label", /score: 0%/);

  // Session survives a hard reload (refresh cookie → new access token)
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("E2E Tester");

  // Logout protects private routes
  await page.getByRole("button", { name: /Account menu/ }).click();
  await page.getByRole("menuitem", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/login/);
  await page.goto("/habits");
  await expect(page).toHaveURL(/\/login\?next=%2Fhabits/);
});

test("unauthenticated visitors are redirected to login", async ({ page }) => {
  await page.goto("/finance");
  await expect(page).toHaveURL(/\/login\?next=%2Ffinance/);
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
});

test("login shows a generic error for bad credentials", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("nobody@example.test");
  await page.getByLabel("Password").fill("wrong-password");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByText("Invalid email or password.")).toBeVisible();
});
