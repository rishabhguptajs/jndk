import { chromium } from "playwright-core";
import { serveOut } from "../../tests/render/server";
const srv = await serveOut();
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
for (const [n, vp] of [["chapters-desktop", { width: 1440, height: 900 }], ["chapters-mobile", { width: 390, height: 844 }]] as const) {
  const p = await b.newPage({ viewport: vp });
  await p.goto(srv.url + "/chapters/", { waitUntil: "networkidle" });
  await p.mouse.wheel(0, 2600); await p.waitForTimeout(4000);
  await p.screenshot({ path: `${process.argv[2]}/${n}.png` });
}
await b.close(); await srv.close();
