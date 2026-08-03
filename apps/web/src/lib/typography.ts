const shortRussianWords = [
  "а",
  "б",
  "без",
  "бы",
  "в",
  "во",
  "вот",
  "да",
  "для",
  "до",
  "ж",
  "же",
  "за",
  "и",
  "из",
  "или",
  "к",
  "как",
  "ко",
  "ли",
  "ль",
  "на",
  "над",
  "не",
  "ни",
  "но",
  "о",
  "об",
  "обо",
  "от",
  "по",
  "под",
  "при",
  "про",
  "с",
  "со",
  "у",
  "что",
] as const;

const shortWordPattern = new RegExp(
  `(^|[\\s([{«„"'])(${shortRussianWords.join("|")})[ \\t\\r\\n]+(?=[\\p{L}\\p{N}])`,
  "giu",
);

const trailingShortWordPattern = new RegExp(
  `(^|[\\s([{«„"'])(${shortRussianWords.join("|")})[ \\t\\r\\n]+$`,
  "iu",
);

export function bindShortRussianWords(value: string): string {
  let result = value;
  let previous: string;

  do {
    previous = result;
    result = result.replace(shortWordPattern, "$1$2\u00a0");
  } while (result !== previous);

  return result;
}

export function bindTrailingShortRussianWord(value: string): string {
  return value.replace(trailingShortWordPattern, "$1$2\u00a0");
}
