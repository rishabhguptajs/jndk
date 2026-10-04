/** Usage: tsx scripts/qa/screenshot.ts <path> <out.png> [waitMs] [width] [height] */
import { chromium } from "playwright-core";
import fs from "node:fs";
import { serveOut } from "../../tests/render/server";

const [, , route = "/", out = "screenshot.png", wait = "6000", w = "1440", h = "900"] = process.argv;
const exe = fs.existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined;
const srv = await serveOut();
const browser = await chromium.launch({ executablePath: exe, args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 });
page.on("console", (m) => m.type() === "error" && console.log("console error:", m.text()));
page.on("response", (r) => r.status() >= 400 && console.log("HTTP", r.status(), r.url()));
page.on("pageerror", (e) => console.log("page error:", e.message));
await page.goto(srv.url + route, { waitUntil: "networkidle" });
await page.waitForTimeout(+wait);
await page.screenshot({ path: out });
await browser.close();
await srv.close();
console.log("saved", out);
