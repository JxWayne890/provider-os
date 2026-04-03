import React from 'react';
import { X, Bell, CreditCard, AlertTriangle, Calendar, FileCheck, Check } from 'lucide-react';
import { Notification } from '../types';
import { markNotificationRead, markAllNotificationsRead } from '../services/dataService';

interface NotificationsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: Notification[];
  onUpdate: () => void;
  onNavigate: (link: string) => void;
}

const NotificationsPanel: React.FC<NotificationsPanelProps> = ({ isOpen, onClose, notifications, onUpdate, onNavigate }) => {
  if (!isOpen) return null;

  const unreadCount = notifications.filter(n => !n.read).length;

  const getIcon = (type: string) => {
    switch (type) {
      case 'payment_received': return <CreditCard size={18} className="text-emerald-600" />;
      case 'invoice_overdue': return <AlertTriangle size={18} className="text-red-500" />;
      case 'meeting_soon': return <Calendar size={18} className="text-blue-600" />;
      case 'contract_signed': return <FileCheck size={18} className="text-[#FF9F1C]" />;
      default: return <Bell size={18} className="text-gray-500" />;
    }
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const handleClick = async (n: Notification) => {
    if (!n.read) {
      await markNotificationRead(n.id);
      onUpdate();
    }
    if (n.link) onNavigate(n.link);
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead();
    onUpdate();
  };

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col animate-reveal">
        <div className="p-6 border-b border-[#E2E8F0] flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-serif font-bold text-[#1A1A2E]">Notifications</h2>
            {unreadCount > 0 && (
              <p className="text-xs text-[#64748B] mt-1">{unreadCount} unread</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {unreadCount > 0 && (
              <button onClick={handleMarkAllRead}
                className="text-xs font-bold text-[#FF9F1C] hover:underline flex items-center gap-1">
                <Check size={14} /> Mark all read
              </button>
            )}
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-all">
              <X size={20} className="text-gray-500" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-[#64748B]">
              <Bell size={40} strokeWidth={1.5} className="mb-4 opacity-30" />
              <p className="font-serif italic">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {notifications.map(n => (
                <button key={n.id} onClick={() => handleClick(n)}
                  className={`w-full text-left p-5 hover:bg-gray-50 transition-all flex gap-4 ${!n.read ? 'bg-[#FF9F1C]/5' : ''}`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${!n.read ? 'bg-white shadow-sm' : 'bg-gray-50'}`}>
                    {getIcon(n.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm font-semibold truncate ${!n.read ? 'text-[#1A1A2E]' : 'text-[#64748B]'}`}>{n.title}</p>
                      {!n.read && <span className="w-2 h-2 bg-[#FF9F1C] rounded-full flex-shrink-0 mt-1.5" />}
                    </div>
                    <p className="text-xs text-[#64748B] mt-0.5 line-clamp-2">{n.message}</p>
                    <p className="text-[10px] text-[#64748B]/70 mt-1.5 font-medium">{timeAgo(n.createdAt)}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default NotificationsPanel;
