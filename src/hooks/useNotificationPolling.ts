import { useEffect, useRef, useState } from 'react';
import { greenApi, GreenApiError } from '../api/greenApi';
import { parseNotification, type ParsedEvent } from '../utils/notifications';
import type { Credentials } from '../types';

export type ConnectionStatus = 'connecting' | 'online' | 'reconnecting';

const sleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve) => {
    const t = setTimeout(resolve, ms);
    signal.addEventListener('abort', () => {
      clearTimeout(t);
      resolve();
    });
  });

/**
 * HTTP API long-polling loop:
 * receiveNotification (waits up to 20 s) → handle → deleteNotification → repeat.
 * Every notification is deleted, even unsupported ones, so the queue never gets stuck.
 */
export function useNotificationPolling(credentials: Credentials, onEvent: (e: ParsedEvent) => void) {
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [lastError, setLastError] = useState<string | null>(null);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    (async () => {
      let backoff = 2000;
      while (!signal.aborted) {
        try {
          const notification = await greenApi.receiveNotification(credentials, signal);
          if (signal.aborted) break;
          setStatus('online');
          setLastError(null);
          backoff = 2000;
          if (!notification) continue; // timeout, queue empty

          try {
            onEventRef.current(parseNotification(notification.body));
          } finally {
            await greenApi.deleteNotification(credentials, notification.receiptId, signal);
          }
        } catch (e) {
          if (signal.aborted || (e as Error).name === 'AbortError') break;
          setStatus('reconnecting');
          setLastError(e instanceof GreenApiError ? e.message : 'Ошибка получения сообщений');
          await sleep(backoff, signal);
          backoff = Math.min(backoff * 2, 30000);
        }
      }
    })();

    return () => controller.abort();
  }, [credentials]);

  return { status, lastError };
}
