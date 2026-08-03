import type { ComponentPropsWithoutRef } from "react";

import styles from "./scroll-area.module.css";

export function ScrollArea({
  className,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      className={[styles.root, className].filter(Boolean).join(" ")}
      {...props}
    />
  );
}
