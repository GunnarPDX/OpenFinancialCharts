import { renderHook } from '@testing-library/react';
import useClosedQuotes from './useClosedQuotes';

const bar = (t, close = 10) => ({ date: new Date(t), open: 10, high: 11, low: 9, close, rank: 0 });

test('in-place live-tick updates keep the previous reference', () => {
  const t = Date.UTC(2026, 0, 5);
  const a = [bar(t), bar(t + 60000)];
  const { result, rerender } = renderHook(({ q }) => useClosedQuotes(q), { initialProps: { q: a } });
  expect(result.current).toBe(a);

  // applyTicks-style update: array copied, head object kept, last bar
  // replaced with the same date but new values
  const b = [a[0], { ...a[1], close: 10.7 }];
  rerender({ q: b });
  expect(result.current).toBe(a); // gate closed — studies skip this batch
});

test('an appended candle advances the reference', () => {
  const t = Date.UTC(2026, 0, 5);
  const a = [bar(t), bar(t + 60000)];
  const { result, rerender } = renderHook(({ q }) => useClosedQuotes(q), { initialProps: { q: a } });
  const b = [...a, bar(t + 120000)];
  rerender({ q: b });
  expect(result.current).toBe(b);
});

test('a replaced dataset (fresh fetch, same length/dates) advances the reference', () => {
  const t = Date.UTC(2026, 0, 5);
  const a = [bar(t), bar(t + 60000)];
  const { result, rerender } = renderHook(({ q }) => useClosedQuotes(q), { initialProps: { q: a } });
  const b = [bar(t, 99), bar(t + 60000, 98)]; // all-new objects → new head identity
  rerender({ q: b });
  expect(result.current).toBe(b);
});

test('a candle roll without append (cap trim) advances the reference', () => {
  const t = Date.UTC(2026, 0, 5);
  const a = [bar(t), bar(t + 60000)];
  const { result, rerender } = renderHook(({ q }) => useClosedQuotes(q), { initialProps: { q: a } });
  const b = [a[1], bar(t + 120000)]; // same length, shifted window
  rerender({ q: b });
  expect(result.current).toBe(b);
});
