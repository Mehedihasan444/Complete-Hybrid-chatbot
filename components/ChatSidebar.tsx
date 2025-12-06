"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { MessageSquare, Plus, Search, Trash2, Pin, PinOff, X, Menu, ChevronLeft, ChevronRight, LogOut, User as UserIcon } from 'lucide-react';
import { ConversationListItem } from '@/types/conversation';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth';

interface ChatSidebarProps {
  currentConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  userId: string;
  isOpen: boolean;
  onToggle: () => void;
  isCollapsed: boolean;
  onCollapse: () => void;
}

export function ChatSidebar({
  currentConversationId,
  onSelectConversation,
  onNewChat,
  userId,
  isOpen,
  onToggle,
  isCollapsed,
  onCollapse
}: ChatSidebarProps) {
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const { user, logout } = useAuth();

  useEffect(() => {
    loadConversations();
  }, [userId]);

  const loadConversations = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/conversations?userId=${userId}`);
      const data = await response.json();
      setConversations(data.conversations || []);
    } catch (error) {
      console.error('Failed to load conversations:', error);
      toast.error('Failed to load chat history');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    toast.custom((t) => (
      <div className="bg-white rounded-lg shadow-lg p-4 border border-gray-200">
        <div className="flex flex-col gap-3">
          <p className="font-semibold">Delete this conversation?</p>
          <p className="text-sm text-gray-600">This action cannot be undone.</p>
          <div className="flex gap-2">
            <button
              onClick={async () => {
                toast.dismiss(t);
                try {
                  await fetch(`/api/conversations?id=${id}`, { method: 'DELETE' });
                  setConversations(prev => prev.filter(conv => conv._id !== id));
                  if (currentConversationId === id) {
                    onNewChat();
                  }
                  toast.success('Conversation deleted');
                } catch (error) {
                  toast.error('Failed to delete conversation');
                }
              }}
              className="px-3 py-2 bg-red-500 text-white rounded-md text-sm font-medium hover:bg-red-600 transition"
            >
              Delete
            </button>
            <button
              onClick={() => toast.dismiss(t)}
              className="px-3 py-2 bg-gray-200 text-gray-800 rounded-md text-sm font-medium hover:bg-gray-300 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    ), {
      duration: 10000,
    });
  };

  const handleTogglePin = async (id: string, isPinned: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      await fetch(`/api/conversations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPinned: !isPinned }),
      });
      
      setConversations(prev =>
        prev.map(conv =>
          conv._id === id ? { ...conv, isPinned: !isPinned } : conv
        )
      );
      
      toast.success(isPinned ? 'Unpinned' : 'Pinned');
    } catch (error) {
      toast.error('Failed to update pin status');
    }
  };

  const filteredConversations = conversations.filter(conv =>
    conv.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.preview.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (date: Date) => {
    const now = new Date();
    const messageDate = new Date(date);
    const diffMs = now.getTime() - messageDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return messageDate.toLocaleDateString();
  };

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
  };

  // If collapsed on desktop, show minimal version
  if (isCollapsed && !isOpen) {
    return (
      <>
        {/* Desktop collapsed sidebar */}
        <div className="hidden md:flex w-16 bg-white border-r border-gray-200 flex-col items-center py-4 gap-4 relative z-50">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              console.log('Expand button clicked');
              onCollapse();
            }}
            className="p-2 hover:bg-blue-50 rounded-lg transition-colors"
            title="Expand sidebar"
          >
            <ChevronRight size={20} className="text-blue-600" />
          </Button>
          
          <Button
            onClick={onNewChat}
            variant="ghost"
            size="sm"
            className="p-2 hover:bg-blue-50 rounded-lg"
            title="New Chat"
          >
            <Plus size={20} className="text-blue-600" />
          </Button>

          <div className="flex-1" />

          {user && (
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold cursor-pointer hover:shadow-lg transition-shadow" title={user.name}>
                {user.name.charAt(0).toUpperCase()}
              </div>
            </div>
          )}
        </div>

        {/* Mobile toggle button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className="fixed top-4 left-4 z-50 md:hidden bg-white shadow-lg"
        >
          <Menu size={20} />
        </Button>
      </>
    );
  }

  return (
    <>
      {/* Mobile toggle button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onToggle}
        className="fixed top-4 left-4 z-50 md:hidden bg-white shadow-lg"
      >
        <Menu size={20} />
      </Button>

      {/* Sidebar */}
      <div
        className={cn(
          "fixed md:relative inset-y-0 left-0 z-40 w-80 bg-white border-r border-gray-200 flex flex-col transition-transform duration-300",
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <MessageSquare size={20} className="text-blue-500" />
              Chat History
            </h2>
            <div className="flex items-center gap-1">
              {/* Desktop collapse button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={onCollapse}
                className="hidden md:flex p-1"
                title="Collapse sidebar"
              >
                <ChevronLeft size={18} />
              </Button>
              {/* Mobile close button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggle}
                className="md:hidden p-1"
              >
                <X size={20} />
              </Button>
            </div>
          </div>
          
          <Button
            onClick={() => {
              onNewChat();
              onToggle();
            }}
            className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white"
          >
            <Plus size={16} className="mr-2" />
            New Chat
          </Button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <MessageSquare size={48} className="mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No conversations yet</p>
              <p className="text-xs text-gray-400 mt-1">Start a new chat to begin</p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {filteredConversations.map((conv) => (
                <div
                  key={conv._id}
                  onClick={() => {
                    onSelectConversation(conv._id);
                    onToggle();
                  }}
                  className={cn(
                    "group relative p-3 rounded-lg cursor-pointer transition-all",
                    currentConversationId === conv._id
                      ? "bg-blue-50 border border-blue-200"
                      : "hover:bg-gray-50 border border-transparent"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-semibold text-gray-800 truncate">
                          {conv.title}
                        </h3>
                        {conv.isPinned && (
                          <Pin size={12} className="text-blue-500 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-gray-500 line-clamp-2 mb-1">
                        {conv.preview}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <span>{formatDate(conv.updatedAt)}</span>
                        <span>•</span>
                        <span>{conv.messageCount} messages</span>
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => handleTogglePin(conv._id, conv.isPinned || false, e)}
                        className="p-1 hover:bg-gray-200 rounded transition"
                        title={conv.isPinned ? 'Unpin' : 'Pin'}
                      >
                        {conv.isPinned ? (
                          <PinOff size={14} className="text-gray-600" />
                        ) : (
                          <Pin size={14} className="text-gray-600" />
                        )}
                      </button>
                      <button
                        onClick={(e) => handleDeleteConversation(conv._id, e)}
                        className="p-1 hover:bg-red-100 rounded transition"
                        title="Delete"
                      >
                        <Trash2 size={14} className="text-red-500" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer with User Profile */}
        <div className="border-t border-gray-200 bg-gray-50">
          {user && (
            <div className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold flex-shrink-0">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-800 truncate">{user.name}</p>
                  <p className="text-xs text-gray-500 truncate">{user.email}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="p-2 hover:bg-red-50 rounded-lg"
                  title="Logout"
                >
                  <LogOut size={16} className="text-red-500" />
                </Button>
              </div>
            </div>
          )}
          <div className="px-4 pb-4">
            <p className="text-xs text-gray-500 text-center">
              {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={onToggle}
        />
      )}
    </>
  );
}
