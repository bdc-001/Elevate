import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import axios from 'axios';
import NotificationCenter from './NotificationCenter';

const API = process.env.REACT_APP_BACKEND_URL || '';

export default function NotificationBell() {
  const [showCenter, setShowCenter] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = async () => {
    try {
      const res = await axios.get(`${API}/api/notifications/unread-count`);
      setUnreadCount(res.data.count || 0);
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  };

  useEffect(() => {
    fetchUnreadCount();
    
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const handleBellClick = () => {
    setShowCenter(!showCenter);
  };

  const handleNotificationUpdate = () => {
    fetchUnreadCount();
  };

  return (
    <>
      <div className="relative">
        <button
          onClick={handleBellClick}
          className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          title="Notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex items-center justify-center h-5 min-w-[20px] px-1 text-xs font-semibold text-white bg-red-600 rounded-full">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      </div>

      {showCenter && (
        <NotificationCenter
          isOpen={showCenter}
          onClose={() => setShowCenter(false)}
          onNotificationUpdate={handleNotificationUpdate}
        />
      )}
    </>
  );
}

