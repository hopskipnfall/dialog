import { subtractIntervals } from './intervals';

describe('Interval Operations', () => {
  it('should handle one interval spanning the entire video', () => {
    const original = [{ start: '00:00:00.000', end: '00:24:10.493' }];
    const subtract = [
      { start: '00:23:39.439', end: '00:24:10.493' },
      { start: '00:22:09.349', end: '00:23:39.439' },
      { start: '00:05:10.331', end: '00:06:40.421' },
    ];
    const expected = [
      { start: '00:00:00.000', end: '00:05:10.331' },
      { start: '00:06:40.421', end: '00:22:09.349' },
    ];
    expect(subtractIntervals(original, subtract)).toEqual(expected);
  });
});
