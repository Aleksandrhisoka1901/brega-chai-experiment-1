const NATIONAL_NUMBER_LENGTH = 10;

export function getRussianPhoneDigits(value: string) {
  const digits = value.replace(/\D/g, "");
  const national =
    digits.startsWith("7") || digits.startsWith("8") ? digits.slice(1) : digits;
  return national.slice(0, NATIONAL_NUMBER_LENGTH);
}

export function toRussianPhoneValue(value: string) {
  const digits = getRussianPhoneDigits(value);
  return digits ? `+7${digits}` : "";
}

export function prepareRussianPhoneInput(
  appended: string,
  currentUnmaskedValue: string,
) {
  if (
    (currentUnmaskedValue === "" || currentUnmaskedValue === "7") &&
    /^[78]/.test(appended)
  ) {
    return appended.slice(1);
  }
  return appended;
}
