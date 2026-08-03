import { mkdir } from "node:fs/promises";
import path from "node:path";

import { chromium } from "playwright";

const documents = [
  ["privacy.pdf", "Политика конфиденциальности"],
  ["terms.pdf", "Пользовательское соглашение"],
  ["delivery-and-returns.pdf", "Условия доставки и возврата"],
];

const outputDirectory = path.resolve("public/legal");
await mkdir(outputDirectory, { recursive: true });

const browser = await chromium.launch({ headless: true });

try {
  const page = await browser.newPage();

  for (const [filename, title] of documents) {
    await page.setContent(`
      <!doctype html>
      <html lang="ru">
        <head>
          <meta charset="utf-8" />
          <title>${title}</title>
          <style>
            @page { size: A4; margin: 28mm; }
            body {
              margin: 0;
              color: #24251e;
              font-family: Georgia, "Times New Roman", serif;
            }
            p {
              margin: 0 0 18mm;
              font: 12px/1.4 Arial, sans-serif;
              letter-spacing: 0.08em;
              text-transform: uppercase;
            }
            h1 {
              max-width: 15ch;
              margin: 0;
              font-size: 42px;
              font-weight: 400;
              line-height: 1.05;
            }
          </style>
        </head>
        <body>
          <p>Brega Tea · тестовый документ</p>
          <h1>${title}</h1>
        </body>
      </html>
    `);

    await page.pdf({
      format: "A4",
      path: path.join(outputDirectory, filename),
      printBackground: true,
    });
  }
} finally {
  await browser.close();
}
