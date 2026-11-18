/**
 * Number helpers shared by both calculation modes: keys, operators and functions,
 * typing a number, and formatting results (1 234,5 or 1 234.5, × 10ⁿ).
 */

export const MINUS = '−';

/** Thousands separator: a no-break space, so a number never wraps inside a text box. */
export const THOUSANDS = '\u00A0';
// shortcut: decimal point only for these language codes, comma for all others;
// extend the list when a device language shows the wrong sign.
const POINT_LANGUAGES = ['en', 'zh', 'ja', 'ko'];
let decimalSign: ',' | '.' = ',';

/** Picks the decimal sign for a device language code such as "nl_BE", "en" or "zh_CN". */
export function setLanguage(code: string): void {
  decimalSign = POINT_LANGUAGES.includes(code.slice(0, 2).toLowerCase())
    ? '.'
    : ',';
}
export const getDecimalSign = () => decimalSign;

/** "-1234567.5" → "-1 234 567,5": groups the integer part, uses the local decimal sign. */
function localize(plain: string): string {
  const [int, frac] = plain.split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, THOUSANDS);
  return frac === undefined ? grouped : grouped + decimalSign + frac;
}

/** Binary operators. `ⁿ√` takes the n-th root: `3 ⁿ√ 8` = 2. */
export type BinOp = '+' | '−' | '×' | '÷' | '^' | 'ⁿ√';

/** Functions of one number. Postfix ones (², ⁻¹, !, %) are written after their operand. */
export type UnaryFn =
  | '√'
  | 'sin'
  | 'cos'
  | 'tan'
  | 'sin⁻¹'
  | 'cos⁻¹'
  | 'tan⁻¹'
  | 'log'
  | 'ln'
  | '10^'
  | 'e^'
  | '²'
  | '⁻¹'
  | '!'
  | '%';

/** Key label → meaning. Labels are what the keypad shows. */
export const BINARY_KEYS: Record<string, BinOp> = {
  '+': '+',
  '−': '−',
  '×': '×',
  '÷': '÷',
  xʸ: '^',
  'ⁿ√': 'ⁿ√',
};
export const PREFIX_KEYS: Record<string, UnaryFn> = {
  '√': '√',
  sin: 'sin',
  cos: 'cos',
  tan: 'tan',
  'sin⁻¹': 'sin⁻¹',
  'cos⁻¹': 'cos⁻¹',
  'tan⁻¹': 'tan⁻¹',
  log: 'log',
  ln: 'ln',
  '10ˣ': '10^',
  eˣ: 'e^',
};
export const POSTFIX_KEYS: Record<string, UnaryFn> = {
  'x²': '²',
  '1/x': '⁻¹',
  'n!': '!',
  '%': '%',
};
export type ConstKey = 'π' | 'e' | 'Ans';
export const isConstKey = (key: string): key is ConstKey =>
  key === 'π' || key === 'e' || key === 'Ans';
/** Keys that type into a number: digits, decimal comma and the ×10ⁿ exponent. */
export const isEntryKey = (key: string) =>
  /^[0-9,]$/.test(key) || key === '×10ⁿ';

/** Settings a key press needs. */
export type Ctx = {ans: number; deg: boolean; sci: boolean};

/** What a key press did: the new mode state, and maybe a tape line. */
export type Outcome<S> = {
  state: S;
  line?: {text: string; value: number};
  /** The calculation is finished: "Last calc" starts over after this. */
  endGroup?: boolean;
};

function fail(message: string): never {
  throw new Error(message);
}

function check(r: number): number {
  if (Number.isNaN(r)) {
    fail('invalid input');
  }
  if (!Number.isFinite(r)) {
    fail('number too large');
  }
  return r;
}

export function applyBinary(op: BinOp, a: number, b: number): number {
  switch (op) {
    case '+':
      return check(a + b);
    case '−':
      return check(a - b);
    case '×':
      return check(a * b);
    case '÷':
      return b === 0 ? fail('division by 0') : check(a / b);
    case '^':
      return check(Math.pow(a, b));
    case 'ⁿ√':
      return nthRoot(b, a);
  }
}

function nthRoot(x: number, n: number): number {
  if (n === 0) {
    fail('invalid input');
  }
  // Odd roots of negative numbers are real: 3 ⁿ√ −8 = −2.
  if (x < 0 && Number.isInteger(n) && n % 2 !== 0) {
    return -Math.pow(-x, 1 / n);
  }
  return check(Math.pow(x, 1 / n));
}

