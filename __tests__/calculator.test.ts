import {
  CalcState,
  copyTexts,
  display,
  pickedTexts,
  newCalc,
  pressKey,
  setMode,
} from '../src/calculator';
import {
  exactRoot,
  formatNumber,
  getDecimalSign,
  setLanguage,
} from '../src/math';

/** Presses keys separated by spaces; "45261" types five digit keys. */
const run = (seq: string, start: CalcState = newCalc()) =>
  seq
    .split(' ')
    .flatMap(k => (/^[0-9,]+$/.test(k) ? k.split('') : [k]))
    .reduce(pressKey, start);

const main = (seq: string, start?: CalcState) => display(run(seq, start)).main;
const tape = (seq: string, start?: CalcState) =>
  run(seq, start).tape.map(l => l.text);

describe('formatNumber', () => {
  it.each([
    [0.1 + 0.2, false, '0,3'],
    [1 / 3, false, '0,333333333333'],
    [-2.5, false, '−2,5'],
    [1e12, false, '1 × 10¹²'],
    [1.5e-7, false, '1,5 × 10⁻⁷'],
    [452.61, true, '4,5261 × 10²'],
    [-0.00001234, true, '−1,234 × 10⁻⁵'],
  ])('%p (sci %p) → %p', (x, sci, text) => {
    expect(formatNumber(x, sci)).toBe(text);
  });
});

describe('Expr mode', () => {
  it.each([
    ['3 + 4 × 2 =', '11'],
    ['2 × ( 3 + 1 =', '8'],
    ['− 2 x² =', '−4'],
    ['2 xʸ − 2 =', '0,25'],
    ['45261 ×10ⁿ ± 2 =', '452,61'],
    ['sin 30 =', '0,5'],
    ['sin 180 =', '0'],
    ['sin⁻¹ 0,5 =', '30'],
    ['3 ⁿ√ − 8 =', '−2'],
    ['5 n! =', '120'],
    ['200 × 10 % =', '20'],
    ['2 π =', '6,28318530718'],
    ['12 ⌫ + 1 =', '2'],
    ['2 + 3 = 7 =', '7'],
    ['2 + 3 = × 4 =', '20'],
    ['tan 90 =', 'Error: invalid input'],
    ['1 ÷ 0 =', 'Error: division by 0'],
    ['2 + =', 'Error: incomplete expression'],
  ])('%p → %p', (seq, result) => {
    expect(main(seq)).toBe(result);
  });

  it('uses radians when DEG is off', () => {
    expect(main('sin π =', {...newCalc(), deg: false})).toBe('0');
  });

  it('writes closed, readable lines on the tape', () => {
    expect(tape('2 × ( 3 + 1 =')).toEqual(['2 × (3 + 1) = 8']);
    expect(tape('45261 ×10ⁿ ± 2 =')).toEqual(['45\u00A0261×10⁻² = 452,61']);
    expect(tape('sin 30 =')).toEqual(['sin(30) = 0,5']);
  });

  it('shows the value of Ans on the tape', () => {
    expect(tape('0 − 5 = x² =')).toEqual(['0 − 5 = −5', '(−5)² = 25']);
  });

  it('does not write errors on the tape', () => {
    expect(tape('1 ÷ 0 =')).toEqual([]);
  });

  it('copies the result and the last calculation', () => {
    expect(copyTexts(newCalc())).toBeNull();
    expect(copyTexts(run('1 + 1 = 2 × 3 ='))).toEqual({
      result: '6',
      last: '2 × 3 = 6',
    });
  });

  it('copies picked tape lines in tape order', () => {
    const s = run('1 + 1 = 2 × 3 = √ 50 =');
    expect(pickedTexts(s, new Set())).toBeNull();
    expect(pickedTexts(s, new Set([2, 0]))).toEqual({
      result: '2\n5√2',
      calc: '1 + 1 = 2\n√(50) = 5√2 ≈ 7,07106781187',
    });
  });
});

