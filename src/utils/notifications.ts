import type { NotificationBody } from '../api/greenApi';
import type { MessageStatus } from '../types';

export type ParsedEvent =
  | {
      kind: 'message';
      direction: 'in' | 'out';
      /** true for outgoingAPIMessageReceived — echo of a message sent through the API */
      fromApi: boolean;
      chatId: string;
      idMessage: string;
      text: string;
      timestamp: number;
      senderName?: string;
      senderPhone?: string;
    }
  | { kind: 'status'; idMessage: string; status: MessageStatus }
  | { kind: 'ignore' };

const STATUS_MAP: Record<string, MessageStatus> = {
  sent: 'sent',
  delivered: 'delivered',
  read: 'read',
  failed: 'failed',
  noAccount: 'failed',
  notInGroup: 'failed',
  yellowCard: 'failed',
};

export function extractText(body: NotificationBody): string | null {
  const md = body.messageData;
  if (!md) return null;
  if (md.typeMessage === 'textMessage') return md.textMessageData?.textMessage ?? null;
  if (md.typeMessage === 'extendedTextMessage') return md.extendedTextMessageData?.text ?? null;
  return null; // images, files, stickers etc. are out of scope: text only
}

export function parseNotification(body: NotificationBody): ParsedEvent {
  const type = body?.typeWebhook;

  if (type === 'outgoingMessageStatus') {
    const status = body.status ? STATUS_MAP[body.status] : undefined;
    if (!body.idMessage || !status) return { kind: 'ignore' };
    return { kind: 'status', idMessage: body.idMessage, status };
  }

  if (type === 'incomingMessageReceived' || type === 'outgoingMessageReceived' || type === 'outgoingAPIMessageReceived') {
    const text = extractText(body);
    const chatId = body.senderData?.chatId;
    if (text == null || !chatId || !body.idMessage) return { kind: 'ignore' };
    const incoming = type === 'incomingMessageReceived';
    const phone = body.senderData?.senderPhoneNumber;
    return {
      kind: 'message',
      direction: incoming ? 'in' : 'out',
      fromApi: type === 'outgoingAPIMessageReceived',
      chatId: String(chatId),
      idMessage: body.idMessage,
      text,
      timestamp: body.timestamp ? body.timestamp * 1000 : Date.now(),
      senderName: incoming
        ? body.senderData?.senderContactName || body.senderData?.senderName || body.senderData?.chatName
        : undefined,
      senderPhone: incoming && phone ? String(phone) : undefined,
    };
  }

  return { kind: 'ignore' };
}