function trig(f: 'sin' | 'cos' | 'tan', x: number, deg: boolean): number {
  const rad = deg ? (x * Math.PI) / 180 : x;
  // sin(180°) is 1.2e-16 in floating point; a tiny result for a non-tiny angle is an exact 0.
  const snap = (r: number) =>
    Math.abs(r) < 1e-12 && Math.abs(rad) > 1e-6 ? 0 : r;
  const s = snap(Math.sin(rad));
  const c = snap(Math.cos(rad));
  if (f === 'sin') {
    return s;
  }
  if (f === 'cos') {
    return c;
  }
  return c === 0 ? fail('invalid input') : s / c;
}

function factorial(n: number): number {
  if (!Number.isInteger(n) || n < 0) {
    fail('n! needs a whole number ≥ 0');
  }
  if (n > 170) {
    fail('number too large');
  }
  let r = 1;
  for (let i = 2; i <= n; i++) {
    r *= i;
  }
  return r;
}

export function applyUnary(f: UnaryFn, x: number, deg: boolean): number {
  const toAngle = deg ? 180 / Math.PI : 1;
  switch (f) {
    case '√':
      return x < 0 ? fail('invalid input') : Math.sqrt(x);
    case 'sin':
    case 'cos':
    case 'tan':
      return check(trig(f, x, deg));
    case 'sin⁻¹':
    case 'cos⁻¹':
      if (Math.abs(x) > 1) {
        fail('invalid input');
      }
      return (f === 'sin⁻¹' ? Math.asin(x) : Math.acos(x)) * toAngle;
    case 'tan⁻¹':
      return Math.atan(x) * toAngle;
    case 'log':
    case 'ln':
      if (x <= 0) {
        fail('invalid input');
      }
      return f === 'log' ? Math.log10(x) : Math.log(x);
    case '10^':
      return check(Math.pow(10, x));
    case 'e^':
      return check(Math.exp(x));
    case '²':
      return check(x * x);
    case '⁻¹':
      return x === 0 ? fail('division by 0') : 1 / x;
    case '!':
      return factorial(x);
    case '%':
      return x / 100;
  }
}

const SUPERSCRIPT: Record<string, string> = {
  '0': '⁰',
  '1': '¹',
  '2': '²',
  '3': '³',
  '4': '⁴',
  '5': '⁵',
  '6': '⁶',
  '7': '⁷',
  '8': '⁸',
  '9': '⁹',
  '-': '⁻',
};

/** "-12" → "⁻¹²". */
export const superscript = (s: string) =>
  s.replace(/[0-9-]/g, ch => SUPERSCRIPT[ch]);

/**
 * Formats a result: thousands grouped, local decimal sign, at most 12 significant digits,
 * and scientific notation (`4,5261 × 10²`) outside 10⁻⁶ … 10¹² or when `sci` is on.
 */
export function formatNumber(x: number, sci = false): string {
  if (x === 0) {
    return '0';
  }
  const abs = Math.abs(x);
  let text: string;
  if (!sci && abs >= 1e-6 && abs < 1e12) {
    text = localize(String(Number(x.toPrecision(12))));
  } else {
    const [mantissa, exponent] = x.toExponential(11).split('e');
    const power = superscript(String(Number(exponent)));
    text = `${localize(String(Number(mantissa)))} × 10${power}`;
  }
  return text.replace('-', MINUS);
}

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));

/** p/q ≈ x with q ≤ maxDen (continued fractions), or null when no such fraction is that close. */
function toFraction(x: number, maxDen: number): [number, number] | null {
  let [h0, h1, k0, k1] = [0, 1, 1, 0];
  let r = x;
  for (let i = 0; i < 40 && Number.isFinite(r); i++) {
    const a = Math.floor(r);
    [h0, h1] = [h1, a * h1 + h0];
    [k0, k1] = [k1, a * k1 + k0];
    if (k1 > maxDen) {
      return null;
    }
    // A few hundred ULP: enough for rounding in a short chain of operations.
    if (Math.abs(h1 / k1 - x) <= 1e-13 * Math.max(1, x)) {
      return [h1, k1];
    }
    r = 1 / (r - a);
  }
  return null;
}

// shortcut: only a√n/b with x² ≤ 10⁶, b ≤ 1000 and n ≤ 10000 is recognized; sums such as
// 1 + √2 stay decimal. Upgrade to exact a + b√n arithmetic if that is needed.
const MAX_SQUARE = 1e6;
const MAX_DENOMINATOR = 1000;
/** Larger radicands are almost always a big decimal that happens to fit a fraction (905,22). */
const MAX_RADICAND = 10000;

/**
 * Writes x as a square root when x² is a simple fraction: √50 → "5√2",
 * sin 45° → "√2/2". Null for rational numbers and everything else.
 */
