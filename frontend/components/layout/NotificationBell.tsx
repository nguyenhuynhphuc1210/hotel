'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Bell, Check, CheckCheck, Loader2, BellOff, X } from 'lucide-react'
import { NotificationResponse } from '@/types/notification.types'
import { useAuthStore } from '@/store/authStore'
import {useNotificationSocket} from '@/hooks/useNotificationSocket'
import notificationApi from '@/lib/api/notification.api';

function parseTs(ts: string): Date {
    if (!ts) return new Date()
    if (!ts.endsWith('Z') && !/[+\-]\d{2}:\d{2}$/.test(ts)) {
        return new Date(ts + 'Z')
    }
    return new Date(ts)
}

// SỬA fmt — chỉ đổi new Date(ts) → parseTs(ts)
function fmt(ts: string) {
    return parseTs(ts).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}

// SỬA timeAgo — chỉ đổi new Date(ts) → parseTs(ts)
function timeAgo(ts: string) {
    if (!ts) return ''
    const diff = Date.now() - parseTs(ts).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'Vừa xong'
    if (mins < 60) return `${mins} phút trước`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs} giờ trước`
    return parseTs(ts).toLocaleDateString('vi-VN')
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotificationResponse[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [markingAll, setMarkingAll] = useState(false)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { user } = useAuthStore()

  // ───── Fetch unread count (lightweight, runs on mount + after changes)
  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await notificationApi.getUnreadCount()
      setUnreadCount(res.data.unreadCount)
    } catch {
      // silent
    }
  }, [])

  // ───── Fetch notification list
  const fetchNotifications = useCallback(async (pageNum = 0, append = false) => {
    setLoading(true)
    try {
      const res = await notificationApi.getMyNotifications(pageNum, 10)
      const { content, last } = res.data
      setNotifications(prev => append ? [...prev, ...content] : content)
      setHasMore(!last)
      setPage(pageNum)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  // ───── Open dropdown → fetch
  useEffect(() => {
    if (open) {
      fetchNotifications(0, false)
    }
  }, [open, fetchNotifications])

  // ───── Initial unread count
  useEffect(() => {
    fetchUnreadCount()
  }, [fetchUnreadCount])

  // ───── Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // ───── WebSocket: push new notification into list
  const handleNewNotification = useCallback((notif: NotificationResponse) => {
    setNotifications(prev => [notif, ...prev])
    setUnreadCount(prev => prev + 1)
  }, [])

  useNotificationSocket(user?.email ?? null, handleNewNotification)

  // ───── Mark one as read
  const markAsRead = async (id: number) => {
    try {
      await notificationApi.markAsRead(id)
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, isRead: true } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch {
      // silent
    }
  }

  // ───── Mark all as read
  const markAllAsRead = async () => {
    setMarkingAll(true)
    try {
      await notificationApi.markAllAsRead()
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
      setUnreadCount(0)
    } catch {
      // silent
    } finally {
      setMarkingAll(false)
    }
  }

  // ───── Load more
  const loadMore = () => {
    if (!loading && hasMore) {
      fetchNotifications(page + 1, true)
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(prev => !prev)}
        className="relative w-9 h-9 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
        aria-label="Thông báo"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 px-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-11 w-[360px] bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Bell size={15} className="text-blue-600" />
              <span className="text-sm font-semibold text-gray-900">Thông báo</span>
              {unreadCount > 0 && (
                <span className="text-xs bg-blue-100 text-blue-700 font-semibold px-1.5 py-0.5 rounded-full">
                  {unreadCount} mới
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  disabled={markingAll}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium px-2 py-1 rounded-md hover:bg-blue-50 transition-colors disabled:opacity-50"
                  title="Đánh dấu tất cả đã đọc"
                >
                  {markingAll
                    ? <Loader2 size={12} className="animate-spin" />
                    : <CheckCheck size={12} />
                  }
                  Đọc tất cả
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-[420px] overflow-y-auto divide-y divide-gray-50">
            {loading && notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2 text-gray-400">
                <Loader2 size={22} className="animate-spin text-blue-400" />
                <span className="text-xs">Đang tải...</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2 text-gray-400">
                <BellOff size={28} className="text-gray-300" />
                <span className="text-sm">Chưa có thông báo nào</span>
              </div>
            ) : (
              <>
                {notifications.map(notif => (
                  <NotificationItem
                    key={notif.id}
                    notif={notif}
                    onMarkRead={markAsRead}
                  />
                ))}

                {/* Load more */}
                {hasMore && (
                  <div className="px-4 py-2.5">
                    <button
                      onClick={loadMore}
                      disabled={loading}
                      className="w-full text-xs text-blue-600 hover:text-blue-700 font-medium py-1.5 rounded-lg hover:bg-blue-50 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      {loading
                        ? <><Loader2 size={12} className="animate-spin" /> Đang tải...</>
                        : 'Xem thêm'
                      }
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ───── Single notification row
function NotificationItem({
  notif,
  onMarkRead,
}: {
  notif: NotificationResponse
  onMarkRead: (id: number) => void
}) {
  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors group cursor-default ${!notif.isRead ? 'bg-blue-50/40' : ''}`}
    >
      {/* Dot */}
      <div className="mt-1.5 shrink-0">
        {notif.isRead
          ? <div className="w-2 h-2 rounded-full bg-gray-200" />
          : <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
        }
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-snug ${notif.isRead ? 'text-gray-600' : 'text-gray-900 font-medium'}`}>
          {notif.title}
        </p>
        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
          {notif.message}
        </p>
        <p className="text-[11px] text-gray-400 mt-1">
          {timeAgo(notif.createdAt)}
        </p>
      </div>

      {/* Mark as read */}
      {!notif.isRead && (
        <button
          onClick={() => onMarkRead(notif.id)}
          className="shrink-0 mt-1 opacity-0 group-hover:opacity-100 p-1 rounded-md text-blue-400 hover:text-blue-600 hover:bg-blue-100 transition-all"
          title="Đánh dấu đã đọc"
        >
          <Check size={13} />
        </button>
      )}
    </div>
  )
}