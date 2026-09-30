import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { IconSend } from './Icons';

const MAX_LENGTH = 4000; // SendMessage limit for text

export function Composer({ chatId, onSend }: { chatId: string; onSend: (text: string) => void }) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const ref = useRef<HTMLTextAreaElement>(null);
  const text = drafts[chatId] ?? '';

  useEffect(() => {
    ref.current?.focus();
  }, [chatId]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  }, [text]);

  const setText = (v: string) => setDrafts((d) => ({ ...d, [chatId]: v }));

  function submit() {
    const value = text.trim();
    if (!value || value.length > MAX_LENGTH) return;
    onSend(value);
    setText('');
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  }

  const over = text.length > MAX_LENGTH;

  return (
    <div className="composer">
      <div className={`composer__box ${over ? 'is-over' : ''}`}>
        <textarea
          ref={ref}
          rows={1}
          placeholder="Сообщение"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          aria-label="Текст сообщения"
        />
        {text.length > MAX_LENGTH - 300 && (
          <span className="composer__count">
            {text.length}/{MAX_LENGTH}
          </span>
        )}
      </div>
      <button className="send-btn" onClick={submit} disabled={!text.trim() || over} aria-label="Отправить">
        <IconSend />
      </button>
    </div>
  );
}
