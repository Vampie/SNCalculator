/**
 * Whole calculator state: settings, both modes, and the tape of past calculations.
 * Pure functions, so the UI only renders and the logic is testable without a device.
 */
import {DirectState, directDisplay, newDirect, pressDirect} from './direct';
import {ExprState, newExpr, pressExpr, tokensText} from './expression';
import {Outcome, resultText, shownResult} from './math';

/** One tape line; lines of one calculation share a `group` ("Last calc"). */
export type TapeLine = {text: string; value: number; group: number};

export type CalcState = {
  /** Keypad: 'basic' = Basic, 'sci' = Adv (scientific functions). */
  keys: 'basic' | 'sci';
  /** 'expr' = Expr (whole expression), 'direct' = Step (one operation at a time). */
  mode: 'expr' | 'direct';
  deg: boolean;
  /** Show every result in scientific notation (NORM/SCI). */
  sci: boolean;
  /** Value of the last tape line (the Ans key). */
  ans: number;
  tape: TapeLine[];
  group: number;
  expr: ExprState;
  direct: DirectState;
};

export const newCalc = (): CalcState => ({
  keys: 'basic',
  mode: 'expr',
  deg: true,
  sci: false,
  ans: 0,
  tape: [],
  group: 0,
  expr: newExpr(),
  direct: newDirect(),
});

function record(s: CalcState, out: Outcome<unknown>): CalcState {
  let {tape, ans, group} = s;
  if (out.line) {
    tape = [...tape, {...out.line, group}];
    ans = out.line.value;
  }
  if (out.endGroup) {
    group++;
  }
  return {...s, tape, ans, group};
}

/** NORM/SCI only exists on the Adv keypad; Basic always shows normal numbers. */
const sciOn = (s: CalcState) => s.sci && s.keys === 'sci';

export function pressKey(s: CalcState, key: string): CalcState {
  const ctx = {ans: s.ans, deg: s.deg, sci: sciOn(s)};
  if (s.mode === 'expr') {
    const out = pressExpr(s.expr, key, ctx);
    return record({...s, expr: out.state}, out);
  }
  const out = pressDirect(s.direct, key, ctx);
  return record({...s, direct: out.state}, out);
}

/** Switching mode also ends the current calculation. */
export const setMode = (s: CalcState, mode: CalcState['mode']): CalcState =>
  mode === s.mode ? s : {...s, mode, group: s.group + 1};

export const clearTape = (s: CalcState): CalcState => ({
  ...s,
  tape: [],
  group: s.group + 1,
});

/**
 * Top line (expression or pending operation), main line (result) and,
 * under a root form like 5√2, its decimal value.
 */
export function display(s: CalcState): {
  top: string;
  main: string;
  approx: string;
} {
  if (s.mode === 'direct') {
    return directDisplay(s.direct, sciOn(s));
  }
  const {tokens, result, error} = s.expr;
  const top = tokensText(tokens);
  if (error || result === null) {
    return {top, main: error ?? (tokens.length ? '' : '0'), approx: ''};
  }
  return {top, ...shownResult(result, sciOn(s))};
}

/** Texts for the Result and Last calc buttons, or null while the tape is empty. */
export function copyTexts(s: CalcState): {result: string; last: string} | null {
  const last = s.tape[s.tape.length - 1];
  if (!last) {
    return null;
  }
  return {
    result: resultText(last.value, sciOn(s)),
    last: s.tape
      .filter(l => l.group === last.group)
      .map(l => l.text)
      .join('\n'),
  };
}

/**
 * Texts for the tape lines picked in the tape list (by index, in tape order):
 * only their results, or the whole calculations. Null when nothing is picked.
 */
export function pickedTexts(
  s: CalcState,
  picked: ReadonlySet<number>,
): {result: string; calc: string} | null {
  const lines = s.tape.filter((_, i) => picked.has(i));
  if (lines.length === 0) {
    return null;
  }
  return {
    result: lines.map(l => resultText(l.value, sciOn(s))).join('\n'),
    calc: lines.map(l => l.text).join('\n'),
  };
}
