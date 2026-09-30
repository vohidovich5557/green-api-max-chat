import { describe, expect, it } from 'vitest';
import { normalizeApiUrl } from '../api/greenApi';
import { chatReducer, initialChatState, type ChatState } from '../store/chatReducer';
import { parseNotification } from '../utils/notifications';
import { formatPhone, isValidPhone, toDigits } from '../utils/phone';

const incoming = (idMessage: string, text: string, chatId = '10000000') =>
  parseNotification({
    typeWebhook: 'incomingMessageReceived',
    idMessage,
    timestamp: 1_700_000_000,
    senderData: { chatId, senderName: 'Иван', senderPhoneNumber: 79991234567 },
    messageData: { typeMessage: 'textMessage', textMessageData: { textMessage: text } },
  });

describe('phone utils', () => {
  it('normalizes and validates numbers', () => {
    expect(toDigits('+7 (999) 123-45-67')).toBe('79991234567');
    expect(isValidPhone('+7 999 123 45 67')).toBe(true);
    expect(isValidPhone('12345')).toBe(false);
    expect(formatPhone('79991234567')).toBe('+7 999 123-45-67');
  });
});

describe('normalizeApiUrl', () => {
  it('strips trailing slash and /v3', () => {
    expect(normalizeApiUrl('https://3100.api.green-api.com/v3/')).toBe('https://3100.api.green-api.com');
    expect(normalizeApiUrl('api.green-api.com')).toBe('https://api.green-api.com');
  });
});

describe('parseNotification', () => {
  it('parses text and extended text messages', () => {
    const e = incoming('A1', 'Привет');
    expect(e).toMatchObject({ kind: 'message', direction: 'in', chatId: '10000000', text: 'Привет' });
    const ext = parseNotification({
      typeWebhook: 'incomingMessageReceived',
      idMessage: 'A2',
      senderData: { chatId: '1' },
      messageData: { typeMessage: 'extendedTextMessage', extendedTextMessageData: { text: 'https://max.ru' } },
    });
    expect(ext).toMatchObject({ kind: 'message', text: 'https://max.ru' });
  });

  it('ignores non-text messages and unknown webhooks', () => {
    expect(
      parseNotification({ typeWebhook: 'incomingMessageReceived', idMessage: 'X', senderData: { chatId: '1' }, messageData: { typeMessage: 'imageMessage' } }).kind,
    ).toBe('ignore');
    expect(parseNotification({ typeWebhook: 'stateInstanceChanged' }).kind).toBe('ignore');
  });
});

describe('chatReducer', () => {
  const opened = (): ChatState => chatReducer(initialChatState, { type: 'openChat', chatId: '10000000', phone: '79991234567' });

  it('sends a message: pending → sent → read', () => {
    let s = opened();
    s = chatReducer(s, { type: 'addPending', chatId: '10000000', message: { id: 'l1', text: 'Hi', direction: 'out', timestamp: 1, status: 'pending' } });
    s = chatReducer(s, { type: 'sendSucceeded', chatId: '10000000', localId: 'l1', idMessage: 'M1' });
    expect(s.chats['10000000'].messages[0]).toMatchObject({ status: 'sent', idMessage: 'M1' });
    s = chatReducer(s, { type: 'event', event: { kind: 'status', idMessage: 'M1', status: 'read' } });
    expect(s.chats['10000000'].messages[0].status).toBe('read');
    // a late "delivered" must not downgrade "read"
    s = chatReducer(s, { type: 'event', event: { kind: 'status', idMessage: 'M1', status: 'delivered' } });
    expect(s.chats['10000000'].messages[0].status).toBe('read');
  });

  it('adds replies, dedupes repeats, counts unread only for inactive chats', () => {
    let s = chatReducer(opened(), { type: 'selectChat', chatId: null });
    s = chatReducer(s, { type: 'event', event: incoming('R1', 'Ответ') });
    s = chatReducer(s, { type: 'event', event: incoming('R1', 'Ответ') });
    expect(s.chats['10000000'].messages).toHaveLength(1);
    expect(s.chats['10000000'].unread).toBe(1);
    s = chatReducer(s, { type: 'selectChat', chatId: '10000000' });
    expect(s.chats['10000000'].unread).toBe(0);
  });

  it('creates a chat when an unknown contact writes first', () => {
    const s = chatReducer(initialChatState, { type: 'event', event: incoming('R9', 'Здравствуйте', '555') });
    expect(s.chats['555']).toMatchObject({ name: 'Иван', phone: '79991234567', unread: 1 });
  });

  it('does not duplicate our message when the API echo arrives first', () => {
    let s = opened();
    s = chatReducer(s, { type: 'addPending', chatId: '10000000', message: { id: 'l1', text: 'Hi', direction: 'out', timestamp: 1, status: 'pending' } });
    s = chatReducer(s, {
      type: 'event',
      event: { kind: 'message', direction: 'out', fromApi: true, chatId: '10000000', idMessage: 'M1', text: 'Hi', timestamp: 2 },
    });
    s = chatReducer(s, { type: 'sendSucceeded', chatId: '10000000', localId: 'l1', idMessage: 'M1' });
    expect(s.chats['10000000'].messages).toHaveLength(1);
  });
});
