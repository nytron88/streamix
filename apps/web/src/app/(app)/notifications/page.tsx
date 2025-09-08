'use client';

import React, { useState } from 'react';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import { NotificationCard } from '@/components/notifications/NotificationCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Bell,
  Trash2,
  RefreshCw,
  Wifi,
  WifiOff,
  Filter
} from 'lucide-react';

export default function NotificationsPage() {
  const {
    notifications,
    connected,
    connecting,
    error,
    isLoading,
    hasLoadedInitial,
    reconnect,
    clearAllNotifications,
    removeNotification,
    fetchNotifications,
  } = useNotifications();

  const [filter, setFilter] = useState<'all' | 'TIP' | 'FOLLOW' | 'SUB'>('all');
  const [isClearing, setIsClearing] = useState(false);

  // Load notifications on page load
  React.useEffect(() => {
    if (!hasLoadedInitial && !isLoading) {
      fetchNotifications(50, 0, filter === 'all' ? undefined : filter);
    }
  }, [hasLoadedInitial, isLoading, filter, fetchNotifications]);

  // Deduplicate notifications by ID and then filter
  const uniqueNotifications = notifications.reduce((acc, notification) => {
    if (!acc.find(n => n.id === notification.id)) {
      acc.push(notification);
    }
    return acc;
  }, [] as typeof notifications);

  const filteredNotifications = uniqueNotifications.filter(notification =>
    filter === 'all' || notification.type === filter
  );

  const getConnectionStatusColor = () => {
    if (connected) return 'text-green-600 dark:text-green-400';
    if (connecting) return 'text-yellow-600 dark:text-yellow-400';
    if (error) return 'text-red-600 dark:text-red-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  const getConnectionStatusText = () => {
    if (connected) return 'Connected';
    if (connecting) return 'Connecting...';
    if (error) return 'Disconnected';
    return 'Not connected';
  };

  const getFilterCounts = () => {
    const counts = {
      all: uniqueNotifications.length,
      TIP: uniqueNotifications.filter(n => n.type === 'TIP').length,
      FOLLOW: uniqueNotifications.filter(n => n.type === 'FOLLOW').length,
      SUB: uniqueNotifications.filter(n => n.type === 'SUB').length,
    };
    return counts;
  };

  const counts = getFilterCounts();

  // Handle clear all notifications
  const handleClearAll = async () => {
    if (isClearing) return;

    setIsClearing(true);
    try {
      const type = filter === 'all' ? undefined : filter;
      await clearAllNotifications(type);
    } catch (error) {
      console.error('Failed to clear notifications:', error);
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Bell className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Notifications
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Real-time updates from your channels
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <div className={`flex items-center space-x-2 ${getConnectionStatusColor()}`}>
            {connected ? (
              <Wifi className="w-4 h-4" />
            ) : (
              <WifiOff className="w-4 h-4" />
            )}
            <span className="text-sm font-medium">
              {getConnectionStatusText()}
            </span>
          </div>
        </div>
      </div>

      {/* Connection Error */}
      {error && (
        <Card className="mb-6 border-red-200 dark:border-red-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <WifiOff className="w-5 h-5 text-red-600 dark:text-red-400" />
                <span className="text-sm text-red-600 dark:text-red-400">
                  Connection error: {error}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={reconnect}
                disabled={connecting}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${connecting ? 'animate-spin' : ''}`} />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Controls */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Filter className="w-5 h-5" />
              <span>Filters & Actions</span>
            </CardTitle>
            <div className="flex items-center space-x-2">
              {error && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={reconnect}
                  disabled={connecting}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reconnect
                </Button>
              )}
              {notifications.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearAll}
                  disabled={isClearing}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {isClearing ? 'Clearing...' : 'Clear All'}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-wrap gap-2">
            {(['all', 'TIP', 'FOLLOW', 'SUB'] as const).map((filterType) => (
              <Button
                key={filterType}
                variant={filter === filterType ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter(filterType)}
                className="flex items-center space-x-2"
              >
                <span className="capitalize">
                  {filterType === 'all' ? 'All' : filterType === 'SUB' ? 'Subscription' : filterType.toLowerCase()}
                </span>
                <Badge variant="secondary" className="ml-1">
                  {counts[filterType]}
                </Badge>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Notifications List */}
      <div className="space-y-4">
        {isLoading ? (
          <Card>
            <CardContent className="p-8 text-center">
              <RefreshCw className="w-8 h-8 text-blue-600 dark:text-blue-400 mx-auto mb-4 animate-spin" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                Loading notifications...
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Fetching your notifications from the database.
              </p>
            </CardContent>
          </Card>
        ) : filteredNotifications.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Bell className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                {filter === 'all' ? 'No notifications yet' : `No ${filter.toLowerCase()} notifications`}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {connected
                  ? "You're all caught up! New notifications will appear here in real-time."
                  : "Loading notifications..."
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {filteredNotifications.map((notification, index) => (
              <React.Fragment key={notification.id}>
                <NotificationCard
                  notification={notification}
                  onRemove={removeNotification}
                />
                {index < filteredNotifications.length - 1 && (
                  <Separator className="my-2" />
                )}
              </React.Fragment>
            ))}
          </>
        )}
      </div>

      {/* Load more placeholder for future */}
      {filteredNotifications.length > 0 && (
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-500">
            Showing {filteredNotifications.length} notification{filteredNotifications.length === 1 ? '' : 's'}
          </p>
        </div>
      )}

    </div>
  );
}
