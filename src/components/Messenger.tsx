import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { greenApi, GreenApiError } from '../api/greenApi';
import { useNotificationPolling } from '../hooks/useNotificationPolling';
import { chatReducer, initialChatState } from '../store/chatReducer';
import { storage } from '../store/storage';
import type { Credentials } from '../types';
import type { ParsedEvent } from '../utils/notifications';
import { ChatWindow } from './ChatWindow';
import { MaxLogo } from './Icons';
import { NewChatDialog } from './NewChatDialog';
import { Sidebar } from './Sidebar';

let localCounter = 0;
const localId = () => `local-${Date.now()}-${++localCounter}`;

export function Messenger({ credentials, onLogout }: { credentials: Credentials; onLogout: () => void }) {
  const [state, dispatch] = useReducer(
    chatReducer,
    credentials.idInstance,
    (id) => ({ ...(storage.loadChats(id) ?? initialChatState), activeChatId: null }),
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    storage.saveChats(credentials.idInstance, state);
  }, [credentials.idInstance, state]);

  const handleEvent = useCallback((event: ParsedEvent) => dispatch({ type: 'event', event }), []);
  const { status: connection } = useNotificationPolling(credentials, handleEvent);

  const chats = useMemo(() => Object.values(state.chats).sort((a, b) => b.updatedAt - a.updatedAt), [state.chats]);
  const activeChat = state.activeChatId ? state.chats[state.activeChatId] : null;

  // Show unread count in the tab title
  useEffect(() => {
    const unread = chats.reduce((n, c) => n + c.unread, 0);
    document.title = unread ? `(${unread}) MAX Chat` : 'MAX Chat · GREEN-API';
  }, [chats]);

  const deliver = useCallback(
    async (chatId: string, id: string, text: string) => {
      try {
        const { idMessage } = await greenApi.sendMessage(credentials, chatId, text);
        dispatch({ type: 'sendSucceeded', chatId, localId: id, idMessage });
      } catch (err) {
        dispatch({
          type: 'sendFailed',
          chatId,
          localId: id,
          error: err instanceof GreenApiError ? err.message : 'Не удалось отправить',
        });
      }
    },
    [credentials],
  );

  const handleSend = (text: string) => {
    if (!activeChat) return;
    const id = localId();
    dispatch({
      type: 'addPending',
      chatId: activeChat.chatId,
      message: { id, text, direction: 'out', timestamp: Date.now(), status: 'pending' },
    });
    void deliver(activeChat.chatId, id, text);
  };

  const handleRetry = (id: string) => {
    if (!activeChat) return;
    const msg = activeChat.messages.find((m) => m.id === id);
    if (!msg) return;
    dispatch({ type: 'retry', chatId: activeChat.chatId, localId: id });
    void deliver(activeChat.chatId, id, msg.text);
  };

  return (
    <div className={`app ${activeChat ? 'has-chat' : ''}`}>
      <Sidebar
        chats={chats}
        activeChatId={state.activeChatId}
        idInstance={credentials.idInstance}
        connection={connection}
        onSelect={(chatId) => dispatch({ type: 'selectChat', chatId })}
        onNewChat={() => setDialogOpen(true)}
        onLogout={onLogout}
      />

      {activeChat ? (
        <ChatWindow
          chat={activeChat}
          onBack={() => dispatch({ type: 'selectChat', chatId: null })}
          onSend={handleSend}
          onRetry={handleRetry}
          onDelete={() => dispatch({ type: 'deleteChat', chatId: activeChat.chatId })}
        />
      ) : (
        <section className="chat chat--empty">
          <div className="placeholder">
            <MaxLogo size={64} />
            <h2>Выберите чат</h2>
            <p>или начните новый по номеру телефона</p>
            <button className="btn btn--primary" onClick={() => setDialogOpen(true)}>
              Новый чат
            </button>
          </div>
        </section>
      )}

      {dialogOpen && (
        <NewChatDialog
          credentials={credentials}
          onClose={() => setDialogOpen(false)}
          onCreated={(chatId, phone) => {
            // chatId may already exist if this person wrote to us first
            const byPhone = Object.values(stateRef.current.chats).find((c) => c.phone === phone && c.chatId !== chatId);
            dispatch({ type: 'openChat', chatId: byPhone?.chatId ?? chatId, phone });
            setDialogOpen(false);
          }}
        />
      )}
    </div>
  );
}
