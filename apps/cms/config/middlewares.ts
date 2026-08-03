export default ({ env }) => {
  const mediaPublicUrl = env("MEDIA_PUBLIC_URL", "http://localhost:1337");
  const mediaOrigin = new URL(mediaPublicUrl).origin;

  return [
    "strapi::logger",
    "strapi::errors",
    {
      name: "strapi::security",
      config: {
        contentSecurityPolicy: {
          useDefaults: true,
          directives: {
            "img-src": [
              "'self'",
              "data:",
              "blob:",
              "market-assets.strapi.io",
              mediaOrigin,
            ],
            "media-src": ["'self'", "data:", "blob:", mediaOrigin],
          },
        },
      },
    },
    "strapi::cors",
    "strapi::poweredBy",
    "strapi::query",
    "strapi::body",
    "strapi::session",
    "strapi::favicon",
    "strapi::public",
  ];
};
