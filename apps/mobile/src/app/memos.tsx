import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import MemoRow from '@/components/memo-row';
import Pressable from '@/components/pressable';
import { BRAND_GRADIENT } from '@/constants/brand';
import { fetchMemorandums, type Memorandum } from '@/lib/memorandums';

// Every memorandum, newest first. Opened from "See all" on Home and from
// memorandum notifications.
// Styled with StyleSheet so every spacing and color applies the same on web and phones.
export default function MemosScreen() {
  const insets = useSafeAreaInsets();
  const [memos, setMemos] = useState<Memorandum[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let active = true;
    fetchMemorandums()
      .then((loaded) => active && setMemos(loaded))
      .catch(() => active && setLoadError(true));
    return () => {
      active = false;
    };
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      setMemos(await fetchMemorandums());
      setLoadError(false);
    } catch {
      setLoadError(true);
    } finally {
      setRefreshing(false);
    }
  }, []);

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace('/home');
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <LinearGradient {...BRAND_GRADIENT} style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={[styles.column, styles.headerRow]}>
          <Pressable onPress={goBack} hitSlop={10} style={styles.back} accessibilityRole="button" accessibilityLabel="Back">
            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.headerTitle}>Memorandums</Text>
        </View>
      </LinearGradient>

      <FlatList
        data={memos ?? []}
        keyExtractor={(memo) => memo.id}
        renderItem={({ item }) => (
          <View style={[styles.column, styles.item]}>
            <MemoRow memo={item} />
          </View>
        )}
        ListEmptyComponent={
          memos === null && !loadError ? (
            <ActivityIndicator style={styles.loading} color="#3549D6" />
          ) : (
            <View style={styles.column}>
              <View style={styles.notice}>
                <Text style={styles.noticeText}>
                  {loadError
                    ? "Memorandums couldn't load. Check your connection and pull down to try again."
                    : 'No memorandums yet.'}
                </Text>
              </View>
            </View>
          )
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#3549D6']} tintColor="#3549D6" />
        }
        style={styles.list}
        contentContainerStyle={{ paddingTop: 16, paddingBottom: insets.bottom + 32 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#EEF1FB' },
  // Content stays phone-width on tablets instead of stretching across the screen.
  column: { width: '100%', maxWidth: 480, alignSelf: 'center', paddingHorizontal: 20 },

  header: { paddingBottom: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  back: { marginLeft: -6, padding: 2 },
  headerTitle: { marginLeft: 6, fontFamily: 'Poppins_600SemiBold', fontSize: 18, color: '#FFFFFF' },

  list: { flex: 1 },
  item: { marginBottom: 12 },
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
});