describe('Step mode', () => {
  const direct = setMode(newCalc(), 'direct');

  it('computes strictly left to right, one tape line per step', () => {
    const s = run('2 + 3 × 4 =', direct);
    expect(display(s).main).toBe('20');
    expect(s.tape.map(l => l.text)).toEqual(['2 + 3 = 5', '5 × 4 = 20']);
    expect(copyTexts(s)?.last).toBe('2 + 3 = 5\n5 × 4 = 20');
  });

  it('applies functions at once to the number shown', () => {
    expect(tape('16 √', direct)).toEqual(['√(16) = 4']);
    expect(display(run('5 + 3 x²', direct))).toEqual({
      top: '5 +',
      main: '9',
      approx: '',
    });
    expect(main('5 + 3 x² =', direct)).toBe('14');
  });

  it('replaces an operator pressed right after another', () => {
    expect(display(run('5 × +', direct)).top).toBe('5 +');
  });

  it('starts a new calculation after C', () => {
    expect(copyTexts(run('1 + 1 = C 2 + 2 =', direct))?.last).toBe('2 + 2 = 4');
  });

  it('ignores a second =, and has no parentheses', () => {
    expect(tape('2 + 3 = =', direct)).toEqual(['2 + 3 = 5']);
    expect(main('( 2 )', direct)).toBe('2');
  });

  it('accepts scientific notation and negates results', () => {
    expect(tape('45261 ×10ⁿ ± 2 × 2 =', direct)).toEqual([
      '45\u00A0261×10⁻² × 2 = 905,22',
    ]);
    expect(main('2 + 3 = ±', direct)).toBe('−5');
  });

  it('shows errors', () => {
    expect(main('1 ÷ 0 =', direct)).toBe('Error: division by 0');
  });
});

describe('exactRoot', () => {
  it.each([
    [Math.sqrt(50), '5√2'],
    [-Math.sqrt(8), '−2√2'],
    [Math.sin(Math.PI / 4), '√2/2'],
    [Math.sqrt(3) / 2, '√3/2'],
    [Math.tan(Math.PI / 6), '√3/3'],
    [Math.sqrt(0.75) * 3, '3√3/2'],
  ])('%p → %p', (x, text) => {
    expect(exactRoot(x)).toBe(text);
  });

  it.each([7, 0.3, 1 / 3, Math.PI, 1 + Math.SQRT2, 1e7, 0, 905.22, 123.456])(
    'leaves %p decimal',
    x => {
      expect(exactRoot(x)).toBeNull();
    },
  );
});

describe('root results', () => {
  it('shows the root form with the decimal value under it', () => {
    expect(display(run('√ 50 ='))).toEqual({
      top: '√(50)',
      main: '5√2',
      approx: '≈ 7,07106781187',
    });
    expect(tape('√ 50 =')).toEqual(['√(50) = 5√2 ≈ 7,07106781187']);
    expect(copyTexts(run('√ 50 ='))?.result).toBe('5√2');
  });

  it('keeps the root form when calculating on', () => {
    const direct = setMode(newCalc(), 'direct');
    expect(tape('50 √ × 2 =', direct)).toEqual([
      '√(50) = 5√2 ≈ 7,07106781187',
      '5√2 × 2 = 10√2 ≈ 14,1421356237',
    ]);
    expect(tape('√ 2 = x² =')).toEqual([
      '√(2) = √2 ≈ 1,41421356237',
      '(√2)² = 2',
    ]);
  });
});

describe('SCI', () => {
  it('only applies on the Adv keypad', () => {
    expect(main('5 × 5 =', {...newCalc(), sci: true})).toBe('25');
    expect(main('5 × 5 =', {...newCalc(), sci: true, keys: 'sci'})).toBe(
      '2,5 × 10¹',
    );
  });
});

describe('negative exponent', () => {
  it('takes − right after ×10ⁿ as the exponent sign', () => {
    expect(tape('45261 ×10ⁿ − 2 =')).toEqual(['45\u00A0261×10⁻² = 452,61']);
    expect(main('45261 ×10ⁿ − 2 × 2 =', setMode(newCalc(), 'direct'))).toBe(
      '905,22',
    );
  });

  it('still subtracts once the exponent has digits', () => {
    expect(main('2 ×10ⁿ 3 − 1 =')).toBe('1\u00A0999');
  });
});

describe('number format', () => {
  afterEach(() => setLanguage('nl'));

  it('groups thousands with a space and uses a comma by default', () => {
    expect(formatNumber(1234567.5)).toBe('1\u00A0234\u00A0567,5');
    expect(formatNumber(-1000)).toBe('−1\u00A0000');
    expect(formatNumber(999)).toBe('999');
  });

  it('uses a decimal point for English, Chinese, Japanese and Korean', () => {
    setLanguage('en_US');
    expect(formatNumber(1234.5)).toBe('1\u00A0234.5');
    expect(formatNumber(452.61, true)).toBe('4.5261 × 10²');
    expect(main('1234 , 5 =')).toBe('1\u00A0234.5');
    setLanguage('zh_CN');
    expect(getDecimalSign()).toBe('.');
    setLanguage('nl_BE');
    expect(getDecimalSign()).toBe(',');
  });
});
