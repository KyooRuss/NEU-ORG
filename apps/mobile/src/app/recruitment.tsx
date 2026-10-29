import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ApplyModal from '@/components/apply-modal';
import BottomNav from '@/components/bottom-nav';
import OptionPickerModal from '@/components/option-picker-modal';
import Pressable from '@/components/pressable';
import { BRAND_GRADIENT } from '@/constants/brand';
import { fetchMyApplyStates, type ApplyState } from '@/lib/applications';
import { fetchOrganizations, type OrgListItem } from '@/lib/organizations';
import { supabase } from '@/lib/supabase';

// Room at the bottom of the page for the navigation bar.
const NAV_SPACE = 110;
// The Category picker's "no filter" choice.
const ALL = '';

// Organizations recruiting right now. Students apply from here; officers
// accept or decline on the web dashboard.
// Styled with StyleSheet so every spacing and color applies the same on web and phones.
export default function RecruitmentScreen() {
  const insets = useSafeAreaInsets();
  const [userId, setUserId] = useState<string | null>(null);
  const [orgs, setOrgs] = useState<OrgListItem[] | null>(null);
  const [states, setStates] = useState<Map<string, ApplyState>>(new Map());
  const [loadError, setLoadError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState(ALL);
  const [pickerOpen, setPickerOpen] = useState(false);
  // The organization whose application form is open.
  const [applyingTo, setApplyingTo] = useState<OrgListItem | null>(null);

  const load = useCallback(async (profileId: string) => {
    const [loadedOrgs, loadedStates] = await Promise.all([
      fetchOrganizations({ recruitingOnly: true }),
      fetchMyApplyStates(profileId),
    ]);
    setOrgs(loadedOrgs);
    setStates(loadedStates);
    setLoadError(false);
  }, []);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.replace('/login');
        return;
      }
      const profileId = data.session.user.id;
      setUserId(profileId);
      load(profileId).catch(() => active && setLoadError(true));
    });

    return () => {
      active = false;
    };
  }, [load]);

  const handleRefresh = useCallback(async () => {
    if (!userId) return;
    setRefreshing(true);
    try {
      await load(userId);
    } catch {
      setLoadError(true);
    } finally {
      setRefreshing(false);
    }
  }, [load, userId]);

  // Every category the recruiting organizations use, A to Z. Categories are
  // free text, so they're compared ignoring case.
  const categoryOptions = useMemo(() => {
    const byKey = new Map<string, string>();
    for (const org of orgs ?? []) {
      for (const name of org.categories) {
        const key = name.trim().toLowerCase();
        if (key && !byKey.has(key)) byKey.set(key, name.trim());
      }
    }
    const names = [...byKey.values()].sort((a, b) => a.localeCompare(b));
    return [{ value: ALL, label: 'All Categories' }, ...names.map((name) => ({ value: name, label: name }))];
  }, [orgs]);

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    const picked = category.toLowerCase();
    return (orgs ?? []).filter((org) => {
      const categories = org.categories.map((name) => name.trim().toLowerCase());
      if (picked && !categories.includes(picked)) return false;
      if (!query) return true;
      return org.name.toLowerCase().includes(query) || categories.some((name) => name.includes(query));
    });
  }, [orgs, search, category]);

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace('/home');
  }

  function emptyText() {
    if (loadError) return "Organizations couldn't load. Check your connection and pull down to try again.";
    if (orgs?.length === 0) return 'No organizations are recruiting right now. Check back soon!';
    return 'No organizations match your search.';
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <LinearGradient {...BRAND_GRADIENT} style={[styles.header, { paddingTop: insets.top + 32 }]}>
        <View style={styles.column}>
          <View style={styles.headerRow}>
            <Pressable onPress={goBack} hitSlop={10} style={styles.back} accessibilityRole="button" accessibilityLabel="Back">
              <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
            </Pressable>
            <Text style={styles.title}>Recruitment</Text>
          </View>
          <View style={styles.searchRow}>
            <View style={styles.searchBox}>
              <Ionicons name="search-outline" size={18} color={MUTED} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search Organization..."
                placeholderTextColor={MUTED}
                returnKeyType="search"
                autoCorrect={false}
                style={styles.searchInput}
                accessibilityLabel="Search organizations"
              />
              {search.length > 0 && (
                <Pressable onPress={() => setSearch('')} hitSlop={8} accessibilityLabel="Clear search">
                  <Ionicons name="close-circle" size={18} color="#A1A1AA" />
                </Pressable>
              )}
            </View>
            <Pressable
              onPress={() => setPickerOpen(true)}
              style={({ pressed }) => [styles.filterButton, category !== ALL && styles.filterActive, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel={`Filter by category: ${category || 'All'}`}>
              <Ionicons name="funnel-outline" size={18} color={category !== ALL ? '#3549D6' : '#3F3F46'} />
            </Pressable>
          </View>
        </View>
      </LinearGradient>

      <FlatList
        data={visible}
        keyExtractor={(org) => org.id}
        renderItem={({ item, index }) => (
          <View style={styles.column}>
            <RecruitRow
              org={item}
              state={states.get(item.id) ?? 'none'}
              first={index === 0}
              last={index === visible.length - 1}
              onOpen={() => router.push({ pathname: '/organization/[id]', params: { id: item.id } })}
              onApply={() => setApplyingTo(item)}
            />
          </View>
        )}
        ListEmptyComponent={
          orgs === null && !loadError ? (
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
        contentContainerStyle={{ paddingTop: 16, paddingBottom: NAV_SPACE + insets.bottom }}
      />

      {pickerOpen && (
        <OptionPickerModal
          title="Category"
          options={categoryOptions}
          selected={category}
          onSelect={(value) => {
            setCategory(value);
            setPickerOpen(false);
          }}
          onClose={() => setPickerOpen(false)}
        />
      )}

      {applyingTo && userId && (
        <ApplyModal
          organizationId={applyingTo.id}
          organizationName={applyingTo.name}
          profileId={userId}
          onApplied={() => {
            setStates((current) => new Map(current).set(applyingTo.id, 'pending'));
            setApplyingTo(null);
          }}
          onClose={() => setApplyingTo(null)}
        />
      )}

      <BottomNav />
    </View>
  );
}

const PILLS: Record<ApplyState, { label: string; background: string; color: string }> = {
  none: { label: 'Apply', background: '#E8EDFD', color: '#3549D6' },
  pending: { label: 'Pending', background: '#FEF3C7', color: '#B45309' },
  member: { label: 'Member', background: '#DCFCE7', color: '#15803D' },
};

type RowProps = {
  org: OrgListItem;
  state: ApplyState;
  first: boolean;
  last: boolean;
  onOpen: () => void;
  onApply: () => void;
};

// One row of the list. The rows join into one white panel with thin lines between.
// The details area and the Apply pill are side by side, not one inside the
// other: on web a pressable button can't contain another button.
function RecruitRow({ org, state, first, last, onOpen, onApply }: RowProps) {
  const pill = PILLS[state];

  return (
    <View style={[styles.row, first && styles.rowFirst, last && styles.rowLast]}>
      <Pressable
        onPress={onOpen}
        style={({ pressed }) => [styles.rowMain, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={`${org.name}, view details`}>
        <Image
          source={org.logoUrl ? { uri: org.logoUrl } : require('@/assets/images/neu-org-logo.png')}
          style={styles.logo}
          contentFit="cover"
          accessibilityIgnoresInvertColors
        />
        <View style={styles.rowText}>
          <Text style={styles.name} numberOfLines={1}>
            {org.name}
          </Text>
          {org.categories.length > 0 && (
            <Text style={styles.categories} numberOfLines={1}>
              {org.categories.join(', ')}
            </Text>
          )}
        </View>
      </Pressable>
      <View style={styles.rowEnd}>
        {state === 'none' ? (
          <Pressable
            onPress={onApply}
            hitSlop={6}
            style={({ pressed }) => [styles.pill, { backgroundColor: pill.background }, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={`Apply to ${org.name}`}>
            <Text style={[styles.pillText, { color: pill.color }]}>{pill.label}</Text>
          </Pressable>
        ) : (
          <View style={[styles.pill, { backgroundColor: pill.background }]}>
            <Text style={[styles.pillText, { color: pill.color }]}>{pill.label}</Text>
          </View>
        )}
        <Pressable
          onPress={onOpen}
          hitSlop={8}
          style={({ pressed }) => pressed && styles.pressed}
          accessibilityRole="button"
          accessibilityLabel={`${org.name}, view details`}>
          <Ionicons name="chevron-forward" size={18} color="#A1A1AA" />
        </Pressable>
      </View>
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

  // Same as the Organizations header: rounded bottom corners, with room
  // between the title and the search row.
  header: { paddingBottom: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  back: { marginLeft: -6, padding: 2 },
  title: { marginLeft: 6, fontFamily: 'Poppins_500Medium', fontSize: 16, color: '#FFFFFF' },
  searchRow: { marginTop: 56, flexDirection: 'row', alignItems: 'center', gap: 10 },
  // A rounded gray search pill with a round filter button beside it.
  searchBox: {
    flex: 1,
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 21,
    backgroundColor: '#E9EAEF',
    paddingHorizontal: 14,
  },
  searchInput: { flex: 1, height: '100%', fontFamily: 'Poppins_400Regular', fontSize: 13, color: INK },
  filterButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
    backgroundColor: '#E9EAEF',
  },
  // Tinted while a category is picked, since the button has no text to show it.
  filterActive: { backgroundColor: '#DCE3FD' },

  list: { flex: 1 },
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
  noticeText: { fontFamily: 'Poppins_400Regular', fontSize: 12, lineHeight: 18, color: MUTED },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEF0F5',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  rowFirst: { borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  rowLast: { borderBottomWidth: 0, borderBottomLeftRadius: 16, borderBottomRightRadius: 16 },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  logo: { width: 48, height: 48, borderRadius: 24 },
  rowText: { flex: 1, marginLeft: 12, marginRight: 8 },
  name: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: INK },
  categories: { marginTop: 2, fontFamily: 'Poppins_400Regular', fontSize: 12, color: MUTED },
  rowEnd: { alignItems: 'flex-end', gap: 6 },
  pill: { minWidth: 64, alignItems: 'center', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 3 },
  pillText: { fontFamily: 'Poppins_600SemiBold', fontSize: 11 },
});
