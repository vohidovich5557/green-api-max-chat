import { Fragment, useEffect, useLayoutEffect, useRef } from 'react';
import type { Chat } from '../types';
import { formatDay, formatTime, isSameDay } from '../utils/format';
import { formatPhone } from '../utils/phone';
import { Avatar } from './Avatar';
import { Composer } from './Composer';
import { IconBack, IconTrash, StatusTicks } from './Icons';
import { chatTitle } from './Sidebar';

interface Props {
  chat: Chat;
  onBack: () => void;
  onSend: (text: string) => void;
  onRetry: (localId: string) => void;
  onDelete: () => void;
}

export function ChatWindow({ chat, onBack, onSend, onRetry, onDelete }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const title = chatTitle(chat);
  const subtitle = chat.name && chat.phone ? formatPhone(chat.phone) : chat.phone ? 'MAX' : `chatId ${chat.chatId}`;

  // Jump to the bottom when switching chats
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
    stickToBottom.current = true;
  }, [chat.chatId]);

  // Follow new messages only if the user hasn't scrolled up to read history
  useEffect(() => {
    const el = scrollRef.current;
    const last = chat.messages[chat.messages.length - 1];
    if (el && (stickToBottom.current || last?.direction === 'out')) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }
  }, [chat.messages]);

  return (
    <section className="chat" aria-label={`Чат с ${title}`}>
      <header className="chat__head">
        <button className="icon-btn chat__back" onClick={onBack} aria-label="Назад к чатам">
          <IconBack />
        </button>
        <Avatar seed={chat.chatId} label={title} size={40} />
        <div className="chat__who">
          <h2>{title}</h2>
          <span>{subtitle}</span>
        </div>
        <button
          className="icon-btn"
          onClick={() => window.confirm('Удалить чат из списка? Сообщения в MAX не удалятся.') && onDelete()}
          aria-label="Удалить чат"
          title="Удалить чат"
        >
          <IconTrash width={20} height={20} />
        </button>
      </header>

      <div
        className="chat__scroll"
        ref={scrollRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
      >
        <div className="messages" role="log" aria-live="polite">
          {chat.messages.length === 0 && (
            <div className="messages__empty">
              <p>Напишите первое сообщение — {title} получит его в MAX.</p>
            </div>
          )}
          {chat.messages.map((m, i) => {
            const prev = chat.messages[i - 1];
            const newDay = !prev || !isSameDay(prev.timestamp, m.timestamp);
            const grouped = !newDay && prev && prev.direction === m.direction && m.timestamp - prev.timestamp < 120_000;
            return (
              <Fragment key={m.id}>
                {newDay && (
                  <div className="day-sep">
                    <span>{formatDay(m.timestamp)}</span>
                  </div>
                )}
                <div className={`bubble bubble--${m.direction} ${grouped ? 'is-grouped' : ''} ${m.status === 'failed' ? 'is-failed' : ''}`}>
                  <p className="bubble__text">{m.text}</p>
                  <span className="bubble__meta">
                    {formatTime(m.timestamp)}
                    {m.direction === 'out' && m.status !== 'failed' && <StatusTicks status={m.status} />}
                  </span>
                  {m.status === 'failed' && (
                    <div className="bubble__error">
                      <span>{m.error || 'Не отправлено'}</span>
                      <button onClick={() => onRetry(m.id)}>Повторить</button>
                    </div>
                  )}
                </div>
              </Fragment>
            );
          })}
        </div>
      </div>

      <Composer chatId={chat.chatId} onSend={onSend} />
    </section>
  );
}
