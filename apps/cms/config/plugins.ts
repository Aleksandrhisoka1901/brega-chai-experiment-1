export default ({ env }) => {
  const provider = env("UPLOAD_PROVIDER", "local");

  if (provider !== "aws-s3") {
    return {};
  }

  return {
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
