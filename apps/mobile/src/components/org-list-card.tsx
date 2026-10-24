import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { OrgListItem } from '@/lib/organizations';

// One organization in the Organizations list: logo, name, categories, a short
// description and a link to its full profile. The whole card is tappable.
export default function OrgListCard({ org, onPress }: { org: OrgListItem; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`${org.name}, view details`}>
      <Image
        source={org.logoUrl ? { uri: org.logoUrl } : require('@/assets/images/neu-org-logo.png')}
        style={styles.logo}
        contentFit="cover"
        accessibilityIgnoresInvertColors
      />
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={styles.name} numberOfLines={1}>
            {org.name}
          </Text>
          {org.recruitmentOpen && (
            <View style={styles.openBadge}>
              <Text style={styles.openText}>Recruiting</Text>
            </View>
          )}
        </View>

        {org.categories.length > 0 && (
          <View style={styles.chips}>
            {org.categories.map((category) => (
              <View key={category} style={styles.chip}>
                <Text style={styles.chipText} numberOfLines={1}>
                  {category}
                </Text>
              </View>
            ))}
          </View>
        )}

        {!!org.description && (
          <Text style={styles.description} numberOfLines={2}>
            {org.description}
          </Text>
        )}
        <Text style={styles.link}>View Details</Text>
      </View>
    </Pressable>
  );
}

const INK = '#1E2440';
const MUTED = '#71717A';

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E4E7F2',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 14,
    shadowColor: INK,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  pressed: { opacity: 0.75 },
  logo: { width: 56, height: 56, borderRadius: 28 },
  body: { flex: 1, marginLeft: 14 },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  name: { flexShrink: 1, fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: INK },
  openBadge: {
    marginLeft: 8,
    borderRadius: 6,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  openText: { fontFamily: 'Poppins_500Medium', fontSize: 10, color: '#15803D' },
  chips: { marginTop: 4, flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  chip: { borderRadius: 999, backgroundColor: '#E8EDFD', paddingHorizontal: 8, paddingVertical: 1 },
  chipText: { fontFamily: 'Poppins_500Medium', fontSize: 10, color: '#3549D6' },
  description: { marginTop: 4, fontFamily: 'Poppins_400Regular', fontSize: 12, lineHeight: 17, color: MUTED },
  link: { marginTop: 4, alignSelf: 'flex-end', fontFamily: 'Poppins_600SemiBold', fontSize: 12, color: '#3549D6' },
});
