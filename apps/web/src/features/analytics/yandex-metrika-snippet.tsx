import Script from "next/script";

import {
  YANDEX_METRIKA_COUNTER_ID,
  YANDEX_METRIKA_SCRIPT_URL,
  YANDEX_METRIKA_WATCH_URL,
} from "./goals";

const METRIKA_BOOTSTRAP = `(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};m[i].l=1*new Date();
for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)
})(window, document, "script", "${YANDEX_METRIKA_SCRIPT_URL}", "ym");
window.dataLayer = window.dataLayer || [];
ym(${YANDEX_METRIKA_COUNTER_ID}, "init", {ssr:true, webvisor:true, clickmap:true, ecommerce:"dataLayer", referrer: document.referrer, url: location.href, accurateTrackBounce:true, trackLinks:true});`;

export function YandexMetrikaSnippet() {
  return (
    <>
      <Script id="yandex-metrika" strategy="beforeInteractive">
        {METRIKA_BOOTSTRAP}
      </Script>
      <noscript>
        <div>
          <img
            src={YANDEX_METRIKA_WATCH_URL}
            style={{ position: "absolute", left: "-9999px" }}
            alt=""
          />
        </div>
      </noscript>
    </>
  );
}
