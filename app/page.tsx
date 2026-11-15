"use client";

import React from 'react';
import { useState, useEffect, useRef } from 'react';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { ChatInput } from '@/components/chat/ChatInput';
import { TypingIndicator } from '@/components/chat/TypingIndicator';
import { generateBotResponse, generateBotResponseWithAttachments } from '@/lib/chatService';
import { Message, Attachment } from '@/types/chat';
import { MessageCircle, Sparkles, Settings, Moon, Sun, Stethoscope, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MedicalInfoPanel } from '@/components/MedicalInfoPanel';
import { HealthTip } from '@/components/HealthTip';
import { ServerStatusIndicator } from '@/components/ServerStatus';
import { ChatSidebar } from '@/components/ChatSidebar';
import { LoginModal } from '@/components/auth/LoginModal';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [showMedicalInfo, setShowMedicalInfo] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const { user, isAuthenticated } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Use user ID from auth or default
  const userId = user?.id || 'guest-user';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  useEffect(() => {
    // Load welcome message if no conversation is selected
    if (!currentConversationId) {
      loadWelcomeMessage();
    }
  }, [currentConversationId]);

  const loadWelcomeMessage = () => {
    const welcomeResponse = {
      response: "Hello! 👋 Welcome to our **Hybrid Medical Chatbot**! I'm here to help you with:\n\n## What I Can Help With\n\n• 🩺 **Symptom Analysis** - Describe your symptoms for possible condition identification\n• 🧠 **Medical Questions** - Ask about health conditions, treatments, and medications\n• 📚 **Health Information** - Get educational content about medical topics\n• 🏥 **General Guidance** - Receive health tips and preventive care advice\n\n## Important Medical Disclaimer\n\n⚠️ I provide educational information only and should never replace professional medical advice, diagnosis, or treatment. Always consult with healthcare professionals for medical concerns.\n\nHow can I assist you with your health questions today?",
      queryType: 'greeting' as const,
      processingTime: 0,
      systemUsed: 'Welcome Handler',
      timestamp: new Date().toISOString(),
      session_id: 'welcome',
      conversation_turn: 0
    };

    const welcomeMessage: Message = {
      id: '1',
      content: welcomeResponse,
      sender: 'bot',
      timestamp: new Date()
    };
    setMessages([welcomeMessage]);
  };

  const saveConversationToDb = async () => {
    if (!currentConversationId || messages.length <= 1) return;

    try {
      await fetch(`/api/conversations/${currentConversationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: messages.map(msg => ({
            id: msg.id,
            role: msg.sender === 'user' ? 'user' : 'assistant',
            content: msg.content,
            timestamp: msg.timestamp,
            metadata: msg.sender === 'bot' && typeof msg.content === 'object' ? {
              queryType: msg.content.queryType,
              confidence: msg.content.confidence,
              condition: msg.content.condition,
              sources: msg.content.sources,
              processingTime: msg.content.processingTime
            } : undefined
          }))
        }),
      });
    } catch (error) {
      console.error('Failed to save conversation:', error);
    }
  };

  // Auto-save conversation when messages change
  useEffect(() => {
    if (currentConversationId && messages.length > 1) {
      const timer = setTimeout(() => {
        saveConversationToDb();
      }, 1000); // Debounce saves by 1 second

      return () => clearTimeout(timer);
    }
  }, [messages, currentConversationId]);

  const handleNewChat = async () => {
    try {
      // Save current conversation before creating new one
      if (currentConversationId) {
        await saveConversationToDb();
      }

      // Create new conversation
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId, 
          title: 'New Chat' 
        }),
      });

      const newConv = await response.json();
      setCurrentConversationId(newConv._id);
      setMessages([]);
      setSessionId(null);
      loadWelcomeMessage();
      toast.success('Started new conversation');
    } catch (error) {
      console.error('Failed to create new conversation:', error);
      toast.error('Failed to start new conversation');
    }
  };

  const handleSelectConversation = async (conversationId: string) => {
    try {
      // Save current conversation first
      if (currentConversationId) {
        await saveConversationToDb();
      }

      const response = await fetch(`/api/conversations/${conversationId}`);
      const conversation = await response.json();

      setCurrentConversationId(conversationId);
      
      // Convert stored messages back to Message format
      const loadedMessages: Message[] = conversation.messages.map((msg: any) => ({
        id: msg.id,
        content: msg.content,
        sender: msg.role === 'user' ? 'user' : 'bot',
        timestamp: new Date(msg.timestamp),
        attachments: msg.attachments
      }));

      setMessages(loadedMessages);
      toast.success('Conversation loaded');
    } catch (error) {
      console.error('Failed to load conversation:', error);
      toast.error('Failed to load conversation');
    }
  };

  const handleDeleteMessage = (messageId: string) => {
    setMessages(prev => prev.filter(msg => msg.id !== messageId));
  };

  const handleSendMessage = async (content: string, attachments?: Attachment[]) => {
    // Create new conversation if none exists
    if (!currentConversationId) {
      try {
        const response = await fetch('/api/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            userId, 
            title: content.substring(0, 50) || 'New Chat' 
          }),
        });
        const newConv = await response.json();
        setCurrentConversationId(newConv._id);
      } catch (error) {
        console.error('Failed to create conversation:', error);
      }
    }

    // Create user message with attachments info
    const userMessage: Message = {
      id: Date.now().toString(),
      content: attachments && attachments.length > 0 
        ? content || `[Sent ${attachments.length} attachment${attachments.length > 1 ? 's' : ''}]`
        : content,
      sender: 'user',
      timestamp: new Date(),
      attachments: attachments,
    };

    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);

    try {
      let botResponse;
      
      // Use attachment-aware function if we have attachments
      if (attachments && attachments.length > 0) {
        botResponse = await generateBotResponseWithAttachments(content, attachments, sessionId);
      } else {
        botResponse = await generateBotResponse(content, sessionId);
      }
      
      // Extract session_id from response if available
      if (botResponse.session_id && !sessionId) {
        setSessionId(botResponse.session_id);
        console.log('📝 Session established:', botResponse.session_id);
      }
      
      // Pass full response object for enhanced formatting
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: botResponse,
        sender: 'bot',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botMessage]);
      
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
    <div className="h-screen flex overflow-hidden">
      {/* Chat Sidebar */}
      <ChatSidebar
        currentConversationId={currentConversationId}
        onSelectConversation={handleSelectConversation}
        onNewChat={handleNewChat}
        userId={userId}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        isCollapsed={sidebarCollapsed}
        onCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main Chat Area */}
      <div 
        className={`flex-1 flex flex-col transition-all duration-500 ${
          darkMode 
            ? 'bg-gradient-to-br from-gray-900 via-blue-900 to-indigo-900' 
            : 'bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100'
        }`}
        style={{
          backgroundImage: darkMode ? 'none' : 'url(/assets/robot.jpg)',
          backgroundSize: '600px auto',
          backgroundPosition: 'center center',
          backgroundRepeat: 'no-repeat',
          backgroundBlendMode: 'overlay',
          backgroundAttachment: 'fixed'
        }}
      >
        {/* Overlay for better readability */}
        <div className="absolute inset-0 dark:bg-gray-900/80"></div>
        
        {/* Content wrapper with higher z-index */}
        <div className="relative z-10 h-full flex flex-col">
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
                  </div>
                </div>
              </div>

              {/* Header controls */}
              <div className="flex items-center gap-3">
                {/* Server Status Indicator */}
                <ServerStatusIndicator />
                
                <div className="flex items-center gap-2">
                  {!isAuthenticated && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowLoginModal(true)}
                      className="h-9 px-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all duration-200"
                    >
                      <LogIn size={16} className="mr-2" />
                      Login
                    </Button>
                  )}
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
                  <ChatMessage key={message.id} message={message} onDelete={handleDeleteMessage} />
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
      </div>

      {/* Login Modal */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSuccess={() => {
          toast.success(`Welcome back${user?.name ? ', ' + user.name : ''}!`);
        }}
      />
    </div>
  );
}
