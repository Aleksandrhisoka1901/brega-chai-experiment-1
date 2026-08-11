export default ({ env }) => {
  const provider = env("UPLOAD_PROVIDER", "local");
  const emailProvider = env("EMAIL_PROVIDER", "nodemailer");
  const smtpUsername = env("SMTP_USERNAME");
  const smtpPassword = env("SMTP_PASSWORD");
  const smtpFrom = env(
    "SMTP_FROM",
    smtpUsername || "Brega Tea <no-reply@example.test>",
  );
  const emailFrom = env("EMAIL_FROM", smtpFrom);
  const emailReplyTo = env("EMAIL_REPLY_TO", env("SMTP_REPLY_TO", emailFrom));
  const emailConfig =
    emailProvider === "mailgun"
      ? {
          provider: "mailgun",
          providerOptions: {
            key: env("MAILGUN_API_KEY"),
            domain: env("MAILGUN_DOMAIN"),
            url: env("MAILGUN_URL", "https://api.mailgun.net"),
          },
          settings: {
            defaultFrom: emailFrom,
            defaultReplyTo: emailReplyTo,
          },
        }
      : {
          provider: "nodemailer",
          providerOptions: {
            host: env("SMTP_HOST", "localhost"),
            port: Number(env("SMTP_PORT", "1025")),
            secure: env("SMTP_SECURE", "false") === "true",
            connectionTimeout: Number(
              env("SMTP_CONNECTION_TIMEOUT_MS", "5000"),
            ),
            ...(smtpUsername && smtpPassword
              ? { auth: { user: smtpUsername, pass: smtpPassword } }
              : {}),
          },
          settings: {
            defaultFrom: emailFrom,
            defaultReplyTo: emailReplyTo,
          },
        };
  const plugins = {
    "better-blocks": {
      enabled: true,
    },
    "strapi-5-sitemap-plugin": {
      enabled: true,
    },
    "order-admin": {
      enabled: true,
      resolve: "./src/plugins/order-admin",
    },
    email: {
      config: emailConfig,
    },
  };

  if (provider !== "aws-s3") {
    return plugins;
  }

  return {
    ...plugins,
    upload: {
      config: {
        provider: "aws-s3",
        providerOptions: {
          baseUrl: env("MEDIA_PUBLIC_URL"),
          s3Options: {
            credentials: {
              accessKeyId: env("S3_ACCESS_KEY_ID"),
              secretAccessKey: env("S3_ACCESS_SECRET"),
            },
            endpoint: env("S3_ENDPOINT"),
            forcePathStyle: true,
            region: env("S3_REGION", "us-east-1"),
            params: {
              Bucket: env("S3_BUCKET"),
            },
          },
        },
        sizeLimit: 12 * 1024 * 1024,
      },
    },
  };
};
