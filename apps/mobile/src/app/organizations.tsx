import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import BottomNav from '@/components/bottom-nav';
import OptionPickerModal from '@/components/option-picker-modal';
import OrgListCard from '@/components/org-list-card';
import { BRAND_GRADIENT } from '@/constants/brand';
import { fetchOrganizations, type OrgListItem } from '@/lib/organizations';
import { supabase } from '@/lib/supabase';

// Room at the bottom of the page for the navigation bar.
const NAV_SPACE = 110;
// The Category picker's "no filter" choice.
const ALL = '';

// Browse every active organization, with search and a category filter.
// Styled with StyleSheet so every spacing and color applies the same on web and phones.
export default function OrganizationsScreen() {
  const insets = useSafeAreaInsets();
  const [orgs, setOrgs] = useState<OrgListItem[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState(ALL);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.replace('/login');
        return;
      }
      fetchOrganizations()
        .then((loaded) => active && setOrgs(loaded))
        .catch(() => active && setLoadError(true));
    });

    return () => {
      active = false;
    };
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      setOrgs(await fetchOrganizations());
      setLoadError(false);
    } catch {
      setLoadError(true);
    } finally {
      setRefreshing(false);
    }
  }, []);

  // Every category any organization uses, A to Z. Categories are free text, so
  // they're compared ignoring case.
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
      return (
        org.name.toLowerCase().includes(query) ||
        (org.description ?? '').toLowerCase().includes(query) ||
        categories.some((name) => name.includes(query))
      );
    });
  }, [orgs, search, category]);

  function emptyText() {
    if (loadError) return "Organizations couldn't load. Check your connection and pull down to try again.";
    if (orgs?.length === 0) return 'No organizations yet. Check back soon!';
    return 'No organizations match your search.';
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <LinearGradient {...BRAND_GRADIENT} style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.column}>
          <Text style={styles.title}>Organizations</Text>
          <View style={styles.searchRow}>
            <View style={styles.searchBox}>
              <Ionicons name="search-outline" size={18} color="#71717A" />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search Organization..."
                placeholderTextColor="#A1A1AA"
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
              style={({ pressed }) => [styles.categoryButton, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel={`Category: ${category || 'All'}`}>
              <Text style={styles.categoryText} numberOfLines={1}>
                {category || 'Category'}
              </Text>
              <Ionicons name="caret-down" size={12} color="#3549D6" />
            </Pressable>
          </View>
        </View>
      </LinearGradient>

      <FlatList
        data={visible}
        keyExtractor={(org) => org.id}
        renderItem={({ item }) => (
          <View style={styles.column}>
            <OrgListCard
              org={item}
              onPress={() => router.push({ pathname: '/organization/[id]', params: { id: item.id } })}
            />
          </View>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
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
        contentContainerStyle={{ paddingTop: 20, paddingBottom: NAV_SPACE + insets.bottom }}
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

  header: { paddingBottom: 20 },
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
  categoryButton: {
    maxWidth: 140,
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
  },
  categoryText: { flexShrink: 1, fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: '#3549D6' },

  list: { flex: 1 },
  separator: { height: 12 },
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
});
