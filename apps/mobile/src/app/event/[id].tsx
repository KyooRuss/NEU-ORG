import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import FeedbackModal from '@/components/feedback-modal';
import PhotoViewerModal from '@/components/photo-viewer-modal';
import Pressable from '@/components/pressable';
import { BRAND_GRADIENT } from '@/constants/brand';
import {
  audienceLabel,
  fetchEvent,
  fetchEventContext,
  formatEventDate,
  formatEventTimeRange,
  hasEnded,
  type EventItem,
} from '@/lib/events';
import { supabase } from '@/lib/supabase';

// One event's full details, opened from the Events list.
// Styled with StyleSheet so every spacing and color applies the same on web and phones.
export default function EventScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  // undefined while loading, null when it doesn't exist (or isn't public).
  const [event, setEvent] = useState<EventItem | null | undefined>(undefined);
  const [loadError, setLoadError] = useState(false);
  const [department, setDepartment] = useState<string | null>(null);
  const [posterOpen, setPosterOpen] = useState(false);
  // Whether the student has rated this event; null until it loads.
  const [rated, setRated] = useState<boolean | null>(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  useEffect(() => {
    let active = true;
    fetchEvent(id)
      .then((loaded) => active && setEvent(loaded))
      .catch(() => active && setLoadError(true));
    supabase.auth.getSession().then(({ data }) => {
      const profileId = data.session?.user.id;
      if (!profileId) return;
      fetchEventContext(profileId)
        .then((context) => {
          if (!active) return;
          setDepartment(context.department);
          setRated(context.ratedEventIds.has(id));
        })
        .catch(() => {
          // The page still works without it; only the college badge is less specific.
        });
    });
    return () => {
      active = false;
    };
  }, [id]);

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace('/events');
  }

  const header = (
    <LinearGradient {...BRAND_GRADIENT} style={[styles.header, { paddingTop: insets.top + 12 }]}>
      <View style={[styles.column, styles.headerRow]}>
        <Pressable onPress={goBack} hitSlop={10} style={styles.back} accessibilityRole="button" accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.headerTitle}>Event Details</Text>
      </View>
    </LinearGradient>
  );

  if (!event) {
    return (
      <View style={styles.screen}>
        <StatusBar style="light" />
        {header}
        <View style={[styles.column, styles.body]}>
          {event === undefined && !loadError ? (
            <ActivityIndicator style={styles.loading} color="#3549D6" />
          ) : (
            <View style={styles.notice}>
              <Text style={styles.noticeText}>
                {loadError
                  ? "This event couldn't load. Check your connection and try again."
                  : 'This event is no longer available.'}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  }

  const ended = hasEnded(event);
  const audience = audienceLabel(event, department);

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      {header}
      <ScrollView contentContainerStyle={[styles.column, styles.body, { paddingBottom: insets.bottom + 32 }]}>
        {event.posterUrl && (
          <Pressable
            onPress={() => setPosterOpen(true)}
            style={({ pressed }) => [styles.posterCard, pressed && styles.pressed]}
            accessibilityRole="imagebutton"
            accessibilityLabel="Open event poster">
            <Image source={{ uri: event.posterUrl }} style={styles.poster} contentFit="cover" />
          </Pressable>
        )}

        <View style={styles.card}>
          <Pressable
            onPress={() => event.org.id && router.push({ pathname: '/organization/[id]', params: { id: event.org.id } })}
            style={({ pressed }) => [styles.orgChip, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={`Open ${event.org.name}`}>
            <Image
              source={event.org.logoUrl ? { uri: event.org.logoUrl } : require('@/assets/images/neu-org-logo.png')}
              style={styles.orgLogo}
              contentFit="cover"
            />
            <Text style={styles.orgName} numberOfLines={1}>
              {event.org.name}
            </Text>
            <Ionicons name="chevron-forward" size={14} color="#3549D6" />
          </Pressable>

          <Text style={styles.title}>{event.title}</Text>

          <View style={styles.tags}>
            {ended && (
              <View style={[styles.tag, styles.tagEnded]}>
                <Text style={[styles.tagText, styles.tagEndedText]}>Ended</Text>
              </View>
            )}
            {audience && (
              <View style={[styles.tag, audience === 'Members only' ? styles.tagMembers : styles.tagColleges]}>
                <Text
                  style={[
                    styles.tagText,
                    audience === 'Members only' ? styles.tagMembersText : styles.tagCollegesText,
                  ]}>
                  {audience}
                </Text>
              </View>
            )}
          </View>

          <Detail icon="calendar-outline" text={formatEventDate(event.startsAt)} />
          <Detail icon="time-outline" text={formatEventTimeRange(event)} />
          <Detail icon="location-outline" text={event.venue} />
          {event.audience === 'colleges' && event.audienceColleges.length > 0 && (
            <Detail icon="school-outline" text={event.audienceColleges.join(', ')} />
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>About this Event</Text>
          <Text style={styles.paragraph}>{event.description}</Text>
        </View>

        {!ended && event.registrationUrl && (
          <Pressable
            onPress={() => Linking.openURL(event.registrationUrl!)}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
            accessibilityRole="link">
            <Ionicons name="open-outline" size={18} color="#FFFFFF" />
            <Text style={styles.primaryText}>Register</Text>
          </Pressable>
        )}

        {ended &&
          rated !== null &&
          (rated ? (
            <View style={styles.thanks}>
              <Ionicons name="checkmark-circle" size={20} color="#15803D" />
              <Text style={styles.thanksText}>Thanks for your feedback!</Text>
            </View>
          ) : (
            <Pressable
              onPress={() => setFeedbackOpen(true)}
              style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
              accessibilityRole="button">
              <Ionicons name="star-outline" size={18} color="#FFFFFF" />
              <Text style={styles.primaryText}>Rate this Event</Text>
            </Pressable>
          ))}
      </ScrollView>

      {feedbackOpen && (
        <FeedbackModal
          eventId={event.id}
          eventTitle={event.title}
          onSent={() => {
            setRated(true);
            setFeedbackOpen(false);
          }}
          onClose={() => setFeedbackOpen(false)}
        />
      )}

      {posterOpen && event.posterUrl && (
        <PhotoViewerModal urls={[event.posterUrl]} startIndex={0} onClose={() => setPosterOpen(false)} />
      )}
    </View>
  );
}

function Detail({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.detail}>
      <Ionicons name={icon} size={16} color="#3549D6" />
      <Text style={styles.detailText}>{text}</Text>
    </View>
  );
}

const INK = '#1E2440';
const MUTED = '#52525B';
const BLUE = '#3549D6';

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#EEF1FB' },
  // Content stays phone-width on tablets instead of stretching across the screen.
  column: { width: '100%', maxWidth: 480, alignSelf: 'center', paddingHorizontal: 20 },
  pressed: { opacity: 0.75 },

  header: { paddingBottom: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  back: { marginLeft: -6, padding: 2 },
  headerTitle: { marginLeft: 6, fontFamily: 'Poppins_600SemiBold', fontSize: 18, color: '#FFFFFF' },

  body: { paddingTop: 16, gap: 14 },
  loading: { marginVertical: 24 },
  notice: {
    borderRadius: 18,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#D4D4D8',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  noticeText: { fontFamily: 'Poppins_400Regular', fontSize: 12, lineHeight: 18, color: '#71717A' },

  posterCard: {
    overflow: 'hidden',
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    shadowColor: INK,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  poster: { width: '100%', aspectRatio: 4 / 5 },

  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E4E7F2',
    backgroundColor: '#FFFFFF',
    padding: 16,
    shadowColor: INK,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  orgChip: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    backgroundColor: '#EEF1FB',
    paddingLeft: 4,
    paddingRight: 10,
    paddingVertical: 4,
  },
  orgLogo: { width: 24, height: 24, borderRadius: 12 },
  orgName: { flexShrink: 1, fontFamily: 'Poppins_500Medium', fontSize: 12, color: BLUE },
  title: { marginTop: 10, fontFamily: 'Poppins_600SemiBold', fontSize: 20, lineHeight: 28, color: INK },
  tags: { marginTop: 6, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  tagText: { fontFamily: 'Poppins_500Medium', fontSize: 11 },
  tagEnded: { backgroundColor: '#F4F4F5' },
  tagEndedText: { color: '#52525B' },
  tagMembers: { backgroundColor: '#F3E8FF' },
  tagMembersText: { color: '#7E22CE' },
  tagColleges: { backgroundColor: '#FEF3C7' },
  tagCollegesText: { color: '#B45309' },
  detail: { marginTop: 8, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  detailText: { flex: 1, fontFamily: 'Poppins_400Regular', fontSize: 13, lineHeight: 19, color: MUTED },

  cardTitle: { marginBottom: 8, fontFamily: 'Poppins_600SemiBold', fontSize: 16, color: INK },
  paragraph: { fontFamily: 'Poppins_400Regular', fontSize: 13, lineHeight: 21, color: MUTED },

  primaryButton: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 999,
    backgroundColor: '#1E3A8A',
  },
  primaryText: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: '#FFFFFF' },
  thanks: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    backgroundColor: '#DCFCE7',
    paddingVertical: 14,
  },
  thanksText: { fontFamily: 'Poppins_500Medium', fontSize: 13, color: '#15803D' },
});
