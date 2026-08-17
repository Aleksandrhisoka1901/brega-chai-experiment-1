import Image from "next/image";
import type { ComponentProps } from "react";

export type ResponsiveImageSource = {
  url: string;
  width: number;
};

type ResponsiveImageProps = Omit<
  ComponentProps<typeof Image>,
  "alt" | "fill" | "height" | "loading" | "quality" | "sizes" | "src" | "width"
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
  sources: _sources = [],
  src,
  style,
  width,
  ...imageProps
}: ResponsiveImageProps) {
  return (
    <Image
      {...imageProps}
      alt={alt}
      className={className}
      {...(fill ? { fill: true } : { height, width })}
      priority={priority}
      quality={75}
      sizes={sizes}
      src={src}
      style={style}
    />
  );
}
