"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
  type TextareaHTMLAttributes,
} from "react";

import styles from "./auto-resize-textarea.module.css";

export const AutoResizeTextarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function AutoResizeTextarea(
  { className, maxLength, onInput, ...props },
  forwardedRef,
) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [count, setCount] = useState(0);

  const resize = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "auto";
    const styles = getComputedStyle(textarea);
    const borders =
      Number.parseFloat(styles.borderTopWidth) +
      Number.parseFloat(styles.borderBottomWidth);
    textarea.style.height = `${textarea.scrollHeight + borders}px`;
    setCount(textarea.value.length);
  }, []);

  const setRef = useCallback(
    (textarea: HTMLTextAreaElement | null) => {
      textareaRef.current = textarea;
      if (typeof forwardedRef === "function") forwardedRef(textarea);
      else if (forwardedRef) forwardedRef.current = textarea;
    },
    [forwardedRef],
  );

  useEffect(() => {
    const frame = requestAnimationFrame(resize);
    return () => cancelAnimationFrame(frame);
  }, [resize]);

  return (
    <span className={styles.root}>
      <textarea
        {...props}
        className={[styles.textarea, className].filter(Boolean).join(" ")}
        maxLength={maxLength}
        ref={setRef}
        onInput={(event) => {
          resize();
          onInput?.(event);
        }}
      />
      {typeof maxLength === "number" ? (
        <span aria-hidden="true" className={styles.counter}>
          {count}/{maxLength}
        </span>
      ) : null}
    </span>
  );
});
