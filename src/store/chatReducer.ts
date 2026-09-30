import type { Chat, Message, MessageStatus } from '../types';
import type { ParsedEvent } from '../utils/notifications';

export interface ChatState {
  chats: Record<string, Chat>;
  activeChatId: string | null;
}

export type ChatAction =
  | { type: 'openChat'; chatId: string; phone?: string; name?: string }
  | { type: 'selectChat'; chatId: string | null }
  | { type: 'addPending'; chatId: string; message: Message }
  | { type: 'sendSucceeded'; chatId: string; localId: string; idMessage: string }
  | { type: 'sendFailed'; chatId: string; localId: string; error: string }
  | { type: 'retry'; chatId: string; localId: string }
  | { type: 'event'; event: ParsedEvent }
  | { type: 'deleteChat'; chatId: string };

export const initialChatState: ChatState = { chats: {}, activeChatId: null };

const STATUS_RANK: Record<MessageStatus, number> = { failed: -1, pending: 0, sent: 1, delivered: 2, read: 3 };

function updateMessage(chat: Chat, match: (m: Message) => boolean, patch: (m: Message) => Message): Chat {
  let changed = false;
  const messages = chat.messages.map((m) => {
    if (!match(m)) return m;
    changed = true;
    return patch(m);
  });
  return changed ? { ...chat, messages } : chat;
}

function withChat(state: ChatState, chat: Chat): ChatState {
  return { ...state, chats: { ...state.chats, [chat.chatId]: chat } };
}

export function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'openChat': {
      const existing = state.chats[action.chatId];
      const chat: Chat = existing
        ? { ...existing, phone: existing.phone ?? action.phone, name: existing.name ?? action.name, unread: 0 }
        : { chatId: action.chatId, phone: action.phone, name: action.name, messages: [], unread: 0, updatedAt: Date.now() };
      return { ...withChat(state, chat), activeChatId: action.chatId };
    }

    case 'selectChat': {
      if (!action.chatId) return { ...state, activeChatId: null };
      const chat = state.chats[action.chatId];
      if (!chat) return state;
      return { ...withChat(state, { ...chat, unread: 0 }), activeChatId: action.chatId };
    }

    case 'deleteChat': {
      const { [action.chatId]: _removed, ...rest } = state.chats;
      void _removed;
      return { chats: rest, activeChatId: state.activeChatId === action.chatId ? null : state.activeChatId };
    }

    case 'addPending': {
      const chat = state.chats[action.chatId];
      if (!chat) return state;
      return withChat(state, { ...chat, messages: [...chat.messages, action.message], updatedAt: action.message.timestamp });
    }

    case 'sendSucceeded': {
      const chat = state.chats[action.chatId];
      if (!chat) return state;
      // If the echo notification already arrived with this idMessage, drop the duplicate
      const echoed = chat.messages.some((m) => m.id !== action.localId && m.idMessage === action.idMessage);
      if (echoed) {
        return withChat(state, { ...chat, messages: chat.messages.filter((m) => m.id !== action.localId) });
      }
      return withChat(
        state,
        updateMessage(
          chat,
          (m) => m.id === action.localId,
          (m) => ({
            ...m,
            idMessage: action.idMessage,
            status: m.status && STATUS_RANK[m.status] > STATUS_RANK.sent ? m.status : 'sent',
            error: undefined,
          }),
        ),
      );
    }

    case 'sendFailed': {
      const chat = state.chats[action.chatId];
      if (!chat) return state;
      return withChat(
        state,
        updateMessage(chat, (m) => m.id === action.localId, (m) => ({ ...m, status: 'failed', error: action.error })),
      );
    }

    case 'retry': {
      const chat = state.chats[action.chatId];
      if (!chat) return state;
      return withChat(
        state,
        updateMessage(chat, (m) => m.id === action.localId, (m) => ({ ...m, status: 'pending', error: undefined, timestamp: Date.now() })),
      );
    }

    case 'event':
      return applyEvent(state, action.event);
  }
}

function applyEvent(state: ChatState, event: ParsedEvent): ChatState {
  if (event.kind === 'ignore') return state;

  if (event.kind === 'status') {
    for (const chat of Object.values(state.chats)) {
      if (!chat.messages.some((m) => m.idMessage === event.idMessage)) continue;
      return withChat(
        state,
        updateMessage(
          chat,
          (m) => m.idMessage === event.idMessage,
          (m) => {
            if (event.status === 'failed') return { ...m, status: 'failed', error: 'MAX не доставил сообщение' };
            const current = m.status ?? 'pending';
            return STATUS_RANK[event.status] > STATUS_RANK[current] ? { ...m, status: event.status } : m;
          },
        ),
      );
    }
    return state;
  }

  // kind === 'message'
  let chat: Chat | undefined = state.chats[event.chatId];

  // Reply from a person whose chat was created under a different id: match by phone
  if (!chat && event.senderPhone) {
    chat = Object.values(state.chats).find((c) => c.phone === event.senderPhone);
  }

  if (chat?.messages.some((m) => m.idMessage === event.idMessage)) return state; // duplicate

  if (event.fromApi && chat) {
    // Echo of our own API send that arrived before sendMessage resolved: attach id to the pending bubble
    const pending = chat.messages.find((m) => m.direction === 'out' && !m.idMessage && m.text === event.text);
    if (pending) {
      return withChat(
        state,
        updateMessage(chat, (m) => m.id === pending.id, (m) => ({ ...m, idMessage: event.idMessage, status: 'sent' })),
      );
    }
  }

  const message: Message = {
    id: event.idMessage,
    idMessage: event.idMessage,
    text: event.text,
    direction: event.direction,
    timestamp: event.timestamp,
    status: event.direction === 'out' ? 'sent' : undefined,
  };

  const isActive = state.activeChatId === (chat?.chatId ?? event.chatId);
  const base: Chat = chat ?? {
    chatId: event.chatId,
    phone: event.senderPhone,
    name: event.senderName,
    messages: [],
    unread: 0,
    updatedAt: event.timestamp,
  };

  const messages = [...base.messages, message].sort((a, b) => a.timestamp - b.timestamp);
  return withChat(state, {
    ...base,
    name: base.name ?? event.senderName,
    phone: base.phone ?? event.senderPhone,
    messages,
    unread: event.direction === 'in' && !isActive ? base.unread + 1 : base.unread,
    updatedAt: Math.max(base.updatedAt, event.timestamp),
  });
}
