import { expect, test, type Page } from "@playwright/test";

async function register(page: Page) {
  const email = `shell-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@example.test`;
  await page.goto("/register");
  await page.getByLabel("Name").fill("Shell Tester");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("Password123!");
  await page.getByLabel("Confirm password").fill("Password123!");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  return email;
}

async function logout(page: Page) {
  await page.getByRole("button", { name: /Account menu/ }).click();
  await page.getByRole("menuitem", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/login/);
}

test("manifest makes LifeOS installable as a full-screen app with the brand icons", async ({ page, request, browserName }) => {
  const manifest = await (await request.get("/manifest.webmanifest")).json();
  expect(manifest.display).toBe("fullscreen");
  expect(manifest.display_override).toEqual(["fullscreen", "standalone", "minimal-ui"]);
  for (const icon of manifest.icons) expect((await request.get(icon.src)).status(), icon.src).toBe(200);
  for (const path of ["/favicon.ico", "/icons/favicon-32x32.png", "/icons/apple-touch-icon.png", "/logo.png", "/logo-mark.png", "/sw.js", "/offline.html"]) {
    expect((await request.get(path)).status(), path).toBe(200);
  }

  await page.goto("/");
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", "/manifest.webmanifest");
  await expect(page.getByRole("img", { name: /LifeOS — Plan/ })).toBeVisible();

  // Ask Chrome itself whether the page meets its install criteria.
  test.skip(browserName !== "chromium", "installability check uses the Chrome DevTools protocol");
  const cdp = await page.context().newCDPSession(page);
  const { installabilityErrors } = await cdp.send("Page.getInstallabilityErrors");
  expect(installabilityErrors).toEqual([]);
});

test('"Keep me logged in" decides whether the session survives closing the browser', async ({ page, context }) => {
  const email = await register(page);
  await logout(page);

  // Unchecked → browser-session cookie (no expiry)
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("Password123!");
  await page.getByLabel("Keep me logged in").uncheck();
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  let cookie = (await context.cookies()).find((c) => c.name === "lifeos_rt")!;
  expect(cookie.expires).toBe(-1);
  await logout(page);

  // Checked (the default) → persistent cookie, ~30 days
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("Password123!");
  await expect(page.getByLabel("Keep me logged in")).toBeChecked();
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  cookie = (await context.cookies()).find((c) => c.name === "lifeos_rt")!;
  expect(cookie.expires * 1000 - Date.now()).toBeGreaterThan(29 * 24 * 3600 * 1000);
  expect(cookie.httpOnly).toBe(true);

  // A brand-new tab (like reopening the app) is signed in straight away.
  const reopened = await context.newPage();
  await reopened.goto("/today");
  await expect(reopened.getByRole("heading", { level: 1, name: "Today" })).toBeVisible();
});
