"use client";

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Paperclip, Smile, Mic, ImageIcon, X, FileText } from 'lucide-react';
import { Attachment } from '@/types/chat';
import Image from 'next/image';

interface ChatInputProps {
  onSendMessage: (message: string, attachments?: Attachment[]) => void;
  disabled?: boolean;
}

export function ChatInput({ onSendMessage, disabled }: ChatInputProps) {
  const [message, setMessage] = useState('');
  // const [isRecording, setIsRecording] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((message.trim() || attachments.length > 0) && !disabled) {
      onSendMessage(message.trim(), attachments.length > 0 ? attachments : undefined);
      setMessage('');
      setAttachments([]);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'document') => {
    const files = e.target.files;
    if (!files) return;

    const newAttachments: Attachment[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert(`File "${file.name}" is too large. Maximum size is 10MB.`);
        continue;
      }

      // Create preview for images
      let preview: string | undefined;
      if (type === 'image' || file.type.startsWith('image/')) {
        preview = await createImagePreview(file);
      }

      const attachment: Attachment = {
        id: `${Date.now()}-${i}`,
        file,
        type: file.type.startsWith('image/') ? 'image' : 'document',
        preview,
        name: file.name,
        size: file.size,
      };

      newAttachments.push(attachment);
    }

    setAttachments(prev => [...prev, ...newAttachments]);
    
    // Reset input
    e.target.value = '';
  };

  const createImagePreview = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        resolve(e.target?.result as string);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const quickReplies = [
    "🩺 Analyze symptoms",
    "❓ How can you help?",
    "🏥 General health info",
    "💊 About medications",
    "🚨 Emergency guidance"
  ];

  return (
    <div className="bg-white/95 backdrop-blur-sm border-t border-gray-200 shadow-lg rounded-sm">
      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.doc,.docx,.txt,.csv,.json"
        onChange={(e) => handleFileSelect(e, 'document')}
        className="hidden"
      />
      <input
        ref={imageInputRef}
        type="file"
        multiple
        accept="image/*"
        onChange={(e) => handleFileSelect(e, 'image')}
        className="hidden"
      />

      {/* Attachment previews */}
      {attachments.length > 0 && (
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="flex flex-wrap gap-2">
            {attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="relative group bg-gray-100 rounded-lg overflow-hidden border border-gray-200"
              >
                {attachment.type === 'image' && attachment.preview ? (
                  <div className="relative w-20 h-20">
                    <Image
                      src={attachment.preview}
                      alt={attachment.name}
                      height={100}
                      width={100}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                  </div>
                ) : (
                  <div className="w-32 h-20 flex flex-col items-center justify-center p-2">
                    <FileText size={24} className="text-blue-500 mb-1" />
                    <span className="text-xs text-gray-600 truncate w-full text-center">
                      {attachment.name}
                    </span>
                    <span className="text-xs text-gray-400">
                      {formatFileSize(attachment.size)}
                    </span>
                  </div>
                )}
                <button
                  onClick={() => removeAttachment(attachment.id)}
                  className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {attachments.length} file{attachments.length > 1 ? 's' : ''} attached
            {attachments.some(a => a.type === 'image') && (
              <span className="ml-2 text-blue-500">• Images will be analyzed for medical context</span>
            )}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="p-4">
        <div className="flex items-end gap-3">
          {/* Action buttons */}
          <div className="flex gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="h-10 w-10 p-0 rounded-full hover:bg-blue-100 transition-colors"
              title="Attach document (PDF, DOC, TXT)"
              disabled={disabled}
            >
              <Paperclip size={18} className="text-gray-500" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => imageInputRef.current?.click()}
              className="h-10 w-10 p-0 rounded-full hover:bg-blue-100 transition-colors"
              title="Attach image (for visual symptom analysis)"
              disabled={disabled}
            >
              <ImageIcon size={18} className="text-gray-500" />
            </Button>
          </div>

          {/* Message input */}
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              value={message}
              onChange={handleTextareaChange}
              onKeyPress={handleKeyPress}
              placeholder={attachments.length > 0 
                ? "Add a description for your attachments... (Press Enter to send)" 
                : "Type your message here... (Press Enter to send, Shift+Enter for new line)"}
              disabled={disabled}
              className="min-h-[44px] max-h-[120px] resize-none rounded-2xl border-2 border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 px-4 py-3 pr-12 bg-gray-50 focus:bg-white transition-all duration-200 text-sm"
              rows={1}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 rounded-full hover:bg-blue-100 transition-colors"
              title="Add emoji"
            >
              <Smile size={16} className="text-gray-500" />
            </Button>
          </div>

          {/* Voice/Send button */}
          <div className="flex gap-1">
            {/* <Button  
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsRecording(!isRecording)}
              className={`h-10 w-10 p-0 rounded-full transition-all duration-200 ${
                isRecording 
                  ? 'bg-red-100 hover:bg-red-200 text-red-600' 
                  : 'hover:bg-blue-100 text-gray-500'
              }`}
              title={isRecording ? "Stop recording" : "Voice message"}
            >
              <Mic size={18} className={isRecording ? 'animate-pulse' : ''} />
            </Button> */}
            <Button 
              type="submit" 
              disabled={(!message.trim() && attachments.length === 0) || disabled}
              size="sm"
              className="h-10 w-10 p-0 rounded-full bg-gradient-to-r from-blue-500 via-indigo-600 to-purple-600 hover:from-blue-600 hover:via-indigo-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg hover:shadow-xl"
              title="Send message"
            >
              <Send size={18} />
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}