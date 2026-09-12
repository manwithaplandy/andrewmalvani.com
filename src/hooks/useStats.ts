import {useCallback, useEffect, useState} from 'react';

import {StatsViewModel} from '../data/dataDef';
import {normalizeStatsPayload} from '../utils/statsPayload';

export type StatsState =
  | {status: 'loading'}
  | {status: 'error'}
  | {status: 'success'; data: StatsViewModel};

const FETCH_TIMEOUT_MS = 10_000;

const useStats = (): {state: StatsState; refetch: () => void} => {
  const [state, setState] = useState<StatsState>({status: 'loading'});
  // Bump to re-run the fetch effect; lets the error state offer a Retry.
  const [attempt, setAttempt] = useState(0);

  const refetch = useCallback(() => {
    setState({status: 'loading'});
    setAttempt(value => value + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    // Same-origin fetch of the static file the aggregator publishes — no API,
    // no CORS, no credentials involved.
    fetch('/stats.json', {headers: {Accept: 'application/json'}, signal: controller.signal})
      .then(response => (response.ok ? response.json() : Promise.reject(new Error(`HTTP ${response.status}`))))
      .then((raw: unknown) => {
        if (cancelled) {
          return;
        }
        const today = new Date().toISOString().slice(0, 10);
        const data = normalizeStatsPayload(raw, today);
        if (data === null) {
          setState({status: 'error'});
        } else {
          setState({data, status: 'success'});
        }
      })
      .catch(() => {
        if (!cancelled) {
          setState({status: 'error'});
        }
      })
      .finally(() => {
        window.clearTimeout(timeout);
      });
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [attempt]);

  return {refetch, state};
};

export default useStats;
