import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { comingSoon } from '@/components/bottom-nav';
import { BRAND_GRADIENT } from '@/constants/brand';
import { fetchOrganization, type OrgDetails } from '@/lib/organizations';

// An organization's full profile, opened from the Organizations list. Sections
// the organization hasn't filled in are left out.
// Styled with StyleSheet so every spacing and color applies the same on web and phones.
export default function OrganizationScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  // undefined while loading, null when it doesn't exist (or was archived).
  const [org, setOrg] = useState<OrgDetails | null | undefined>(undefined);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let active = true;
    fetchOrganization(id)
      .then((loaded) => active && setOrg(loaded))
      .catch(() => active && setLoadError(true));
    return () => {
      active = false;
    };
  }, [id]);

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace('/organizations');
  }

  const backButton = (
    <Pressable onPress={goBack} hitSlop={10} style={styles.back} accessibilityRole="button" accessibilityLabel="Back">
      <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
    </Pressable>
  );

  if (!org) {
    return (
      <View style={styles.screen}>
        <StatusBar style="light" />
        <LinearGradient {...BRAND_GRADIENT} style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <View style={styles.column}>{backButton}</View>
        </LinearGradient>
        <View style={[styles.column, styles.body]}>
          {org === undefined && !loadError ? (
            <ActivityIndicator style={styles.loading} color="#3549D6" />
          ) : (
            <View style={styles.notice}>
              <Text style={styles.noticeText}>
                {loadError
                  ? "This organization couldn't load. Check your connection and try again."
                  : 'This organization is no longer available.'}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  }

  const contacts = [
    { icon: 'location-outline' as const, value: org.roomNumber },
    { icon: 'paper-plane-outline' as const, value: org.telegramContact },
    { icon: 'logo-facebook' as const, value: org.facebookContact },
  ].filter((item) => item.value?.trim());

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
        <LinearGradient {...BRAND_GRADIENT} style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <View style={styles.column}>
            {backButton}
            <View style={styles.hero}>
              <Image
                source={org.logoUrl ? { uri: org.logoUrl } : require('@/assets/images/neu-org-logo.png')}
                style={styles.logo}
                contentFit="cover"
                accessibilityIgnoresInvertColors
              />
              <View style={styles.heroText}>
                <Text style={styles.name}>{org.name}</Text>
                <View style={styles.heroActions}>
                  {org.recruitmentOpen ? (
                    <>
                      <View style={styles.recruitingPill}>
                        <Text style={styles.recruitingText}>Now Recruiting</Text>
                      </View>
                      <Pressable
                        onPress={() => comingSoon('Joining')}
                        style={({ pressed }) => [styles.joinButton, pressed && styles.pressed]}
                        accessibilityRole="button"
                        accessibilityLabel={`Join ${org.name}`}>
                        <Text style={styles.joinText}>Join</Text>
                      </Pressable>
                    </>
                  ) : (
                    <View style={styles.recruitingPill}>
                      <Text style={styles.recruitingText}>Not recruiting right now</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          </View>
        </LinearGradient>

        <View style={[styles.column, styles.body]}>
          {!!org.description?.trim() && (
            <Section title="About">
              <Text style={styles.paragraph}>{org.description}</Text>
            </Section>
          )}

          {org.reasonsToJoin.length > 0 && (
            <Section title={`Why Join ${org.name}?`}>
              <View style={styles.reasons}>
                {org.reasonsToJoin.map((reason, index) => (
                  <View key={index} style={styles.reasonRow}>
                    <Ionicons name="checkmark" size={18} color="#1E2440" style={styles.reasonIcon} />
                    <Text style={[styles.paragraph, styles.reasonText]}>{reason}</Text>
                  </View>
                ))}
              </View>
            </Section>
          )}

          {org.photoUrls.length > 0 && (
            <Section title="Events & Activities">
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.photos}>
                {org.photoUrls.map((url) => (
                  <Image
                    key={url}
                    source={{ uri: url }}
                    style={styles.photo}
                    contentFit="cover"
                    accessibilityLabel={`Photo from a ${org.name} event`}
                  />
                ))}
              </ScrollView>
            </Section>
          )}

          {org.testimonials.length > 0 && (
            <Section title="Members’ Experience" tab>
              <View style={styles.quotes}>
                {org.testimonials.map((item, index) => (
                  <View key={index} style={styles.quote}>
                    <Text style={styles.quoteText}>“{item.text.trim()}”</Text>
                    {!!item.author?.trim() && <Text style={styles.quoteAuthor}>— {item.author.trim()}</Text>}
                  </View>
                ))}
              </View>
            </Section>
          )}

          <Section title="Core Information" tab>
            {!!org.vision?.trim() && <Info label="Vision" value={org.vision} />}
            {!!org.mission?.trim() && <Info label="Mission" value={org.mission} />}
            <Info label="Department" value={org.department} />
            <Info label="Who Can Join" value={org.programEligibility} />
            {org.categories.length > 0 && <Info label="Categories" value={org.categories.join(', ')} />}
            {contacts.length > 0 && (
              <View style={styles.info}>
                <Text style={styles.infoLabel}>Contact Details</Text>
                {contacts.map((item) => (
                  <View key={item.icon} style={styles.contactRow}>
                    <Ionicons name={item.icon} size={16} color="#3549D6" />
                    <Text style={[styles.paragraph, styles.contactText]} selectable>
                      {item.value}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </Section>
        </View>
      </ScrollView>
    </View>
  );
}

// A white card. "tab" puts the title in a blue pill, like the template's
// Members' Experience and Core Information cards.
function Section({ title, tab = false, children }: { title: string; tab?: boolean; children: ReactNode }) {
  return (
    <View style={styles.card}>
      {tab ? (
        <View style={styles.tab}>
          <Text style={styles.tabText}>{title}</Text>
        </View>
      ) : (
        <Text style={styles.cardTitle}>{title}</Text>
      )}
      {children}
    </View>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.info}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.paragraph}>{value}</Text>
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
  pressed: { opacity: 0.7 },

  header: { paddingBottom: 24 },
  back: { alignSelf: 'flex-start', marginLeft: -6, padding: 2 },
  hero: { marginTop: 8, flexDirection: 'row', alignItems: 'center' },
  logo: { width: 76, height: 76, borderRadius: 38, borderWidth: 3, borderColor: '#FFFFFF' },
  heroText: { flex: 1, marginLeft: 16 },
  name: { fontFamily: 'Poppins_600SemiBold', fontSize: 20, lineHeight: 28, color: '#FFFFFF' },
  heroActions: { marginTop: 6, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  recruitingPill: {
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  recruitingText: { fontFamily: 'Poppins_500Medium', fontSize: 11, color: '#FFFFFF' },
  joinButton: { borderRadius: 999, backgroundColor: '#FFFFFF', paddingHorizontal: 20, paddingVertical: 4 },
  joinText: { fontFamily: 'Poppins_600SemiBold', fontSize: 12, color: BLUE },

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
  cardTitle: { marginBottom: 8, fontFamily: 'Poppins_600SemiBold', fontSize: 16, color: INK },
  tab: {
    alignSelf: 'flex-start',
    marginBottom: 12,
    borderRadius: 10,
    backgroundColor: BLUE,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  tabText: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: '#FFFFFF' },
  paragraph: { fontFamily: 'Poppins_400Regular', fontSize: 13, lineHeight: 21, color: MUTED },

  reasons: { gap: 6 },
  reasonRow: { flexDirection: 'row', alignItems: 'flex-start' },
  reasonIcon: { marginTop: 1, marginRight: 8 },
  reasonText: { flex: 1 },

  photos: { gap: 10 },
  photo: { width: 160, height: 110, borderRadius: 12, backgroundColor: '#E4E7F2' },

  quotes: { gap: 10 },
  quote: {
    borderLeftWidth: 3,
    borderLeftColor: BLUE,
    borderRadius: 10,
    backgroundColor: '#EEF1FB',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  quoteText: { fontFamily: 'Poppins_400Regular', fontStyle: 'italic', fontSize: 12, lineHeight: 19, color: MUTED },
  quoteAuthor: { marginTop: 6, alignSelf: 'flex-end', fontFamily: 'Poppins_500Medium', fontSize: 11, color: BLUE },

  info: { marginTop: 4, marginBottom: 6 },
  infoLabel: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: INK },
  contactRow: { marginTop: 4, flexDirection: 'row', alignItems: 'center', gap: 8 },
  contactText: { flex: 1 },
});
