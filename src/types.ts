export interface Credentials {
  apiUrl: string;
  idInstance: string;
  apiTokenInstance: string;
}

export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface Message {
  /** Local id; equals idMessage once GREEN-API has accepted the message */
  id: string;
  idMessage?: string;
  text: string;
  direction: 'in' | 'out';
  /** Unix time in milliseconds */
  timestamp: number;
  status?: MessageStatus;
  error?: string;
}

export interface Chat {
  /** MAX chatId returned by checkAccount (numeric id, not the phone number) */
  chatId: string;
  phone?: string;
  name?: string;
  messages: Message[];
  unread: number;
  updatedAt: number;
}
