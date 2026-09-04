import { formatRequestCode, REQUEST_CODE_MAX_DIGITS } from './request-code';

describe('request-code', () => {
  it('formats as plain digits without leading zeros', () => {
    expect(formatRequestCode(1)).toBe('1');
    expect(formatRequestCode(17)).toBe('17');
    expect(formatRequestCode(100001)).toBe('100001');
  });

  it('rejects values above the digit limit', () => {
    const over = 10 ** REQUEST_CODE_MAX_DIGITS;
    expect(() => formatRequestCode(over)).toThrow(/máximo/);
  });
});
