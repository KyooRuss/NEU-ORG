import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import BottomNav from '@/components/bottom-nav';
import EventCard from '@/components/event-card';
import OptionPickerModal from '@/components/option-picker-modal';
import Pressable from '@/components/pressable';
import { BRAND_GRADIENT } from '@/constants/brand';
import {
  audienceLabel,
  fetchEventContext,
  fetchEvents,
  type EventContext,
  type EventItem,
  type EventWhen,
} from '@/lib/events';
import { COLLEGES } from '@/lib/assessment';
import { supabase } from '@/lib/supabase';

// Room at the bottom of the page for the navigation bar.
const NAV_SPACE = 110;
// The Filter picker's "no filter" choice.
const ALL = '';
const UNIVERSITY_WIDE = 'University Wide';

// An event belongs to a department when its organization is from there, or
// when the officers made it for that college.
function isForDepartment(event: EventItem, department: string) {
  return event.org.department === department || event.audienceColleges.includes(department);
}

const EMPTY_CONTEXT: EventContext = { memberOrgIds: new Set(), ratedEventIds: new Set(), department: null };

// Approved events, upcoming or past. Events from the student's organizations
// come first. Filter by the organizing department.
// Styled with StyleSheet so every spacing and color applies the same on web and phones.
export default function EventsScreen() {
  const insets = useSafeAreaInsets();
  const [userId, setUserId] = useState<string | null>(null);
  const [when, setWhen] = useState<EventWhen>('upcoming');
  const [events, setEvents] = useState<EventItem[] | null>(null);
  const [context, setContext] = useState<EventContext>(EMPTY_CONTEXT);
  const [loadError, setLoadError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState(ALL);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.replace('/login');
        return;
      }
      setUserId(data.session.user.id);
    });
  }, []);

  // Loads again whenever Upcoming / Past changes.
  useEffect(() => {
    if (!userId) return;
    let active = true;
    Promise.all([fetchEvents(when), fetchEventContext(userId)])
      .then(([loadedEvents, loadedContext]) => {
        if (!active) return;
        setEvents(loadedEvents);
        setContext(loadedContext);
      })
      .catch(() => active && setLoadError(true));
    return () => {
      active = false;
    };
  }, [when, userId]);

  // Coming back from an event's page: pick up a rating the student just sent.
  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      let active = true;
      fetchEventContext(userId)
        .then((loaded) => active && setContext(loaded))
        .catch(() => {
          // Keep what's on screen; pull to refresh tries again.
        });
      return () => {
        active = false;
      };
    }, [userId]),
  );

  const handleRefresh = useCallback(async () => {
    if (!userId) return;
    setRefreshing(true);
    try {
      const [loadedEvents, loadedContext] = await Promise.all([fetchEvents(when), fetchEventContext(userId)]);
      setEvents(loadedEvents);
      setContext(loadedContext);
      setLoadError(false);
    } catch {
      setLoadError(true);
    } finally {
      setRefreshing(false);
    }
  }, [when, userId]);

  // Every school department, whether or not it has events right now. The
  // student's own college comes right after "All".
  const departmentOptions = useMemo(() => {
    const mine = context.department && COLLEGES.includes(context.department) ? context.department : null;
    const rest = [UNIVERSITY_WIDE, ...COLLEGES].filter((name) => name !== mine);
    return [
      { value: ALL, label: 'All Departments' },
      ...(mine ? [{ value: mine, label: `${mine} (Your college)` }] : []),
      ...rest.map((name) => ({ value: name, label: name })),
    ];
  }, [context.department]);

  const sections = useMemo(() => {
    const query = search.trim().toLowerCase();
    const visible = (events ?? []).filter((event) => {
      if (department && !isForDepartment(event, department)) return false;
      if (!query) return true;
      return [event.title, event.org.name, event.venue].some((text) => text.toLowerCase().includes(query));
    });
    const mine = visible.filter((event) => context.memberOrgIds.has(event.org.id));
    const others = visible.filter((event) => !context.memberOrgIds.has(event.org.id));
    return [
      { title: 'My Organizations', data: mine },
      // Without a "mine" section above, a heading for the rest isn't needed.
      { title: mine.length > 0 ? 'Other Organizations' : null, data: others },
    ].filter((section) => section.data.length > 0);
  }, [events, context, search, department]);

  function emptyText() {
    if (loadError) return "Events couldn't load. Check your connection and pull down to try again.";
    if (events?.length === 0) {
      return when === 'upcoming' ? 'No upcoming events yet. Check back soon!' : 'No past events yet.';
    }
    return 'No events match your search.';
  }

  function switchTo(next: EventWhen) {
    if (next === when) return;
    // Show the spinner while the other list loads.
    setEvents(null);
    setLoadError(false);
    setWhen(next);
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <LinearGradient {...BRAND_GRADIENT} style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.column}>
          <Text style={styles.title}>{when === 'upcoming' ? 'Upcoming Events' : 'Past Events'}</Text>
          <View style={styles.searchRow}>
            <View style={styles.searchBox}>
              <Ionicons name="search-outline" size={18} color="#71717A" />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search Event..."
                placeholderTextColor="#A1A1AA"
                returnKeyType="search"
                autoCorrect={false}
                style={styles.searchInput}
                accessibilityLabel="Search events"
              />
              {search.length > 0 && (
                <Pressable onPress={() => setSearch('')} hitSlop={8} accessibilityLabel="Clear search">
                  <Ionicons name="close-circle" size={18} color="#A1A1AA" />
                </Pressable>
              )}
            </View>
            <Pressable
              onPress={() => setPickerOpen(true)}
              style={({ pressed }) => [styles.filterButton, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel={`Filter by department: ${department || 'All'}`}>
              <Text style={styles.filterText} numberOfLines={1}>
                {department ? department.replace(/^College of /, '') : 'Filter'}
              </Text>
              <Ionicons name="caret-down" size={12} color="#3549D6" />
            </Pressable>
          </View>

          <View style={styles.toggle} accessibilityRole="tablist">
            {(['upcoming', 'past'] as const).map((option) => {
              const selected = option === when;
              return (
                <Pressable
                  key={option}
                  onPress={() => switchTo(option)}
                  style={[styles.toggleOption, selected && styles.toggleSelected]}
                  accessibilityRole="tab"
                  accessibilityState={{ selected }}>
                  <Text style={[styles.toggleText, selected && styles.toggleTextSelected]}>
                    {option === 'upcoming' ? 'Upcoming' : 'Past'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </LinearGradient>

      <SectionList
        sections={sections}
        keyExtractor={(event) => event.id}
        renderSectionHeader={({ section }) =>
          section.title ? (
            <View style={styles.column}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <View style={[styles.column, styles.item]}>
            <EventCard
              event={item}
              audience={audienceLabel(item, context.department)}
              rating={when === 'past' ? (context.ratedEventIds.has(item.id) ? 'rated' : 'unrated') : undefined}
              onPress={() => router.push({ pathname: '/event/[id]', params: { id: item.id } })}
            />
          </View>
        )}
        stickySectionHeadersEnabled={false}
        ListEmptyComponent={
          events === null && !loadError ? (
            <ActivityIndicator style={styles.loading} color="#3549D6" />
          ) : (
            <View style={styles.column}>
              <View style={styles.notice}>
                <Text style={styles.noticeText}>{emptyText()}</Text>
              </View>
            </View>
          )
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#3549D6']} tintColor="#3549D6" />
        }
        keyboardShouldPersistTaps="handled"
        style={styles.list}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: NAV_SPACE + insets.bottom }}
      />

      {pickerOpen && (
        <OptionPickerModal
          title="Department"
          options={departmentOptions}
          selected={department}
          onSelect={(value) => {
            setDepartment(value);
            setPickerOpen(false);
          }}
          onClose={() => setPickerOpen(false)}
        />
      )}

      <BottomNav />
    </View>
  );
}

const INK = '#1E2440';
const MUTED = '#71717A';

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#EEF1FB' },
  // Content stays phone-width on tablets instead of stretching across the screen.
  column: { width: '100%', maxWidth: 480, alignSelf: 'center', paddingHorizontal: 20 },
  pressed: { opacity: 0.7 },

  header: { paddingBottom: 16 },
  title: { fontFamily: 'Poppins_600SemiBold', fontSize: 22, color: '#FFFFFF' },
  searchRow: { marginTop: 14, flexDirection: 'row', gap: 8 },
  searchBox: {
    flex: 1,
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
  },
  searchInput: { flex: 1, height: '100%', fontFamily: 'Poppins_400Regular', fontSize: 13, color: INK },
  filterButton: {
    maxWidth: 140,
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
  },
  filterText: { flexShrink: 1, fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: '#3549D6' },
  toggle: {
    marginTop: 12,
    flexDirection: 'row',
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 3,
  },
  toggleOption: { flex: 1, alignItems: 'center', borderRadius: 10, paddingVertical: 7 },
  toggleSelected: { backgroundColor: '#FFFFFF' },
  toggleText: { fontFamily: 'Poppins_500Medium', fontSize: 13, color: '#FFFFFF' },
  toggleTextSelected: { color: '#3549D6' },

  list: { flex: 1 },
  sectionTitle: {
    marginTop: 12,
    marginBottom: 8,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: '#8A8FA3',
  },
  item: { marginBottom: 12 },
  loading: { marginVertical: 24 },
  notice: {
    marginTop: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#D4D4D8',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  noticeText: { fontFamily: 'Poppins_400Regular', fontSize: 12, lineHeight: 18, color: MUTED },
});
