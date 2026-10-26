import type { ImageSource } from 'expo-image';

import type { NotificationKind } from '@/lib/notifications';

// Hami, the NEU-ORG mascot, on the Home header tells the student about their
// newest unread notification, in the mood that fits it: happy for good news,
// crying for bad news, sleepy when there's nothing new, worried when the
// notifications couldn't load.
export type HamiMood = 'happy' | 'crying' | 'sleepy' | 'worried';

export const HAMI_IMAGES: Record<HamiMood, ImageSource> = {
  happy: require('@/assets/images/happy-hami.png'),
  crying: require('@/assets/images/crying-hami.png'),
  sleepy: require('@/assets/images/sleepy-hami.png'),
  worried: require('@/assets/images/worried-hami.png'),
};

export const HAMI_MOOD_BY_KIND: Record<NotificationKind, HamiMood> = {
  memo: 'happy',
  announcement: 'happy',
  event: 'happy',
  accepted: 'happy',
  reminder: 'happy',
  rate: 'happy',
  declined: 'crying',
};
