/**
 * "Step" mode: a classic pocket calculator. Every operation is computed
 * as soon as the next one is pressed, strictly left to right: 2 + 3 × 4 = 20.
 * There are no parentheses; ², √, sin, … act at once on the number shown.
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
  isEntryKey,
  newEntry,
  NumEntry,
  Outcome,
  POSTFIX_KEYS,
  PREFIX_KEYS,
  resultLine,
  resultText,
  shownResult,
  signExponent,
  wrap,
} from './math';

type Operand = {value: number; text: string};

export type DirectState = {
  /** Left operand, waiting for `op` and a second operand. */
  acc: Operand | null;
  op: BinOp | null;
  /** Number being typed. */
  entry: NumEntry | null;
  /** Computed operand (result, constant, function value) when nothing is typed. */
  cur: Operand | null;
  error: string | null;
};

export const newDirect = (): DirectState => ({
  acc: null,
  op: null,
  entry: null,
  cur: null,
  error: null,
});

const ZERO: Operand = {value: 0, text: '0'};

/** The number on screen as an operand. */
function current(s: DirectState): Operand {
  if (s.entry) {
    return {value: entryValue(s.entry), text: entryText(s.entry)};
  }
  return s.cur ?? s.acc ?? ZERO;
}

export function pressDirect(
  state: DirectState,
  key: string,
  ctx: Ctx,
): Outcome<DirectState> {
  if (key === 'C') {
    return {state: newDirect(), endGroup: true};
  }
  try {
    // Any key after an error starts fresh.
    return press(state.error ? newDirect() : state, key, ctx);
  } catch (e) {
    return {
      state: {...newDirect(), error: `Error: ${(e as Error).message}`},
      endGroup: true,
    };
  }
}

function press(s: DirectState, key: string, ctx: Ctx): Outcome<DirectState> {
  const typing = s.entry !== null;
  if (isEntryKey(key) || (typing && (key === '⌫' || key === '±'))) {
    return {state: {...s, entry: entryKey(s.entry ?? newEntry(), key)}};
  }
  const signed = signExponent(s.entry, key);
  if (signed) {
    return {state: {...s, entry: signed}};
  }
  if (key === '±') {
    const value = -current(s).value;
    return {state: {...s, cur: {value, text: resultText(value, ctx.sci)}}};
  }
  if (isConstKey(key)) {
    const value = key === 'π' ? Math.PI : key === 'e' ? Math.E : ctx.ans;
    const text = key === 'Ans' ? wrap(resultText(value, ctx.sci)) : key;
    return {state: {...s, entry: null, cur: {value, text}}};
  }
  const fn = POSTFIX_KEYS[key] ?? PREFIX_KEYS[key];
  if (fn) {
    const x = current(s);
    const value = applyUnary(fn, x.value, ctx.deg);
    const shown =
      key in POSTFIX_KEYS ? `${wrap(x.text)}${fn}` : `${fn}(${x.text})`;
    return {
      state: {
        ...s,
        entry: null,
        cur: {value, text: resultText(value, ctx.sci)},
      },
      line: {text: `${shown} = ${resultLine(value, ctx.sci)}`, value},
    };
  }
  const hasOperand = typing || s.cur !== null;
  const pending = s.acc !== null && s.op !== null && hasOperand;
  if (key in BINARY_KEYS) {
    const op = BINARY_KEYS[key];
    if (pending) {
      const {result, line} = compute(s, ctx);
      return {state: {...newDirect(), acc: result, op}, line};
    }
    // Pressing another operator right after one replaces it.
    const acc = hasOperand ? current(s) : s.acc ?? ZERO;
    return {state: {...newDirect(), acc, op}};
  }
  if (key === '=' && pending) {
    const {result, line} = compute(s, ctx);
    return {state: {...newDirect(), cur: result}, line, endGroup: true};
  }
  // '⌫' with nothing typed, '=' without an operation, '(' and ')': nothing to do.
  return {state: s};
}

function compute(s: DirectState, ctx: Ctx) {
  const a = s.acc ?? ZERO;
  const op = s.op ?? '+';
  const x = current(s);
  const value = applyBinary(op, a.value, x.value);
  return {
    result: {value, text: resultText(value, ctx.sci)},
    line: {
      text: `${a.text} ${op} ${x.text} = ${resultLine(value, ctx.sci)}`,
      value,
    },
  };
}

/** Top line (pending "5 ×"), main line (number shown) and its decimal value under a root form. */
export function directDisplay(
  s: DirectState,
  sci: boolean,
): {top: string; main: string; approx: string} {
  const top = s.acc && s.op ? `${s.acc.text} ${s.op}` : '';
  if (s.error) {
    return {top, main: s.error, approx: ''};
  }
  if (s.entry) {
    return {top, main: entryText(s.entry), approx: ''};
  }
  const shown = s.cur ?? s.acc;
  return {
    top,
    ...(shown ? shownResult(shown.value, sci) : {main: '0', approx: ''}),
  };
}
