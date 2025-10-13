"use client";

import React from 'react';
import { useState, useEffect, useRef } from 'react';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { ChatInput } from '@/components/chat/ChatInput';
import { TypingIndicator } from '@/components/chat/TypingIndicator';
import { generateBotResponse } from '@/lib/chatService';
import { Message } from '@/types/chat';
import { MessageCircle, Sparkles, Users, Settings, Moon, Sun, Volume2, VolumeX, Stethoscope } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MedicalInfoPanel } from '@/components/MedicalInfoPanel';
import { HealthTip } from '@/components/HealthTip';
import { ServerStatusIndicator, ServerStatusCard } from '@/components/ServerStatus';

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [onlineUsers] = useState(1247);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [showMedicalInfo, setShowMedicalInfo] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  useEffect(() => {
    // Add welcome message
    const welcomeMessage: Message = {
      id: '1',
  content: "Hello! 👋 Welcome to our **Hybrid Medical Chatbot**! I'm here to help you with:\n\n• 🩺 **Symptom Analysis** - Describe your symptoms for possible condition identification\n• 🧠 **Medical Questions** - Ask about health conditions, treatments, and medications\n• 📚 **Health Information** - Get educational content about medical topics\n• 🏥 **General Guidance** - Receive health tips and preventive care advice\n\n**⚠️ Important Medical Disclaimer:**\nI provide educational information only and should never replace professional medical advice, diagnosis, or treatment. Always consult with healthcare professionals for medical concerns.\n\nHow can I assist you with your health questions today?",
      sender: 'bot',
      timestamp: new Date()
    };
    setMessages([welcomeMessage]);
  }, []);

  const handleSendMessage = async (content: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      content,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);

    // Play send sound
    if (soundEnabled) {
      // In a real app, you'd play an actual sound file
      console.log('🔊 Message sent sound');
    }
    try {
      const botResponse = await generateBotResponse(content, sessionId);
      
      // Extract session_id from response if available
      if (botResponse.session_id && !sessionId) {
        setSessionId(botResponse.session_id);
        console.log('📝 Session established:', botResponse.session_id);
      }
      
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: botResponse.response || botResponse,
        sender: 'bot',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botMessage]);
      
      // Play receive sound
      if (soundEnabled) {
        console.log('🔊 Message received sound');
      }
    } catch (error) {
      console.error('Error generating bot response:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "I apologize, but I'm having trouble responding right now. 😅 Please try again in a moment!",
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className={`h-screen flex flex-col transition-all duration-500 ${
      darkMode 
        ? 'bg-gradient-to-br from-gray-900 via-blue-900 to-indigo-900' 
        : 'bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100'
    }`}>
      {/* Header */}
      <header className={`backdrop-blur-sm border-b p-4 shadow-lg transition-all duration-300 ${
        darkMode 
          ? 'bg-gray-900/90 border-gray-700' 
          : 'bg-white/90 border-gray-200'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 via-blue-600 to-purple-600 flex items-center justify-center shadow-lg ring-2 ring-white animate-pulse">
              <Stethoscope className="text-white" size={24} />
            </div>
            <div>
              <h1 className={`text-2xl font-bold flex items-center gap-2 ${
                darkMode ? 'text-white' : 'text-gray-800'
              }`}>
                Medical AI Assistant
                <Sparkles className="text-blue-500 animate-spin" size={18} />
                <MessageCircle className="text-green-500" size={16} />
              </h1>
              <div className="flex items-center gap-4 text-sm">
                <p className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
                  Hybrid Medical Chatbot - Symptom Analysis & Health Guidance
                </p>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    <Users size={12} className="inline mr-1" />
                    {onlineUsers.toLocaleString()} online
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Header controls */}
          <div className="flex items-center gap-3">
            {/* Server Status Indicator */}
            <ServerStatusIndicator />
            
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`h-9 w-9 p-0 rounded-full transition-all duration-200 ${
                  darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                }`}
                title={soundEnabled ? "Disable sounds" : "Enable sounds"}
              >
                {soundEnabled ? (
                  <Volume2 size={16} className={darkMode ? 'text-gray-300' : 'text-gray-600'} />
                ) : (
                  <VolumeX size={16} className={darkMode ? 'text-gray-300' : 'text-gray-600'} />
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDarkMode(!darkMode)}
                className={`h-9 w-9 p-0 rounded-full transition-all duration-200 ${
                  darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                }`}
                title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
              >
                {darkMode ? (
                  <Sun size={16} className="text-yellow-500" />
                ) : (
                  <Moon size={16} className="text-gray-600" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowMedicalInfo(true)}
                className={`h-9 w-9 p-0 rounded-full transition-all duration-200 ${
                  darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                }`}
                title="Medical AI Information"
              >
                <Settings size={16} className={darkMode ? 'text-gray-300' : 'text-gray-600'} />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Chat Messages */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto">
          <div className="max-w-4xl mx-auto p-6 space-y-6">
            {/* Health Tip */}
            {messages.length === 1 && (
              <HealthTip className="animate-fade-in" />
            )}
            
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
            {isTyping && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      {/* Chat Input */}
      <div>
        <div className="max-w-4xl mx-auto">
          <ChatInput onSendMessage={handleSendMessage} disabled={isTyping} />
        </div>
      </div>

      {/* Medical Info Panel */}
      <MedicalInfoPanel 
        isOpen={showMedicalInfo} 
        onClose={() => setShowMedicalInfo(false)} 
      />
    </div>
  );
}