export function exactRoot(x: number): string | null {
  const sq = x * x;
  if (!Number.isFinite(sq) || sq === 0 || sq > MAX_SQUARE) {
    return null;
  }
  const frac = toFraction(sq, MAX_DENOMINATOR);
  if (!frac) {
    return null;
  }
  // √(p/q) = √(p·q) / q = s·√n / q with n square-free.
  const [p, q] = frac;
  let n = p * q;
  if (n > MAX_RADICAND * MAX_DENOMINATOR ** 2) {
    return null;
  }
  let s = 1;
  for (let f = 2; f * f <= n; f++) {
    while (n % (f * f) === 0) {
      n /= f * f;
      s *= f;
    }
  }
  if (n === 1 || n > MAX_RADICAND) {
    return null; // n = 1: x is rational, no root needed
  }
  const g = gcd(s, q);
  const [a, b] = [s / g, q / g];
  return `${x < 0 ? MINUS : ''}${a === 1 ? '' : a}√${n}${
    b === 1 ? '' : `/${b}`
  }`;
}

/** A result as operand or display text: root form when there is one (5√2), else the number. */
export const resultText = (x: number, sci: boolean) =>
  exactRoot(x) ?? formatNumber(x, sci);

/** A result on the tape: "5√2 ≈ 7,07106781187" or just the number. */
export function resultLine(x: number, sci: boolean): string {
  const exact = exactRoot(x);
  const decimal = formatNumber(x, sci);
  return exact ? `${exact} ≈ ${decimal}` : decimal;
}

/** Main display line plus the decimal value under a root form. */
export function shownResult(
  x: number,
  sci: boolean,
): {main: string; approx: string} {
  const exact = exactRoot(x);
  const decimal = formatNumber(x, sci);
  return exact
    ? {main: exact, approx: `≈ ${decimal}`}
    : {main: decimal, approx: ''};
}

/** A number as it is typed: `mant` uses '.', `exp` is the ×10ⁿ part (null: not started). */
export type NumEntry = {neg: boolean; mant: string; exp: string | null};

export const newEntry = (): NumEntry => ({neg: false, mant: '', exp: null});

export const isEmptyEntry = (e: NumEntry) => e.mant === '' && e.exp === null;

const MAX_DIGITS = 15;
const MAX_EXP_DIGITS = 3;

/** Applies a digit, ',', '×10ⁿ', '±' or '⌫' to a number being typed. */
export function entryKey(e: NumEntry, key: string): NumEntry {
  if (/^[0-9]$/.test(key)) {
    if (e.exp !== null) {
      return e.exp.replace('-', '').length < MAX_EXP_DIGITS
        ? {...e, exp: e.exp + key}
        : e;
    }
    if (e.mant.replace('.', '').length >= MAX_DIGITS) {
      return e;
    }
    return {...e, mant: e.mant === '0' ? key : e.mant + key};
  }
  if (key === ',') {
    return e.exp !== null || e.mant.includes('.')
      ? e
      : {...e, mant: (e.mant || '0') + '.'};
  }
  if (key === '×10ⁿ') {
    return e.exp !== null ? e : {...e, mant: e.mant || '1', exp: ''};
  }
  if (key === '±') {
    if (e.exp === null) {
      return {...e, neg: !e.neg};
    }
    return {
      ...e,
      exp: e.exp.startsWith('-') ? e.exp.slice(1) : '-' + e.exp,
    };
  }
  if (key === '⌫') {
    if (e.exp !== null) {
      return {...e, exp: e.exp === '' ? null : e.exp.slice(0, -1)};
    }
    return {...e, mant: e.mant.slice(0, -1)};
  }
  return e;
}

/**
 * '−' or '+' right after ×10ⁿ (no exponent digits yet) sets the exponent's sign,
 * so 45261 ×10ⁿ − 2 gives 45261×10⁻². Null when the key is a normal operator.
 */
export function signExponent(e: NumEntry | null, key: string): NumEntry | null {
  if (!e || (e.exp !== '' && e.exp !== '-') || (key !== '−' && key !== '+')) {
    return null;
  }
  return {...e, exp: key === '−' ? '-' : ''};
}

export function entryValue(e: NumEntry): number {
  if (e.exp === '' || e.exp === '-') {
    fail('missing exponent');
  }
  const mant = e.mant === '' || e.mant === '.' ? '0' : e.mant;
  const v = check(Number(e.exp === null ? mant : `${mant}e${e.exp}`));
  return e.neg ? -v : v;
}

/** How the typed number looks, e.g. `45261×10⁻²`. */
export function entryText(e: NumEntry): string {
  const mant = localize(e.mant || '0');
  const exp =
    e.exp === null ? '' : `×10${e.exp === '' ? 'ⁿ' : superscript(e.exp)}`;
  return (e.neg ? MINUS : '') + mant + exp;
}

/** Parenthesizes an operand that would otherwise read wrong next to ², !, … */
export const wrap = (text: string) =>
  /[ −×√/]/.test(text) ? `(${text})` : text;
