import * as moment from 'moment';
import { Interval } from './ipc/messages';
import { sortOnField } from './sort';

/** Merges overlapping intervals and sorts. */
export const combineIntervals = (
  intervals: Interval[],
  gapThreshold: moment.Duration,
): Interval[] => {
  const sorted = sortOnField(intervals, (i) => i.start);

  const combined: Interval[] = [];
  let pending = sorted[0];
  // eslint-disable-next-line no-restricted-syntax
  for (const cur of sorted) {
    if (
      cur.start < pending.end ||
      !isGapOverThreshold(pending.end, cur.start, gapThreshold)
    ) {
      if (cur.end >= pending.end) {
        pending = { start: pending.start, end: cur.end };
      }
    } else {
      if (pending.start !== pending.end) {
        combined.push(pending);
      }
      pending = cur;
    }
  }
  if (pending.start !== pending.end) {
    combined.push(pending);
  }
  return combined;
};

const isGapOverThreshold = (
  start: string,
  end: string,
  gapThreshold: moment.Duration,
) => {
  return (
    moment.duration(end).subtract(moment.duration(start)).asMilliseconds() >
    gapThreshold.asMilliseconds()
  );
};

/** Removes skipped chapters from the list of intervals. */
export const subtractIntervals = (
  baseIntervals: Interval[],
  intervalsToRemove: Interval[],
): Interval[] => {
  intervalsToRemove = sortOnField(intervalsToRemove, (i) => i.start);

  let out: Interval[] = [...baseIntervals];

  intervalsToRemove.forEach((interval) => {
    out = removeInterval(out, interval);
  });

  return out;
};

/** Removes skipped chapters from the list of intervals. */
export const removeInterval = (
  baseIntervals: Interval[],
  toRemove: Interval,
): Interval[] => {
  baseIntervals = sortOnField(baseIntervals, (i) => i.start);

  let out: Interval[] = [...baseIntervals];

  const revision = [];
  // eslint-disable-next-line no-restricted-syntax
  for (const ivl of out) {
    const cur: Interval = { start: ivl.start, end: ivl.end };
    if (cur.start < toRemove.start && cur.end > toRemove.end) {
      // This removal interval splits it into two.
      revision.push({ start: cur.start, end: toRemove.start });
      cur.start = toRemove.end;
    }

    if (cur.start >= toRemove.start && cur.start < toRemove.end) {
      cur.start = toRemove.end;
    }
    if (cur.end > toRemove.start && cur.end < toRemove.end) {
      cur.end = toRemove.start;
    }
    if (cur.start < cur.end) {
      revision.push(cur);
    }
  }
  out = revision;

  return out;
};
