import type { ReactNode } from "react";

import { ResponsiveImage } from "./responsive-image";

type CardMediaProps = {
  alt?: string;
  className?: string;
  fallback: ReactNode;
  imageUrl?: string;
  sizes: string;
  sources?: Array<{ url: string; width: number }>;
};

export function CardMedia({
  alt,
  className,
  fallback,
  imageUrl,
  sizes,
  sources,
}: CardMediaProps) {
  return (
    <div className={className}>
      {imageUrl ? (
        <ResponsiveImage
          alt={alt ?? ""}
          fill
          height={500}
          sizes={sizes}
          sources={sources}
          src={imageUrl}
          width={400}
        />
      ) : (
        fallback
      )}
    </div>
  );
}
