import type { CSSProperties, ImgHTMLAttributes } from "react";

export type ResponsiveImageSource = {
  url: string;
  width: number;
};

type ResponsiveImageProps = Omit<
  ImgHTMLAttributes<HTMLImageElement>,
  "alt" | "height" | "loading" | "sizes" | "src" | "srcSet" | "width"
> & {
  alt: string;
  fill?: boolean;
  height: number;
  priority?: boolean;
  sizes: string;
  sources?: ResponsiveImageSource[];
  src: string;
  width: number;
};

export function ResponsiveImage({
  alt,
  className,
  fill = false,
  height,
  priority = false,
  sizes,
  sources = [],
  src,
  style,
  width,
  ...imageProps
}: ResponsiveImageProps) {
  const candidates = new Map<number, string>();
  for (const source of sources) {
    candidates.set(source.width, source.url);
  }
  if (!sources.some((source) => source.url === src)) {
    candidates.set(width, src);
  }
  const srcSet = [...candidates]
    .sort(([left], [right]) => left - right)
    .map(([candidateWidth, url]) => `${url} ${candidateWidth}w`)
    .join(", ");
  const hasResponsiveCandidates = candidates.size > 1;
  const fillStyle: CSSProperties | undefined = fill
    ? {
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        ...style,
      }
    : style;

  return (
    <img
      {...imageProps}
      alt={alt}
      className={className}
      decoding="async"
      fetchPriority={priority ? "high" : "auto"}
      height={height}
      loading={priority ? "eager" : "lazy"}
      sizes={hasResponsiveCandidates ? sizes : undefined}
      src={src}
      srcSet={hasResponsiveCandidates ? srcSet : undefined}
      style={fillStyle}
      width={width}
    />
  );
}
