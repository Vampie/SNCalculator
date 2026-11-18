/**
 * "Expr" mode: type a whole expression with parentheses, then '='.
 * Normal precedence rules apply: 3 + 4 × 2 = 11.
 */
import {
  applyBinary,
  applyUnary,
  BINARY_KEYS,
  BinOp,
  Ctx,
  entryKey,
  entryText,
  entryValue,
  isConstKey,
  isEmptyEntry,
  isEntryKey,
  MINUS,
  newEntry,
  NumEntry,
  Outcome,
  POSTFIX_KEYS,
  PREFIX_KEYS,
  resultLine,
  resultText,
  signExponent,
  UnaryFn,
  wrap,
} from './math';

export type Token =
  | {t: 'num'; e: NumEntry}
  | {t: 'const'; c: 'π' | 'e' | 'Ans'}
  | {t: 'op'; op: BinOp}
  | {t: 'neg'}
  | {t: 'post'; f: UnaryFn}
  | {t: 'func'; f: UnaryFn}
  | {t: '('}
  | {t: ')'};

export type ExprState = {
  tokens: Token[];
  /** Result of the last '=' (shown under the expression). */
  result: number | null;
  error: string | null;
  /** True right after '=': the next key starts a new expression. */
  done: boolean;
};

export const newExpr = (): ExprState => ({
  tokens: [],
  result: null,
  error: null,
  done: false,
});

const ANS: Token = {t: 'const', c: 'Ans'};

const isOperandEnd = (tk?: Token) =>
  !!tk &&
  (tk.t === 'num' || tk.t === 'const' || tk.t === ')' || tk.t === 'post');

/** '(' and functions like "sin(" open a parenthesis. */
const openParens = (tokens: Token[]) =>
  tokens.reduce(
    (n, tk) =>
      tk.t === '(' || tk.t === 'func' ? n + 1 : tk.t === ')' ? n - 1 : n,
    0,
  );

export function pressExpr(
  state: ExprState,
  key: string,
  ctx: Ctx,
): Outcome<ExprState> {
  if (key === '=') {
    return evaluateState(state, ctx);
  }
  if (key === 'C') {
    return {state: newExpr()};
  }
  let tokens = state.tokens;
  if (state.done && key !== '⌫') {
    // After '=': an operator continues from the result, anything else starts over.
    const continues = key in BINARY_KEYS || key in POSTFIX_KEYS || key === '±';
    tokens = continues ? [ANS] : [];
  }
  return {state: {...newExpr(), tokens: edit(tokens, key)}};
}

function edit(tokens: Token[], key: string): Token[] {
  const last = tokens[tokens.length - 1];
  const rest = tokens.slice(0, -1);
  if (isEntryKey(key)) {
    return last?.t === 'num'
      ? [...rest, {t: 'num', e: entryKey(last.e, key)}]
      : [...tokens, {t: 'num', e: entryKey(newEntry(), key)}];
  }
  if (key === '⌫') {
    if (last?.t !== 'num') {
      return rest;
    }
    const e = entryKey(last.e, '⌫');
    return isEmptyEntry(e) ? rest : [...rest, {t: 'num', e}];
  }
  if (key === '±') {
    return toggleSign(tokens);
  }
  const signed = last?.t === 'num' ? signExponent(last.e, key) : null;
  if (signed) {
    return [...rest, {t: 'num', e: signed}];
  }
  if (key in BINARY_KEYS) {
    const op = BINARY_KEYS[key];
    if (isOperandEnd(last)) {
      return [...tokens, {t: 'op', op}];
    }
    if (op === '−') {
      // A minus where no operand is yet: negative number, e.g. "2 × −3".
      return last?.t === 'neg' ? tokens : [...tokens, {t: 'neg'}];
    }
    if (last?.t === 'op') {
      return [...rest, {t: 'op', op}];
    }
    return last ? tokens : [ANS, {t: 'op', op}];
  }
  if (key in POSTFIX_KEYS) {
    const post: Token = {t: 'post', f: POSTFIX_KEYS[key]};
    if (isOperandEnd(last)) {
      return [...tokens, post];
    }
    return last ? tokens : [ANS, post];
  }
  if (key in PREFIX_KEYS) {
    return [...tokens, {t: 'func', f: PREFIX_KEYS[key]}];
  }
  if (isConstKey(key)) {
    return [...tokens, {t: 'const', c: key}];
  }
  if (key === '(') {
    return [...tokens, {t: '('}];
  }
  if (key === ')') {
    return isOperandEnd(last) && openParens(tokens) > 0
      ? [...tokens, {t: ')'}]
      : tokens;
  }
  return tokens;
}

