"use client";

import { type RefCallback, useState } from "react";
import { IMaskInput } from "react-imask";

import { prepareRussianPhoneInput, toRussianPhoneValue } from "./phone-mask";

const PHONE_MASK = "+{7} (000) 000-00-00";

export function PhoneInput({
  value,
  name,
  invalid,
  inputRef,
  onBlur,
  onChange,
}: {
  value: string;
  name: string;
  invalid: boolean;
  inputRef: RefCallback<HTMLInputElement>;
  onBlur(): void;
  onChange(value: string): void;
}) {
  const [active, setActive] = useState(false);

  return (
    <IMaskInput
      aria-invalid={invalid}
      autoComplete="tel"
      inputRef={inputRef}
      inputMode="tel"
      lazy={false}
      mask={PHONE_MASK}
      name={name}
      overwrite
      placeholder={active ? "+7 (___) ___-__-__" : "+7 (XXX) XXX-XX-XX"}
      placeholderChar={active ? "_" : "X"}
      prepare={(appended, masked) =>
        prepareRussianPhoneInput(appended, masked.unmaskedValue)
      }
      type="tel"
      value={value}
      onAccept={(maskedValue) =>
        onChange(toRussianPhoneValue(String(maskedValue)))
      }
      onBlur={() => {
        setActive(false);
        onBlur();
      }}
      onFocus={() => setActive(true)}
    />
  );
}
