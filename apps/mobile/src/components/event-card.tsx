import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatEventDate, formatEventTime, type EventItem } from '@/lib/events';

type Props = {
  event: EventItem;
  // "Members only", "For your college"... or null for everyone.
  audience: string | null;
  // Past events only: whether the student has rated it.
  rating?: 'rated' | 'unrated';
  onPress: () => void;
};

// One event in the Events list: poster on the left, details on the right.
// The whole card is tappable.
export default function EventCard({ event, audience, rating, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`${event.title} by ${event.org.name}, view details`}>
      {event.posterUrl ? (
        <Image source={{ uri: event.posterUrl }} style={styles.poster} contentFit="cover" />
      ) : (
        <View style={[styles.poster, styles.posterEmpty]}>
          <Ionicons name="calendar-outline" size={32} color="#A5B4FC" />
        </View>
      )}

      <View style={styles.body}>
        <View style={styles.orgRow}>
          <Text style={styles.org} numberOfLines={1}>
            {event.org.name}
          </Text>
          {audience && (
            <View style={[styles.badge, audience === 'Members only' ? styles.badgeMembers : styles.badgeColleges]}>
              <Text
                style={[
                  styles.badgeText,
                  audience === 'Members only' ? styles.badgeMembersText : styles.badgeCollegesText,
                ]}>
                {audience}
              </Text>
            </View>
          )}
        </View>
        <Text style={styles.title} numberOfLines={2}>
          {event.title}
        </Text>

        <Detail icon="calendar-outline" text={formatEventDate(event.startsAt)} />
        <Detail icon="time-outline" text={formatEventTime(event.startsAt)} />
        <Detail icon="location-outline" text={event.venue} />

        <View style={styles.footer}>
          {rating === 'rated' && <Text style={styles.rated}>Rated ✓</Text>}
          {rating === 'unrated' && <Text style={styles.rate}>Rate event</Text>}
          <Text style={styles.link}>View Details</Text>
        </View>
      </View>
    </Pressable>
  );
}

function Detail({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.detail}>
      <Ionicons name={icon} size={14} color="#52525B" />
      <Text style={styles.detailText} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

const INK = '#1E2440';
const BLUE = '#3549D6';

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    overflow: 'hidden',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E4E7F2',
    backgroundColor: '#FFFFFF',
    shadowColor: INK,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  pressed: { opacity: 0.75 },
  poster: { width: '38%', minHeight: 150, backgroundColor: '#EEF1FB' },
  posterEmpty: { alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, paddingHorizontal: 12, paddingVertical: 12 },
  orgRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  org: { flexShrink: 1, fontFamily: 'Poppins_500Medium', fontSize: 12, color: BLUE },
  badge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 },
  badgeMembers: { backgroundColor: '#F3E8FF' },
  badgeColleges: { backgroundColor: '#FEF3C7' },
  badgeText: { fontFamily: 'Poppins_500Medium', fontSize: 9 },
  badgeMembersText: { color: '#7E22CE' },
  badgeCollegesText: { color: '#B45309' },
  title: { marginTop: 2, marginBottom: 6, fontFamily: 'Poppins_600SemiBold', fontSize: 15, lineHeight: 21, color: INK },
  detail: { marginTop: 3, flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailText: { flex: 1, fontFamily: 'Poppins_400Regular', fontSize: 12, color: '#3F3F46' },
  footer: { marginTop: 'auto', paddingTop: 8, flexDirection: 'row', alignItems: 'center', gap: 8 },
  rated: { fontFamily: 'Poppins_500Medium', fontSize: 11, color: '#15803D' },
  rate: { fontFamily: 'Poppins_500Medium', fontSize: 11, color: '#B45309' },
  link: {
    marginLeft: 'auto',
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
    color: INK,
    textDecorationLine: 'underline',
  },
});
