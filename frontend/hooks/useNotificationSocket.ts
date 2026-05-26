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
      ? localStorage.getItem('token') ?? ''
      : ''

    const client = new Client({
      webSocketFactory: () => new SockJS(WS_URL) as WebSocket,
      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },
      reconnectDelay: 5000,
      onConnect: () => {
        subscriptionRef.current = client.subscribe(
          `/topic/notifications/${encodeURIComponent(userEmail)}`,
          (message: IMessage) => {
            try {
              const notif = JSON.parse(message.body) as NotificationResponse
              onNewRef.current(notif)
            } catch {
              // malformed message — ignore
            }
          }
        )
      },
      onStompError: (frame) => {
        console.warn('[NotificationSocket] STOMP error:', frame.headers?.message)
      },
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