/** '±': flips the sign of the number or constant just typed, or starts a negative one. */
function toggleSign(tokens: Token[]): Token[] {
  const last = tokens[tokens.length - 1];
  const rest = tokens.slice(0, -1);
  if (last?.t === 'num') {
    return [...rest, {t: 'num', e: entryKey(last.e, '±')}];
  }
  if (last?.t === 'const') {
    const before = rest[rest.length - 1];
    if (before?.t === 'neg') {
      return [...rest.slice(0, -1), last];
    }
    // "2π" → "2−π" would read as a subtraction: leave it.
    return isOperandEnd(before) ? tokens : [...rest, {t: 'neg'}, last];
  }
  if (last?.t === 'neg') {
    return rest;
  }
  // Nothing to negate after ')' or ², !, …
  return isOperandEnd(last) ? tokens : [...tokens, {t: 'neg'}];
}

/** How the expression reads; `ansText` replaces "Ans" (the tape shows its value). */
export function tokensText(tokens: Token[], ansText = 'Ans'): string {
  return tokens
    .map(tk => {
      switch (tk.t) {
        case 'num':
          return entryText(tk.e);
        case 'const':
          return tk.c === 'Ans' ? ansText : tk.c;
        case 'op':
          return ` ${tk.op} `;
        case 'neg':
          return MINUS;
        case 'post':
          return tk.f;
        case 'func':
          return `${tk.f}(`;
        default:
          return tk.t;
      }
    })
    .join('')
    .trim();
}

function evaluateState(state: ExprState, ctx: Ctx): Outcome<ExprState> {
  if (state.tokens.length === 0) {
    return {state};
  }
  // Missing ')' at the end are closed automatically, also in the tape line.
  const closing: Token[] = Array.from(
    {length: Math.max(0, openParens(state.tokens))},
    () => ({t: ')'}),
  );
  const tokens = [...state.tokens, ...closing];
  try {
    const value = evaluate(tokens, ctx);
    const ans = wrap(resultText(ctx.ans, ctx.sci));
    const text = `${tokensText(tokens, ans)} = ${resultLine(value, ctx.sci)}`;
    return {
      state: {tokens, result: value, error: null, done: true},
      line: {text, value},
      endGroup: true,
    };
  } catch (e) {
    return {
      state: {...state, result: null, error: `Error: ${(e as Error).message}`},
    };
  }
}

/**
 * Recursive-descent evaluation, from loose to tight binding:
 * + −, then × ÷ (and implicit ×: 2π), then unary minus, then ^ ⁿ√ (right to left),
 * then postfix ² ⁻¹ ! %.
 */
export function evaluate(tokens: Token[], ctx: Ctx): number {
  let i = 0;
  const peek = (): Token | undefined => tokens[i];
  const incomplete = () => new Error('incomplete expression');

  function sum(): number {
    let v = product();
    for (let tk = peek(); tk?.t === 'op'; tk = peek()) {
      if (tk.op !== '+' && tk.op !== '−') {
        break;
      }
      i++;
      v = applyBinary(tk.op, v, product());
    }
    return v;
  }

  function product(): number {
    let v = signed();
    for (;;) {
      const tk = peek();
      if (tk?.t === 'op' && (tk.op === '×' || tk.op === '÷')) {
        i++;
        v = applyBinary(tk.op, v, signed());
      } else if (
        tk &&
        (tk.t === 'num' || tk.t === 'const' || tk.t === 'func' || tk.t === '(')
      ) {
        v = applyBinary('×', v, signed());
      } else {
        return v;
      }
    }
  }

  function signed(): number {
    if (peek()?.t === 'neg') {
      i++;
      return -signed();
    }
    return power();
  }

  function power(): number {
    const base = postfix();
    const tk = peek();
    if (tk?.t === 'op' && (tk.op === '^' || tk.op === 'ⁿ√')) {
      i++;
      return applyBinary(tk.op, base, signed());
    }
    return base;
  }

  function postfix(): number {
    let v = primary();
    for (let tk = peek(); tk?.t === 'post'; tk = peek()) {
      i++;
      v = applyUnary(tk.f, v, ctx.deg);
    }
    return v;
  }

  function primary(): number {
    const tk = tokens[i++];
    if (!tk) {
      throw incomplete();
    }
    switch (tk.t) {
      case 'num':
        return entryValue(tk.e);
      case 'const':
        return tk.c === 'π' ? Math.PI : tk.c === 'e' ? Math.E : ctx.ans;
      case '(': {
        const v = sum();
        closeParen();
        return v;
      }
      case 'func': {
        const v = sum();
        closeParen();
        return applyUnary(tk.f, v, ctx.deg);
      }
      default:
        throw incomplete();
    }
  }

  function closeParen() {
    if (peek()?.t !== ')') {
      throw incomplete();
    }
    i++;
  }

  const value = sum();
  if (i < tokens.length) {
    throw incomplete();
  }
  return value;
}
