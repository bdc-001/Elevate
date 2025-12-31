import React, { useState, useEffect } from 'react';
import { X, Filter, CheckCheck, Archive, ExternalLink, Clock, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const API = process.env.REACT_APP_BACKEND_URL || '';

const SEVERITY_CONFIG = {
  Critical: {
    icon: AlertCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
  },
  High: {
    icon: AlertTriangle,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
  },
  Normal: {
    icon: Info,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
  },
  Info: {
    icon: Info,
    color: 'text-slate-600',
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-200',
  },
};

export default function NotificationCenter({ isOpen, onClose, onNotificationUpdate }) {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: 'all',
    severity: 'all',
    module: 'all',
  });

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.status !== 'all') params.status = filters.status;
      if (filters.severity !== 'all') params.severity = filters.severity;
      if (filters.module !== 'all') params.module = filters.module;

      const res = await axios.get(`${API}/api/notifications`, { params });
      setNotifications(res.data);
    } catch (error) {
      console.error('Failed to load notifications:', error);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen, filters]);

  const markAsRead = async (id) => {
    try {
      await axios.put(`${API}/api/notifications/${id}/mark-read`);
      loadNotifications();
      onNotificationUpdate?.();
    } catch (error) {
      toast.error('Failed to mark as read');
    }
  };

  const markAsUnread = async (id) => {
    try {
      await axios.put(`${API}/api/notifications/${id}/mark-unread`);
      loadNotifications();
      onNotificationUpdate?.();
    } catch (error) {
      toast.error('Failed to mark as unread');
    }
  };

  const archiveNotification = async (id) => {
    try {
      await axios.put(`${API}/api/notifications/${id}/archive`);
      loadNotifications();
      onNotificationUpdate?.();
      toast.success('Notification archived');
    } catch (error) {
      toast.error('Failed to archive notification');
    }
  };

  const markAllAsRead = async () => {
    try {
      const res = await axios.put(`${API}/api/notifications/mark-all-read`);
      toast.success(`${res.data.count} notifications marked as read`);
      loadNotifications();
      onNotificationUpdate?.();
    } catch (error) {
      toast.error('Failed to mark all as read');
    }
  };

  const handleNotificationClick = async (notification) => {
    // Mark as read if unread
    if (notification.status === 'Unread') {
      await markAsRead(notification.id);
    }

    // Navigate to the entity if CTA URL exists
    if (notification.cta_url) {
      onClose();
      navigate(notification.cta_url);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (!isOpen) return null;

  const unreadCount = notifications.filter(n => n.status === 'Unread').length;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/20 z-40" 
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed top-0 right-0 h-full w-full md:w-[480px] bg-white shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-blue-600 to-purple-600">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-white">Notifications</h2>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 text-xs font-semibold text-blue-600 bg-white rounded-full">
                {unreadCount} new
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Filters */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-4 w-4 text-slate-600" />
            <span className="text-sm font-medium text-slate-700">Filter by:</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="text-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Status</option>
              <option value="Unread">Unread</option>
              <option value="Read">Read</option>
              <option value="Archived">Archived</option>
            </select>

            <select
              value={filters.severity}
              onChange={(e) => setFilters({ ...filters, severity: e.target.value })}
              className="text-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Severity</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Normal">Normal</option>
              <option value="Info">Info</option>
            </select>

            <select
              value={filters.module}
              onChange={(e) => setFilters({ ...filters, module: e.target.value })}
              className="text-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Modules</option>
              <option value="Customer">Customer</option>
              <option value="Activity">Activity</option>
              <option value="Risk">Risk</option>
              <option value="Opportunity">Opportunity</option>
              <option value="Task">Task</option>
              <option value="Document">Document</option>
              <option value="Report">Report</option>
              <option value="System">System</option>
            </select>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 border border-blue-200 rounded-lg transition-colors"
            >
              <CheckCheck className="h-4 w-4" />
              Mark all as read
            </button>
          )}
        </div>

        {/* Notification List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <Info className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-700 mb-2">No notifications</h3>
              <p className="text-sm text-slate-500">
                {filters.status !== 'all' || filters.severity !== 'all' || filters.module !== 'all'
                  ? 'Try adjusting your filters'
                  : "You're all caught up!"}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {notifications.map((notification) => {
                const severityConfig = SEVERITY_CONFIG[notification.severity] || SEVERITY_CONFIG.Info;
                const SeverityIcon = severityConfig.icon;
                const isUnread = notification.status === 'Unread';

                return (
                  <div
                    key={notification.id}
                    className={`px-6 py-4 hover:bg-slate-50 transition-colors ${
                      isUnread ? 'bg-blue-50/30 border-l-4 border-l-blue-600' : ''
                    }`}
                  >
                    <div className="flex gap-3">
                      {/* Severity Icon */}
                      <div className={`flex-shrink-0 w-10 h-10 ${severityConfig.bgColor} ${severityConfig.borderColor} border rounded-lg flex items-center justify-center`}>
                        <SeverityIcon className={`h-5 w-5 ${severityConfig.color}`} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h4 className={`text-sm font-semibold ${isUnread ? 'text-slate-900' : 'text-slate-700'}`}>
                            {notification.title}
                          </h4>
                          <div className="flex items-center gap-1 text-xs text-slate-500">
                            <Clock className="h-3 w-3" />
                            {formatDate(notification.created_at)}
                          </div>
                        </div>

                        <p className="text-sm text-slate-600 mb-2">
                          {notification.message}
                        </p>

                        {notification.entity_name && (
                          <div className="inline-flex items-center px-2 py-1 text-xs font-medium text-slate-700 bg-slate-100 rounded mb-2">
                            {notification.entity_name}
                          </div>
                        )}

                        <div className="flex items-center gap-2 mt-3">
                          {notification.cta_text && notification.cta_url && (
                            <button
                              onClick={() => handleNotificationClick(notification)}
                              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                            >
                              {notification.cta_text}
                              <ExternalLink className="h-3 w-3" />
                            </button>
                          )}

                          {isUnread ? (
                            <button
                              onClick={() => markAsRead(notification.id)}
                              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors"
                            >
                              Mark read
                            </button>
                          ) : (
                            <button
                              onClick={() => markAsUnread(notification.id)}
                              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors"
                            >
                              Mark unread
                            </button>
                          )}

                          <button
                            onClick={() => archiveNotification(notification.id)}
                            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors"
                            title="Archive"
                          >
                            <Archive className="h-4 w-4" />
                          </button>
                        </div>

                        {/* Module Badge */}
                        <div className="mt-2">
                          <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium text-blue-700 bg-blue-100 rounded">
                            {notification.module}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

