'use client';

import { useCallback, useEffect, useState } from 'react';
import { Image as ImageIcon, Link2, LockKeyhole, Play, Save, Trash2, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n';
import {
  MEDIA_SLOT_LEVELS,
  SOCIAL_SLOT_LEVELS,
  mediaSlotUnlockLevel,
  socialNetworkLabels,
  socialSlotUnlockLevel,
  validMediaUrl,
  validSocialUrl,
} from '@/lib/profile-showcase';
import { workoutRepository } from '@/lib/workout/repository';
import type { ProfileMediaItem, ProfileMediaType, ProfileSocialLink, SocialNetwork } from '@/lib/workout/types';

type MediaDraft = Omit<ProfileMediaItem, 'id'>;
type SocialDraft = Omit<ProfileSocialLink, 'id'>;

const emptyMedia = (slot: number): MediaDraft => ({ slot, mediaType: 'image', url: '', title: '', description: '' });
const emptySocial = (slot: number): SocialDraft => ({ slot, network: 'instagram', url: '' });

export function ProfileShowcaseEditor({ onError }: { onError: (message: string) => void }) {
  const { language, tr } = useI18n();
  const [accountLevel, setAccountLevel] = useState(1);
  const [media, setMedia] = useState<MediaDraft[]>(MEDIA_SLOT_LEVELS.map((_, index) => emptyMedia(index + 1)));
  const [social, setSocial] = useState<SocialDraft[]>(SOCIAL_SLOT_LEVELS.map((_, index) => emptySocial(index + 1)));
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState('');
  const [savedKey, setSavedKey] = useState('');

  const load = useCallback(async () => {
    const [showcase, progress] = await Promise.all([
      workoutRepository.loadProfileShowcase(),
      workoutRepository.loadGamification(),
    ]);
    setAccountLevel(progress.level);
    setMedia(MEDIA_SLOT_LEVELS.map((_, index) => {
      const slot = index + 1;
      const item = showcase.mediaItems.find((candidate) => candidate.slot === slot);
      return item ? { slot, mediaType: item.mediaType, url: item.url, title: item.title, description: item.description } : emptyMedia(slot);
    }));
    setSocial(SOCIAL_SLOT_LEVELS.map((_, index) => {
      const slot = index + 1;
      const link = showcase.socialLinks.find((candidate) => candidate.slot === slot);
      return link ? { slot, network: link.network, url: link.url } : emptySocial(slot);
    }));
  }, []);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      workoutRepository.loadProfileShowcase(),
      workoutRepository.loadGamification(),
    ]).then(([showcase, progress]) => {
      if (cancelled) return;
      setAccountLevel(progress.level);
      setMedia(MEDIA_SLOT_LEVELS.map((_, index) => {
        const slot = index + 1;
        const item = showcase.mediaItems.find((candidate) => candidate.slot === slot);
        return item ? { slot, mediaType: item.mediaType, url: item.url, title: item.title, description: item.description } : emptyMedia(slot);
      }));
      setSocial(SOCIAL_SLOT_LEVELS.map((_, index) => {
        const slot = index + 1;
        const link = showcase.socialLinks.find((candidate) => candidate.slot === slot);
        return link ? { slot, network: link.network, url: link.url } : emptySocial(slot);
      }));
    }).catch((error) => {
      if (!cancelled) onError(error instanceof Error ? error.message : language === 'es' ? 'No se pudieron cargar las recompensas del perfil.' : 'Profile rewards could not be loaded.');
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [language, onError]);

  async function saveMedia(item: MediaDraft) {
    if (!validMediaUrl(item.mediaType, item.url)) {
      onError(item.mediaType === 'image'
        ? tr('Usa una URL HTTPS directa terminada en JPG, PNG o WEBP.', 'Use a direct HTTPS URL ending in JPG, PNG or WEBP.')
        : tr('Usa un enlace válido de YouTube.', 'Use a valid YouTube link.'));
      return;
    }
    if (item.title.trim().length < 2) {
      onError(tr('Añade un título de al menos dos caracteres.', 'Add a title of at least two characters.'));
      return;
    }
    await runAction(`media-${item.slot}`, async () => {
      await workoutRepository.saveProfileMediaItem({ ...item, url: item.url.trim(), title: item.title.trim(), description: item.description.trim() });
      await load();
    });
  }

  async function removeMedia(slot: number) {
    await runAction(`media-${slot}`, async () => {
      await workoutRepository.deleteProfileMediaItem(slot);
      await load();
    });
  }

  async function saveSocial(link: SocialDraft) {
    if (!validSocialUrl(link.network, link.url)) {
      onError(tr(`La URL no pertenece a ${socialNetworkLabels[link.network]} o no usa HTTPS.`, `The URL does not belong to ${socialNetworkLabels[link.network]} or does not use HTTPS.`));
      return;
    }
    await runAction(`social-${link.slot}`, async () => {
      await workoutRepository.saveProfileSocialLink({ ...link, url: link.url.trim() });
      await load();
    });
  }

  async function removeSocial(slot: number) {
    await runAction(`social-${slot}`, async () => {
      await workoutRepository.deleteProfileSocialLink(slot);
      await load();
    });
  }

  async function runAction(key: string, action: () => Promise<void>) {
    setBusyKey(key);
    setSavedKey('');
    onError('');
    try {
      await action();
      setSavedKey(key);
    } catch (error) {
      onError(error instanceof Error ? error.message : tr('No se pudo guardar el elemento.', 'The item could not be saved.'));
    } finally {
      setBusyKey('');
    }
  }

  return <section className="profile-wide profile-rewards-editor" aria-labelledby="profile-rewards-title">
    <header>
      <div><Trophy aria-hidden="true" /><span><strong id="profile-rewards-title">{tr('Recompensas de perfil', 'Profile rewards')}</strong><small>{tr('Personaliza tu escaparate al subir de nivel de cuenta.', 'Customize your showcase as your account level increases.')}</small></span></div>
      <span>{tr('Nivel', 'Level')} {accountLevel}</span>
    </header>

    {loading ? <p className="profile-rewards-loading">{tr('Cargando espacios…', 'Loading slots…')}</p> : <>
      <div className="profile-reward-group">
        <div><ImageIcon aria-hidden="true" /><span><strong>{tr('Galería multimedia', 'Media gallery')}</strong><small>{tr('Imágenes HTTPS o vídeos de YouTube. Niveles 3, 6 y 9.', 'HTTPS images or YouTube videos. Levels 3, 6 and 9.')}</small></span></div>
        <div className="profile-media-editor-grid">
          {media.map((item) => {
            const requiredLevel = mediaSlotUnlockLevel(item.slot);
            const locked = accountLevel < requiredLevel;
            const key = `media-${item.slot}`;
            return <article className={locked ? 'profile-reward-slot is-locked' : 'profile-reward-slot'} key={item.slot}>
              <header><span>{tr('Espacio', 'Slot')} {item.slot}</span><strong>{locked ? <><LockKeyhole aria-hidden="true" />{tr('Nivel', 'Level')} {requiredLevel}</> : <>{item.mediaType === 'youtube' ? <Play aria-hidden="true" /> : <ImageIcon aria-hidden="true" />}{tr('Desbloqueado', 'Unlocked')}</>}</strong></header>
              {locked ? <p>{tr(`Se desbloquea al alcanzar el nivel ${requiredLevel}.`, `Unlocks when you reach level ${requiredLevel}.`)}</p> : <>
                <label><span>{tr('Tipo', 'Type')}</span><select value={item.mediaType} onChange={(event) => updateMedia(item.slot, { mediaType: event.target.value as ProfileMediaType })}><option value="image">{tr('Imagen', 'Image')}</option><option value="youtube">YouTube</option></select></label>
                <label><span>URL</span><input type="url" maxLength={500} placeholder={item.mediaType === 'image' ? 'https://…/imagen.webp' : 'https://youtu.be/…'} value={item.url} onChange={(event) => updateMedia(item.slot, { url: event.target.value })} /></label>
                <label><span>{tr('Título', 'Title')}</span><input maxLength={80} value={item.title} onChange={(event) => updateMedia(item.slot, { title: event.target.value })} /></label>
                <label><span>{tr('Descripción', 'Description')}</span><textarea rows={3} maxLength={240} value={item.description} onChange={(event) => updateMedia(item.slot, { description: event.target.value })} /></label>
                <footer>{savedKey === key && <output>{tr('Guardado', 'Saved')}</output>}<Button type="button" size="sm" variant="outline" disabled={busyKey === key || !item.url} onClick={() => void removeMedia(item.slot)}><Trash2 aria-hidden="true" />{tr('Quitar', 'Remove')}</Button><Button type="button" size="sm" disabled={busyKey === key} onClick={() => void saveMedia(item)}><Save aria-hidden="true" />{tr('Guardar', 'Save')}</Button></footer>
              </>}
            </article>;
          })}
        </div>
      </div>

      <div className="profile-reward-group">
        <div><Link2 aria-hidden="true" /><span><strong>{tr('Redes y enlaces', 'Social links')}</strong><small>{tr('Un enlace nuevo en los niveles 2, 4, 6 y 8.', 'One new link at levels 2, 4, 6 and 8.')}</small></span></div>
        <div className="profile-social-editor-grid">
          {social.map((link) => {
            const requiredLevel = socialSlotUnlockLevel(link.slot);
            const locked = accountLevel < requiredLevel;
            const key = `social-${link.slot}`;
            return <article className={locked ? 'profile-reward-slot is-locked' : 'profile-reward-slot'} key={link.slot}>
              <header><span>{tr('Enlace', 'Link')} {link.slot}</span><strong>{locked ? <><LockKeyhole aria-hidden="true" />{tr('Nivel', 'Level')} {requiredLevel}</> : <>{tr('Desbloqueado', 'Unlocked')}</>}</strong></header>
              {locked ? <p>{tr(`Se desbloquea al alcanzar el nivel ${requiredLevel}.`, `Unlocks when you reach level ${requiredLevel}.`)}</p> : <>
                <label><span>{tr('Red social', 'Network')}</span><select value={link.network} onChange={(event) => updateSocial(link.slot, { network: event.target.value as SocialNetwork })}>{Object.entries(socialNetworkLabels).map(([id, label]) => <option value={id} key={id}>{label}</option>)}</select></label>
                <label><span>URL</span><input type="url" maxLength={500} placeholder="https://…" value={link.url} onChange={(event) => updateSocial(link.slot, { url: event.target.value })} /></label>
                <footer>{savedKey === key && <output>{tr('Guardado', 'Saved')}</output>}<Button type="button" size="sm" variant="outline" disabled={busyKey === key || !link.url} onClick={() => void removeSocial(link.slot)}><Trash2 aria-hidden="true" />{tr('Quitar', 'Remove')}</Button><Button type="button" size="sm" disabled={busyKey === key} onClick={() => void saveSocial(link)}><Save aria-hidden="true" />{tr('Guardar', 'Save')}</Button></footer>
              </>}
            </article>;
          })}
        </div>
      </div>
    </>}
  </section>;

  function updateMedia(slot: number, patch: Partial<MediaDraft>) {
    setSavedKey('');
    setMedia((current) => current.map((item) => item.slot === slot ? { ...item, ...patch } : item));
  }

  function updateSocial(slot: number, patch: Partial<SocialDraft>) {
    setSavedKey('');
    setSocial((current) => current.map((item) => item.slot === slot ? { ...item, ...patch } : item));
  }
}
