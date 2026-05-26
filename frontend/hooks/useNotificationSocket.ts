'use client'

import { useEffect, useRef } from 'react'
import { Client, IMessage, StompSubscription } from '@stomp/stompjs'
import SockJS from 'sockjs-client'
import { NotificationResponse } from '@/types/notification.types'

const WS_URL = process.env.NEXT_PUBLIC_SOCKET_URL ?? 'http://localhost:8080/ws/chat'

export function useNotificationSocket(
  userEmail: string | null,
  onNewNotification: (notif: NotificationResponse) => void
) {
  const clientRef = useRef<Client | null>(null)
  const subscriptionRef = useRef<StompSubscription | null>(null)
  const onNewRef = useRef(onNewNotification)

  useEffect(() => {
    onNewRef.current = onNewNotification
  }, [onNewNotification])

  useEffect(() => {
    if (!userEmail) return

    const token = typeof window !== 'undefined'
      ? localStorage.getItem('access_token')
      : null

    if (!token) {
      console.warn('[NotificationSocket] Không tìm thấy token, tạm dừng kết nối WebSocket.')
      return
    }

    const client = new Client({
      webSocketFactory: () => new SockJS(WS_URL) as WebSocket,
      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },
      reconnectDelay: 5000,
      onConnect: () => {
        subscriptionRef.current = client.subscribe(
          '/user/queue/notifications',
          (message: IMessage) => {
            try {
              const notif = JSON.parse(message.body) as NotificationResponse
              onNewRef.current(notif)
            } catch {
              console.warn('[NotificationSocket] Lỗi parse dữ liệu tin nhắn từ Server')
            }
          }
        )
      },
      onStompError: (frame) => {
        console.error('[NotificationSocket] STOMP error:', frame.headers?.message)
      },
      onWebSocketError: (event) => {
        console.error('[NotificationSocket] WebSocket error:', event)
      }
    })

    client.activate()
    clientRef.current = client

    return () => {
      subscriptionRef.current?.unsubscribe()
      subscriptionRef.current = null
      client.deactivate()
      clientRef.current = null
    }
  }, [userEmail])
}