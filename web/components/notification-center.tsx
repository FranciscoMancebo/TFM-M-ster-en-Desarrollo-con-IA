'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { Bell, CheckCheck, Heart, MessageCircle } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useI18n } from '@/lib/i18n';
import { workoutRepository } from '@/lib/workout/repository';
import type { AppNotification } from '@/lib/workout/types';

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}

export function NotificationCenter({ onOpenRoutines }: { onOpenRoutines: () => void }) {
  const { language, locale, tr } = useI18n();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const refresh = useCallback(async () => {
    try {
      const [loaded, unreadCount] = await Promise.all([
        workoutRepository.loadNotifications(),
        workoutRepository.countUnreadNotifications(),
      ]);
      setError('');
      setNotifications(loaded.items);
      setHasMore(loaded.hasMore);
      setUnread(unreadCount);
    } catch {
      setError(language === 'es' ? 'No se pudieron cargar las notificaciones.' : 'Notifications could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [language]);

  async function loadMore() {
    setLoadingMore(true);
    try {
      const loaded = await workoutRepository.loadNotifications(notifications.length);
      setNotifications((current) => [...current, ...loaded.items]);
      setHasMore(loaded.hasMore);
    } catch {
      setError(tr('No se pudieron cargar más notificaciones.', 'More notifications could not be loaded.'));
    } finally {
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    const initialTimer = window.setTimeout(() => void refresh(), 0);
    const timer = window.setInterval(() => void refresh(), 45000);
    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(timer);
    };
  }, [refresh]);

  async function readNotification(notification: AppNotification) {
    if (!notification.readAt) {
      setNotifications((current) => current.map((item) => item.id === notification.id ? { ...item, readAt: new Date().toISOString() } : item));
      try {
        await workoutRepository.markNotificationsRead([notification.id]);
        setUnread((current) => Math.max(0, current - 1));
      } catch {
        setError(tr('No se pudo marcar como leída.', 'The notification could not be marked as read.'));
        return;
      }
    }
    setOpen(false);
    onOpenRoutines();
  }

  async function readAll() {
    try {
      await workoutRepository.markNotificationsRead();
      const readAt = new Date().toISOString();
      setNotifications((current) => current.map((notification) => ({ ...notification, readAt: notification.readAt ?? readAt })));
      setUnread(0);
    } catch {
      setError(tr('No se pudieron actualizar las notificaciones.', 'Notifications could not be updated.'));
    }
  }

  return <Popover open={open} onOpenChange={(nextOpen) => { setOpen(nextOpen); if (nextOpen) void refresh(); }}>
    <PopoverTrigger className="notification-trigger" aria-label={unread ? tr(`${unread} notificaciones sin leer`, `${unread} unread notifications`) : tr('Notificaciones', 'Notifications')}>
      <Bell aria-hidden="true" />
      {unread > 0 && <span>{unread > 9 ? '9+' : unread}</span>}
    </PopoverTrigger>
    <PopoverContent className="notification-popover" align="end" sideOffset={10}>
      <header><div><p className="eyebrow">{tr('Actividad', 'Activity')}</p><h2>{tr('Notificaciones', 'Notifications')}</h2></div>{unread > 0 && <button type="button" onClick={() => void readAll()}><CheckCheck aria-hidden="true" />{tr('Leer todas', 'Read all')}</button>}</header>
      <div className="notification-list">
        {error ? <p className="notification-error" role="alert">{error}</p> : loading ? <p className="notification-empty">{tr('Cargando…', 'Loading…')}</p> : notifications.length ? notifications.map((notification) => <button type="button" className={notification.readAt ? 'notification-item' : 'notification-item is-unread'} onClick={() => void readNotification(notification)} key={notification.id}>
          <span className="notification-avatar">{notification.actorAvatar ? <Image src={notification.actorAvatar} alt="" width={36} height={36} unoptimized /> : initials(notification.actorName)}</span>
          <span className="notification-copy"><strong>{notification.actorName}</strong><span>{notification.type === 'routine_like' ? tr('le ha dado like a', 'liked') : tr('ha preguntado en', 'asked a question about')} <b>{notification.routineTitle}</b></span>{notification.questionBody && <small>“{notification.questionBody}”</small>}<time>{formatRelative(notification.createdAt, locale)}</time></span>
          <span className={notification.type === 'routine_like' ? 'notification-kind is-like' : 'notification-kind'}>{notification.type === 'routine_like' ? <Heart aria-hidden="true" fill="currentColor" /> : <MessageCircle aria-hidden="true" />}</span>
        </button>) : <div className="notification-empty"><Bell aria-hidden="true" /><p>{tr('No tienes notificaciones todavía.', 'You do not have any notifications yet.')}</p></div>}
      </div>
      {hasMore && !error && <footer className="notification-pagination"><button type="button" disabled={loadingMore} onClick={() => void loadMore()}>{loadingMore ? tr('Cargando…', 'Loading…') : tr('Cargar anteriores', 'Load earlier')}</button></footer>}
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
