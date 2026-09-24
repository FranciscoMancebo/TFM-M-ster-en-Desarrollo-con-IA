'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bell, CheckCheck, Heart, MessageCircle } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useI18n } from '@/lib/i18n';
import { workoutRepository } from '@/lib/workout/repository';
import type { AppNotification } from '@/lib/workout/types';

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}

export function NotificationCenter({ onOpenRoutines }: { onOpenRoutines: () => void }) {
  const { locale, tr } = useI18n();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const unread = useMemo(() => notifications.filter((notification) => !notification.readAt).length, [notifications]);

  const refresh = useCallback(async () => {
    try {
      setNotifications(await workoutRepository.loadNotifications());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 45000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  async function readNotification(notification: AppNotification) {
    if (!notification.readAt) {
      setNotifications((current) => current.map((item) => item.id === notification.id ? { ...item, readAt: new Date().toISOString() } : item));
      await workoutRepository.markNotificationsRead([notification.id]);
    }
    setOpen(false);
    onOpenRoutines();
  }

  async function readAll() {
    await workoutRepository.markNotificationsRead();
    const readAt = new Date().toISOString();
    setNotifications((current) => current.map((notification) => ({ ...notification, readAt: notification.readAt ?? readAt })));
  }

  return <Popover open={open} onOpenChange={(nextOpen) => { setOpen(nextOpen); if (nextOpen) void refresh(); }}>
    <PopoverTrigger className="notification-trigger" aria-label={unread ? tr(`${unread} notificaciones sin leer`, `${unread} unread notifications`) : tr('Notificaciones', 'Notifications')}>
      <Bell aria-hidden="true" />
      {unread > 0 && <span>{unread > 9 ? '9+' : unread}</span>}
    </PopoverTrigger>
    <PopoverContent className="notification-popover" align="end" sideOffset={10}>
      <header><div><p className="eyebrow">{tr('Actividad', 'Activity')}</p><h2>{tr('Notificaciones', 'Notifications')}</h2></div>{unread > 0 && <button type="button" onClick={() => void readAll()}><CheckCheck aria-hidden="true" />{tr('Leer todas', 'Read all')}</button>}</header>
      <div className="notification-list">
        {loading ? <p className="notification-empty">{tr('Cargando…', 'Loading…')}</p> : notifications.length ? notifications.map((notification) => <button type="button" className={notification.readAt ? 'notification-item' : 'notification-item is-unread'} onClick={() => void readNotification(notification)} key={notification.id}>
          <span className="notification-avatar">{notification.actorAvatar ? <img src={notification.actorAvatar} alt="" /> : initials(notification.actorName)}</span>
          <span className="notification-copy"><strong>{notification.actorName}</strong><span>{notification.type === 'routine_like' ? tr('le ha dado like a', 'liked') : tr('ha preguntado en', 'asked a question about')} <b>{notification.routineTitle}</b></span>{notification.questionBody && <small>“{notification.questionBody}”</small>}<time>{formatRelative(notification.createdAt, locale)}</time></span>
          <span className={notification.type === 'routine_like' ? 'notification-kind is-like' : 'notification-kind'}>{notification.type === 'routine_like' ? <Heart aria-hidden="true" fill="currentColor" /> : <MessageCircle aria-hidden="true" />}</span>
        </button>) : <div className="notification-empty"><Bell aria-hidden="true" /><p>{tr('No tienes notificaciones todavía.', 'You do not have any notifications yet.')}</p></div>}
      </div>
    </PopoverContent>
  </Popover>;
}

function formatRelative(value: string, locale: string) {
  const elapsedMinutes = Math.round((new Date(value).getTime() - Date.now()) / 60000);
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  if (Math.abs(elapsedMinutes) < 60) return formatter.format(elapsedMinutes, 'minute');
  const elapsedHours = Math.round(elapsedMinutes / 60);
  if (Math.abs(elapsedHours) < 24) return formatter.format(elapsedHours, 'hour');
  return formatter.format(Math.round(elapsedHours / 24), 'day');
}
