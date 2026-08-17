import { Mail } from "lucide-react";

import type { GlobalSettings } from "@/server/cms/global-mapper";
import { bindShortRussianWords } from "@/lib/typography";

import { TelegramMark } from "./telegram-mark";
import { SiteWordmark } from "./site-wordmark";

const legalDocuments = [
  {
    field: "privacyPolicy",
    href: "/legal/privacy.pdf",
    label: "Политика конфиденциальности",
  },
  {
    field: "terms",
    href: "/legal/terms.pdf",
    label: "Пользовательское соглашение",
  },
  {
    field: "deliveryAndReturns",
    href: "/legal/delivery-and-returns.pdf",
    label: "Условия доставки и возврата",
  },
] as const;

export function SiteFooter({ settings }: { settings: GlobalSettings }) {
  const configuredLegalDocuments = legalDocuments.filter(
    ({ field }) => settings.legalDocuments?.[field],
  );

  return (
    <footer className="site-footer">
      <div className="site-footer__content content-frame" data-content-frame>
        <div className="site-footer__brand">
          <strong>
            <SiteWordmark brandName={settings.brandName} logo={settings.logo} />
          </strong>
        </div>
        <div className="site-footer__contacts">
          <h2>Контакты</h2>
          <a href={`mailto:${settings.email}`}>
            <Mail aria-hidden="true" />
            <span>{settings.email}</span>
          </a>
          <a
            href={settings.telegramUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            <TelegramMark />
            <span>Telegram</span>
          </a>
        </div>
        <div className="site-footer__legal">
          <h2>Правовая информация</h2>
          {configuredLegalDocuments.length > 0 ? (
            <nav aria-label="Юридические документы">
              {configuredLegalDocuments.map(({ href, label }) => (
                <a
                  key={href}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {bindShortRussianWords(label)}
                </a>
              ))}
            </nav>
          ) : null}
          <small>
            © {new Date().getFullYear()}.{" "}
            {bindShortRussianWords(settings.legalDetails)}
          </small>
        </div>
      </div>
    </footer>
  );
}
