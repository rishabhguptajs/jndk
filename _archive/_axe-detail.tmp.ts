import { chromium } from "playwright-core";
import AxeBuilder from "@axe-core/playwright";
import { serveOut } from "/home/user/jndk/tests/render/server";
const srv = await serveOut();
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
for (const p of ["/", "/chapters/", "/sources/", "/groups/", "/stats/"]) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  await page.goto(srv.url + p, { waitUntil: "load" });
  await page.waitForTimeout(1500);
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  const seen = new Map<string, number>();
  for (const v of r.violations) for (const n of v.nodes) {
    const k = `${v.id} | ${n.target.join(" ")} | ${(n.any[0]?.message ?? n.failureSummary ?? "").slice(0, 160)}`.replace(/\d+(\.\d+)?:1/g, "R");
    const kk = k.replace(/nth-child\(\d+\)/g, "n").replace(/#[\w-]+/g, "#id");
    seen.set(kk, (seen.get(kk) ?? 0) + 1);
  }
  console.log("==", p);
  for (const [k, n] of seen) console.log(n, k);
  await ctx.close();
}
await browser.close(); await srv.close();
