/** Help screen content: per section, [key or control as shown, explanation]. */
export const HELP: {title: string; items: [string, string][]}[] = [
  {
    title: 'Top row',
    items: [
      ['Basic | Adv', 'Basic keypad, or Adv with the scientific functions.'],
      [
        'Expr | Step',
        'Expr: type the whole calculation, then =. × and ÷ go before + and −, and parentheses are allowed. ' +
          'Step: like a pocket calculator, every operation is done at once, left to right: 2 + 3 × 4 = 20.',
      ],
      ['DEG | RAD', 'Angles in degrees or radians (Adv only).'],
      [
        'NORM | SCI',
        'Results as normal numbers, or always as a × 10ⁿ (Adv only).',
      ],
      ['?', 'This help.'],
      ['✕', 'Closes the calculator. Mode and tape are kept.'],
    ],
  },
  {
    title: 'Tape and insert',
    items: [
      [
        'Tape (n)',
        'Every result goes on the tape (n lines). Shows it as a list over the calculator.',
      ],
      ['Result', 'Inserts the last result into the open note as a text box.'],
      [
        'Last calc',
        'Inserts the last calculation; in Step mode with all its steps.',
      ],
      [
        'Tape list',
        'Tap lines to select them, or use Select all. Insert: Result puts only their results ' +
          'in the note, one per line; Calculation puts the whole lines.',
      ],
      ['Clear tape', 'On the tape screen: removes all lines.'],
      [
        'Note',
        'Inserting only works in a note, not in a PDF or other document. ' +
          'The text box lands in the middle of the page: move it with the lasso.',
      ],
    ],
  },
  {
    title: 'Keys',
    items: [
      ['C', 'Clears the current calculation. The tape stays.'],
      ['⌫', 'Deletes the last thing you typed.'],
      ['( )', 'Parentheses (Expr only). A missing ) is added at =.'],
      ['±', 'Changes the sign of the number, or of the exponent after ×10ⁿ.'],
      [',', 'Decimal comma.'],
      ['Ans', 'The last result.'],
      ['=', 'Calculates the result.'],
    ],
  },
  {
    title: 'Adv keys',
    items: [
      ['sin cos tan', 'Sine, cosine and tangent, in DEG or RAD.'],
      [
        'sin⁻¹ cos⁻¹ tan⁻¹',
        'Inverse: the angle with this sine, cosine or tangent.',
      ],
      ['log ln', 'Logarithm base 10, natural logarithm.'],
      ['10ˣ eˣ', 'Power of 10, power of e.'],
      ['√', 'Square root.'],
      ['ⁿ√', 'n-th root: 3 ⁿ√ 8 = 2.'],
      ['x² xʸ', 'Square, power: 2 xʸ 3 = 8.'],
      ['1/x', 'One divided by the number.'],
      ['n!', 'Factorial: 5! = 120 (whole numbers ≥ 0 only).'],
      ['%', 'Divides by 100: 200 × 10 % = 20.'],
      ['π e', 'The constants 3,14159… and 2,71828…'],
      [
        '×10ⁿ',
        'Scientific notation: 4,5 ×10ⁿ 3 is 4,5×10³ = 4500. ' +
          '− (or ±) right after ×10ⁿ makes the exponent negative: 4,5×10⁻².',
      ],
    ],
  },
  {
    title: 'Results',
    items: [
      [
        '5√2',
        'Results with a square root are also shown exactly: √50 = 5√2 ≈ 7,07106781187.',
      ],
      ['a × 10ⁿ', 'Very large or very small numbers are shown as a × 10ⁿ.'],
      [
        'Error',
        'For example division by 0 or the root of a negative number. Press any key to go on.',
      ],
    ],
  },
];
