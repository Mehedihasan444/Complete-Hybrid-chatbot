"use client";

import { Bot, Sparkles } from 'lucide-react';

export function TypingIndicator() {
  return (
    <div className="flex items-start gap-3 p-4 rounded-2xl bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border border-blue-200 shadow-md">
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-lg ring-2 ring-white animate-pulse">
        <Bot size={20} />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-sm font-bold text-blue-800 flex items-center gap-1">
            🤖 AI Assistant
            <Sparkles size={12} className="text-blue-500 animate-spin" />
          </span>
          <span className="text-xs text-gray-500 font-medium animate-pulse">is thinking...</span>
        </div>
        
        <div className="flex gap-1 items-center">
          <div className="w-3 h-3 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full animate-bounce shadow-sm" style={{ animationDelay: '0ms' }}></div>
          <div className="w-3 h-3 bg-gradient-to-r from-indigo-400 to-purple-500 rounded-full animate-bounce shadow-sm" style={{ animationDelay: '150ms' }}></div>
          <div className="w-3 h-3 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full animate-bounce shadow-sm" style={{ animationDelay: '300ms' }}></div>
          <span className="ml-2 text-xs text-gray-400 animate-pulse">Generating response...</span>
        </div>
      </div>
    </div>
  );
}