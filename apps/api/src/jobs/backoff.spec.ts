import { retryDelayMs, safeErrorMessage } from './backoff.js';

describe('retryDelayMs', () => {
  it('cresce exponencialmente a partir de 5 s', () => {
    const zero = () => 0;
    expect([1, 2, 3, 4].map((a) => retryDelayMs(a, zero))).toEqual([5_000, 10_000, 20_000, 40_000]);
  });

  it('tem teto de 1 h mais variação de até 20%', () => {
    expect(retryDelayMs(30, () => 0)).toBe(3_600_000);
    expect(retryDelayMs(30, () => 1)).toBe(4_320_000);
  });
});

describe('safeErrorMessage', () => {
  it('corta mensagens longas', () => {
    expect(safeErrorMessage(new Error('x'.repeat(2000)), 50)).toHaveLength(51);
  });
});
