export interface Attachment {
  id: string;
  file: File;
  type: 'image' | 'document';
  preview?: string;  // Base64 preview for images
  name: string;
  size: number;
}

export interface Message {
  id: string;
  content: string | object | any; // Allow for API response objects
  sender: 'user' | 'bot';
  timestamp: Date;
  type?: 'text' | 'image' | 'file' | 'code';
  attachments?: Attachment[];
  reactions?: string[];
  isEdited?: boolean;
}

export interface ChatState {
  messages: Message[];
  isTyping: boolean;
  onlineUsers?: number;
  theme?: 'light' | 'dark';
}

export interface ChatSettings {
  soundEnabled: boolean;
  notificationsEnabled: boolean;
  theme: 'light' | 'dark' | 'auto';
  fontSize: 'small' | 'medium' | 'large';
}