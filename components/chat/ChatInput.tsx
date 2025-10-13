"use client";

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Paperclip, Smile, Mic, ImageIcon, Settings } from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSendMessage, disabled }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage('');
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

  const quickReplies = [
    "🩺 Analyze symptoms",
    "❓ How can you help?",
    "🏥 General health info",
    "💊 About medications",
    "🚨 Emergency guidance"
  ];
  return (
    <div className="bg-white/95 backdrop-blur-sm border-t border-gray-200 shadow-lg rounded-sm">
      {/* Quick replies */}
      {/* <div className="px-4 py-2 border-b border-gray-100">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {quickReplies.map((reply, index) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              onClick={() => onSendMessage(reply.split(' ').slice(1).join(' '))}
              className="whitespace-nowrap text-xs bg-gradient-to-r from-gray-50 to-gray-100 hover:from-blue-50 hover:to-indigo-50 border-gray-200 hover:border-blue-300 transition-all duration-200"
              disabled={disabled}
            >
              {reply}
            </Button>
          ))}
        </div>
      </div> */}

      <form onSubmit={handleSubmit} className="p-4">
        <div className="flex items-end gap-3">
          {/* Action buttons */}
          <div className="flex gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-10 w-10 p-0 rounded-full hover:bg-blue-100 transition-colors"
              title="Attach file"
            >
              <Paperclip size={18} className="text-gray-500" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-10 w-10 p-0 rounded-full hover:bg-blue-100 transition-colors"
              title="Add image"
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
              placeholder="Type your message here... (Press Enter to send, Shift+Enter for new line)"
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
            <Button
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
            </Button>
            <Button 
              type="submit" 
              disabled={!message.trim() || disabled}
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