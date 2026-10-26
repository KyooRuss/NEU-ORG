import type { ImageSource } from 'expo-image';

// Hami, the NEU-ORG mascot, in the mood that fits what the screen is showing:
// happy for good news, crying when something the student wants isn't there,
// sleepy when it's just quiet, worried when something went wrong or a search
// found nothing.
export type HamiMood = 'happy' | 'crying' | 'sleepy' | 'worried';

export const HAMI_IMAGES: Record<HamiMood, ImageSource> = {
  happy: require('@/assets/images/happy-hami.png'),
  crying: require('@/assets/images/crying-hami.png'),
  sleepy: require('@/assets/images/sleepy-hami.png'),
  worried: require('@/assets/images/worried-hami.png'),
};
