import { existsSync } from "node:fs";
import path from "node:path";

import type { GlobalSettings } from "@/server/cms/global-mapper";

const legalDocuments = [
  { href: "/legal/privacy.pdf", label: "Политика конфиденциальности" },
  { href: "/legal/terms.pdf", label: "Пользовательское соглашение" },
  {
    href: "/legal/delivery-and-returns.pdf",
    label: "Условия доставки и возврата",
  },
] as const;

function availableLegalDocuments() {
  const publicDirectory = path.join(process.cwd(), "public");
  return legalDocuments.filter(({ href }) =>
    existsSync(path.join(publicDirectory, href)),
  );
}

export function SiteFooter({ settings }: { settings: GlobalSettings }) {
  const documents = availableLegalDocuments();

  return (
    <footer className="site-footer">
      <div className="site-footer__brand">
        <strong>{settings.brandName}</strong>
        <small>© {new Date().getFullYear()}</small>
      </div>
      <div className="site-footer__contacts">
        <a href={`mailto:${settings.email}`}>{settings.email}</a>
        <a
          href={settings.telegramUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          Telegram
        </a>
      </div>
      <div className="site-footer__legal">
        <p>{settings.legalDetails}</p>
        {documents.length > 0 ? (
          <nav aria-label="Юридические документы">
            {documents.map(({ href, label }) => (
              <a
                key={href}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
              >
                {label}
              </a>
            ))}
          </nav>
        ) : null}
      </div>
    </footer>
  );
}
