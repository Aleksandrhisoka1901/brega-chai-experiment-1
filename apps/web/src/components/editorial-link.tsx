import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import Link from "next/link";

import { bindShortRussianWords } from "@/lib/typography";

import styles from "./home.module.css";

export function EditorialLink({
  direction = "up",
  href,
  label,
}: {
  direction?: "down" | "up";
  href: string;
  label: string;
}) {
  const Icon = direction === "down" ? ArrowDownRight : ArrowUpRight;

  return (
    <Link className={styles.editorialLink} href={href}>
      <span>{bindShortRussianWords(label)}</span>
      <Icon aria-hidden="true" />
    </Link>
  );
}
