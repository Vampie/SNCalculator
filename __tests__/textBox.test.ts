import {textBoxRect} from '../src/textBox';

const NOMAD = {width: 1404, height: 1872};

describe('textBoxRect', () => {
  it('fits a short result and centers it', () => {
    const r = textBoxRect('5√2', NOMAD);
    expect(r.right - r.left).toBeLessThan(NOMAD.width / 3);
    // Centered, give or take one pixel of rounding.
    expect(Math.abs(r.left + r.right - NOMAD.width)).toBeLessThanOrEqual(1);
    expect(Math.abs(r.top + r.bottom - NOMAD.height)).toBeLessThanOrEqual(1);
  });

  it('grows with the longest line but stays inside the page', () => {
    const one = textBoxRect('√(50) = 5√2 ≈ 7,07106781187', NOMAD);
    const two = textBoxRect('1 + 1 = 2\n√(50) = 5√2 ≈ 7,07106781187', NOMAD);
    expect(two.right - two.left).toBe(one.right - one.left);
    expect(two.bottom - two.top).toBeGreaterThan(one.bottom - one.top);
    const long = textBoxRect('1'.repeat(200), NOMAD);
    expect(long.left).toBeGreaterThan(0);
    expect(long.right).toBeLessThan(NOMAD.width);
  });
});
