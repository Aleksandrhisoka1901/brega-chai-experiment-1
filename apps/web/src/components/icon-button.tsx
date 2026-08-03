import type { ButtonHTMLAttributes } from "react";

import styles from "./icon-button.module.css";

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  "aria-label": string;
  size?: "s" | "m" | "l";
};

export function IconButton({
  className,
  size = "m",
  type = "button",
  ...props
}: IconButtonProps) {
  const sizeClass = {
    s: styles.sizeS,
    m: styles.sizeM,
    l: styles.sizeL,
  }[size];

  return (
    <button
      className={[styles.button, sizeClass, className]
        .filter(Boolean)
        .join(" ")}
      type={type}
      {...props}
    />
  );
}
