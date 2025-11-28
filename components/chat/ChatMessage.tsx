"use client";

import { useState } from 'react';
import { Message } from '@/types/chat';
import { cn } from '@/lib/utils';
import { Bot, User, Copy, Heart, ThumbsUp, MoreHorizontal, Edit2, FileText, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const [showActions, setShowActions] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [copied, setCopied] = useState(false);

  // Safety check for message object
  if (!message || typeof message !== 'object') {
    return <div className="p-4 text-red-500">Invalid message</div>;
  }

  const isBot = message.sender === 'bot';

  // Ensure message content is always a string
  const messageContent = (() => {
    if (typeof message.content === 'string') {
      return message.content;
    }
    
    // Handle object responses (like from API)
    if (typeof message.content === 'object' && message.content !== null) {
      const content = message.content as any;
      
      // If it's a response object, try to extract the answer/text
      if (content.answer && typeof content.answer === 'string') {
        return content.answer;
      }
      if (content.response && typeof content.response === 'string') {
        return content.response;
      }
      if (content.text && typeof content.text === 'string') {
        return content.text;
      }
      if (content.message && typeof content.message === 'string') {
        return content.message;
      }
      
      // If it's an array, join the elements
      if (Array.isArray(content)) {
        return content.map(item => typeof item === 'string' ? item : String(item)).join('\n');
      }
      
      // For debugging: show the object structure in a readable format
      try {
        // Try to format the object nicely for debugging
        const formatted = JSON.stringify(content, null, 2);
        console.log('ChatMessage: Received object content:', content);
        return `[Debug] Received object response:\n\`\`\`json\n${formatted}\n\`\`\`\n\nPlease check the API response format.`;
      } catch {
        return `[Error] Unable to display response content. Type: ${typeof content}`;
      }
    }
    
    return String(message.content || '[Empty message]');
  })();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(messageContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy text:', error);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatContent = (content: string) => {
    // Type safety check - ensure content is a string
    if (!content || typeof content !== 'string') {
      return content || '';
    }

    // Simple code block detection
    if (content.includes('```')) {
      const parts = content.split('```');
      return parts.map((part, index) => {
        if (index % 2 === 1) {
          const lines = part.split('\n');
          const language = lines[0];
          const code = lines.slice(1).join('\n');
          return (
            <div key={index} className="my-3 rounded-lg overflow-hidden bg-gray-900 border border-gray-700">
              <div className="bg-gray-800 px-4 py-2 text-xs text-gray-300 font-mono flex items-center justify-between">
                <span>{language || 'code'}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopy}
                  className="h-6 px-2 text-gray-400 hover:text-white"
                >
                  <Copy size={12} />
                </Button>
              </div>
              <pre className="p-4 text-sm text-gray-100 font-mono overflow-x-auto">
                <code>{code}</code>
              </pre>
            </div>
          );
        }
        return <span key={index}>{part}</span>;
      });
    }
    return content;
  };
  
  return (
    <div 
      className={cn(
        "group flex items-start gap-3 p-4 rounded-2xl transition-all duration-300 hover:shadow-lg hover:scale-[1.01] relative",
        isBot 
          ? "bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border border-blue-200 hover:border-blue-300" 
          : "bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 border border-emerald-200 hover:border-emerald-300 ml-12"
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className={cn(
        "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center shadow-lg ring-2 ring-white",
        isBot 
          ? "bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 text-white" 
          : "bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-600 text-white"
      )}>
        {isBot ? <Bot size={20} /> : <User size={20} />}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-2">
          <span className={cn(
            "text-sm font-bold",
            isBot ? "text-blue-800" : "text-emerald-800"
          )}>
            {isBot ? '🤖 AI Assistant' : '👤 You'}
          </span>
          <span className="text-xs text-gray-500 font-medium">
            {message.timestamp instanceof Date 
              ? message.timestamp.toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })
              : new Date().toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })
            }
          </span>
          {message.isEdited && (
            <span className="text-xs text-gray-400 italic">(edited)</span>
          )}
        </div>
        
        <div className={cn(
          "text-gray-800 leading-relaxed text-[15px]",
          isBot ? "text-blue-900" : "text-emerald-900"
        )}>
          {formatContent(messageContent)}
        </div>

        {/* Display attachments if present */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {message.attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="bg-white/70 rounded-lg overflow-hidden border border-gray-200 shadow-sm"
              >
                {attachment.type === 'image' && attachment.preview ? (
                  <div className="relative">
                    <img
                      src={attachment.preview}
                      alt={attachment.name}
                      className="max-w-[200px] max-h-[150px] object-cover rounded-lg"
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs px-2 py-1 truncate">
                      {attachment.name}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-2 min-w-[120px]">
                    <FileText size={20} className="text-blue-500 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-700 truncate">
                        {attachment.name}
                      </p>
                      <p className="text-xs text-gray-400">
                        {formatFileSize(attachment.size)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Message reactions */}
        {message.reactions && message.reactions.length > 0 && (
          <div className="flex gap-1 mt-2">
            {message.reactions.map((reaction, index) => (
              <span key={index} className="text-sm bg-white/50 px-2 py-1 rounded-full">
                {reaction}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Message actions */}
      {showActions && (
        <div className="absolute top-2 right-2 flex gap-1 bg-white/90 backdrop-blur-sm rounded-lg p-1 shadow-lg border border-gray-200">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-7 w-7 p-0 hover:bg-blue-100"
            title={copied ? "Copied!" : "Copy message"}
          >
            <Copy size={14} className={copied ? "text-green-600" : "text-gray-600"} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsLiked(!isLiked)}
            className="h-7 w-7 p-0 hover:bg-red-100"
            title="Like message"
          >
            <Heart size={14} className={isLiked ? "text-red-500 fill-current" : "text-gray-600"} />
          </Button>
          {!isBot && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 hover:bg-gray-100"
              title="Edit message"
            >
              <Edit2 size={14} className="text-gray-600" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 hover:bg-gray-100"
            title="More options"
          >
            <MoreHorizontal size={14} className="text-gray-600" />
          </Button>
        </div>
      )}
    </div>
  );
}