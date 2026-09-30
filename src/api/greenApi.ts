import type { Credentials } from '../types';

export class GreenApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'GreenApiError';
    this.status = status;
  }
}

export type InstanceState = 'authorized' | 'notAuthorized' | 'blocked' | 'starting' | 'yellowCard' | string;

export interface Notification {
  receiptId: number;
  body: NotificationBody;
}

export interface NotificationBody {
  typeWebhook: string;
  timestamp?: number;
  idMessage?: string;
  status?: string;
  chatId?: string;
  senderData?: {
    chatId?: string;
    sender?: string;
    senderName?: string;
    senderContactName?: string;
    chatName?: string;
    senderPhoneNumber?: number | string;
  };
  messageData?: {
    typeMessage?: string;
    textMessageData?: { textMessage?: string };
    extendedTextMessageData?: { text?: string };
  };
}

/** Removes trailing slashes and the optional /v3 suffix users sometimes paste from the console */
export function normalizeApiUrl(apiUrl: string): string {
  let url = apiUrl.trim().replace(/\/+$/, '');
  url = url.replace(/\/v3$/i, '');
  if (url && !/^https?:\/\//i.test(url)) url = `https://${url}`;
  return url;
}

function buildUrl(c: Credentials, method: string, suffix = ''): string {
  return `${normalizeApiUrl(c.apiUrl)}/waInstance${c.idInstance.trim()}/${method}/${c.apiTokenInstance.trim()}${suffix}`;
}

function describeStatus(status: number): string {
  switch (status) {
    case 401:
    case 403:
      return 'Неверный idInstance или apiTokenInstance.';
    case 404:
      return 'Метод не найден. Проверьте apiUrl инстанса в личном кабинете.';
    case 429:
      return 'Слишком много запросов. Повторите через несколько секунд.';
    case 466:
      return 'Исчерпан лимит тарифа GREEN-API.';
    default:
      return `GREEN-API вернул ошибку ${status}.`;
  }
}

async function request<T>(c: Credentials, method: string, init: RequestInit & { suffix?: string } = {}): Promise<T> {
  const { suffix, ...rest } = init;
  let res: Response;
  try {
    res = await fetch(buildUrl(c, method, suffix), {
      ...rest,
      headers: { 'Content-Type': 'application/json', ...(rest.headers || {}) },
    });
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e;
    throw new GreenApiError('Нет соединения с GREEN-API. Проверьте интернет и apiUrl.');
  }
  if (!res.ok) {
    let detail = '';
    try {
      const data = await res.json();
      detail = data?.message || data?.reason || '';
    } catch {
      /* body is not JSON */
    }
    throw new GreenApiError(detail ? `${describeStatus(res.status)} ${detail}` : describeStatus(res.status), res.status);
  }
  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}

export const greenApi = {
  /** https://green-api.com/v3/docs/api/account/GetStateInstance/ */
  async getStateInstance(c: Credentials): Promise<InstanceState> {
    const data = await request<{ stateInstance: InstanceState }>(c, 'getStateInstance');
    return data?.stateInstance;
  },

  /** https://green-api.com/v3/docs/api/service/CheckAccount/ — phone → MAX chatId */
  async checkAccount(c: Credentials, phoneDigits: string): Promise<{ chatId: string; exist: boolean }> {
    const data = await request<{ chatId?: string; exist?: boolean }>(c, 'checkAccount', {
      method: 'POST',
      body: JSON.stringify({ phoneNumber: Number(phoneDigits) }),
    });
    const chatId = data?.chatId ? String(data.chatId) : '';
    return { chatId, exist: data?.exist ?? Boolean(chatId) };
  },

  /** https://green-api.com/v3/docs/api/sending/SendMessage/ */
  async sendMessage(c: Credentials, chatId: string, message: string): Promise<{ idMessage: string }> {
    return request<{ idMessage: string }>(c, 'sendMessage', {
      method: 'POST',
      body: JSON.stringify({ chatId, message }),
    });
  },

  /** https://green-api.com/v3/docs/api/receiving/technology-http-api/ReceiveNotification/ */
  async receiveNotification(c: Credentials, signal?: AbortSignal, timeoutSec = 20): Promise<Notification | null> {
    return request<Notification | null>(c, 'receiveNotification', {
      method: 'GET',
      suffix: `?receiveTimeout=${timeoutSec}`,
      signal,
    });
  },

  /** https://green-api.com/v3/docs/api/receiving/technology-http-api/DeleteNotification/ */
  async deleteNotification(c: Credentials, receiptId: number, signal?: AbortSignal): Promise<void> {
    await request<{ result: boolean }>(c, 'deleteNotification', {
      method: 'DELETE',
      suffix: `/${receiptId}`,
      signal,
    });
  },
};
