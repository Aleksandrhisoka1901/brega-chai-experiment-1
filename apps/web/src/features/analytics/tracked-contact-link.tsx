"use client";

import type { ComponentProps } from "react";

import { METRIKA_GOALS, reachMetrikaGoal } from "./goals";

export function TrackedContactLink({
  goal,
  onClick,
  ...props
}: ComponentProps<"a"> & { goal: keyof typeof METRIKA_GOALS }) {
  return (
    <a
      {...props}
      onClick={(event) => {
        reachMetrikaGoal(METRIKA_GOALS[goal]);
        onClick?.(event);
      }}
    />
  );
}
