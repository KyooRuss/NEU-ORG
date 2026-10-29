import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Pressable from '@/components/pressable';
import {
  applyToOrganization,
  fetchApplicantInfo,
  fetchApplicationForm,
  normalizeLink,
  openApplicationForm,
  type ApplicantInfo,
  type ApplicationForm,
} from '@/lib/applications';

type Props = {
  organizationId: string;
  organizationName: string;
  profileId: string;
  onApplied: () => void;
  onClose: () => void;
};

// The membership application form, as a sheet from the bottom of the screen.
// The student's details come from their profile; they only add a social media
// link for the officers to reach them. Render it only while it's open.
// Styled with StyleSheet: NativeWind classes don't reliably reach inside a Modal on web.
export default function ApplyModal({ organizationId, organizationName, profileId, onApplied, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const [info, setInfo] = useState<ApplicantInfo | null>(null);
  const [infoError, setInfoError] = useState(false);
  // Only asked for when the profile has no program yet.
  const [program, setProgram] = useState('');
  const [link, setLink] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  // The organization's application form; stays null (no row) if it has none.
  const [form, setForm] = useState<ApplicationForm | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchApplicantInfo(profileId)
      .then((loaded) => active && setInfo(loaded))
      .catch(() => active && setInfoError(true));
    // The form is optional, so if it can't load the row just stays hidden.
    fetchApplicationForm(organizationId)
      .then((loaded) => active && setForm(loaded))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [profileId, organizationId]);

  const needsProgram = info !== null && !info.program;

  async function handleDownload() {
    if (!form) return;
    setDownloadError(null);
    setDownloading(true);
    try {
      await openApplicationForm(form);
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : 'The form couldn’t download. Try again.');
    } finally {
      setDownloading(false);
    }
  }

  async function handleSubmit() {
    if (!info) return;
    const chosenProgram = info.program || program;
    if (!chosenProgram.trim()) return setError('Enter your program.');
    if (!link.trim()) return setError('Enter a link to your Facebook or other social media profile.');
    // Something like "facebook.com/name": a dot, and no spaces.
    if (!/^https?:\/\/[^\s]+\.[^\s]+$/i.test(normalizeLink(link))) {
      return setError('That link doesn’t look right. Copy it from your profile page.');
    }

    setError(null);
    setSending(true);
    try {
      await applyToOrganization({ organizationId, profileId, program: chosenProgram, socialUrl: link });
      onApplied();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.');
      setSending(false);
    }
  }

  return (
    <Modal transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        {/* Tap above the sheet to close it. */}
        <Pressable style={styles.backdrop} onPress={sending ? undefined : onClose} accessibilityLabel="Close" />

        <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
          <View style={styles.handle} />
          <Text style={styles.title}>Join {organizationName}</Text>

          {info === null ? (
            infoError ? (
              <Text style={styles.error}>Your profile couldn’t load. Check your connection and try again.</Text>
            ) : (
              <ActivityIndicator style={styles.loading} color="#3549D6" />
            )
          ) : (
            <>
              <View style={styles.infoBox}>
                <InfoRow label="Name" value={info.name || '—'} />
                <InfoRow label="Student No." value={info.studentNo || '—'} />
                {!needsProgram && <InfoRow label="Program" value={info.program} />}
                <InfoRow label="Email" value={info.email} />
              </View>

              {needsProgram && (
                <>
                  <Text style={styles.label}>
                    Program <Text style={styles.required}>*</Text>
                  </Text>
                  <TextInput
                    value={program}
                    onChangeText={setProgram}
                    placeholder="e.g. BS Computer Science"
                    placeholderTextColor="#A1A1AA"
                    editable={!sending}
                    style={styles.input}
                  />
                </>
              )}

              {form && (
                <>
                  <Text style={styles.label}>Application Form</Text>
                  <Pressable
                    onPress={handleDownload}
                    disabled={downloading}
                    style={({ pressed }) => [styles.formFile, pressed && styles.pressed]}
                    accessibilityRole="button"
                    accessibilityLabel={`Download the application form, ${form.name}`}>
                    <View style={styles.formIcon}>
                      <Ionicons name="document-text-outline" size={20} color="#DC2626" />
                    </View>
                    <View style={styles.formText}>
                      <Text style={styles.formName} numberOfLines={1}>
                        {form.name}
                      </Text>
                      <Text style={styles.formHint}>Fill it out and bring it to your interview.</Text>
                    </View>
                    {downloading ? (
                      <ActivityIndicator color={NAVY} />
                    ) : (
                      <Ionicons name="download-outline" size={20} color={NAVY} />
                    )}
                  </Pressable>
                  {downloadError && <Text style={styles.error}>{downloadError}</Text>}
                </>
              )}

              <Text style={styles.label}>
                Social Media Link <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                value={link}
                onChangeText={(text) => {
                  setLink(text);
                  setError(null);
                }}
                placeholder="e.g. facebook.com/yourprofile"
                placeholderTextColor="#A1A1AA"
                keyboardType="url"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!sending}
                onSubmitEditing={handleSubmit}
                returnKeyType="send"
                style={styles.input}
                accessibilityLabel="Social media link, required"
              />
              {error && <Text style={styles.error}>{error}</Text>}

              <View style={styles.warning}>
                <Text style={styles.warningText}>
                  ⚠️ Submitting this form does not guarantee membership. The organization officer will contact you via
                  your social media or email to schedule an interview.
                </Text>
              </View>
            </>
          )}

          <View style={styles.actions}>
            <Pressable
              onPress={onClose}
              disabled={sending}
              style={({ pressed }) => [styles.button, styles.cancel, pressed && styles.pressed]}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleSubmit}
              disabled={sending || info === null}
              style={({ pressed }) => [
                styles.button,
                styles.submit,
                (sending || info === null) && styles.disabled,
                pressed && styles.pressed,
              ]}>
              {sending ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitText}>Submit Application</Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const INK = '#1E2440';
const NAVY = '#1E3A8A';

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.45)' },
  sheet: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: '#D4D4D8' },
  title: { marginTop: 16, fontFamily: 'Poppins_600SemiBold', fontSize: 18, color: NAVY },
  loading: { marginVertical: 32 },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.5 },

  infoBox: {
    marginTop: 14,
    gap: 6,
    borderRadius: 14,
    backgroundColor: '#F1F4FB',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  infoLabel: { fontFamily: 'Poppins_400Regular', fontSize: 12, color: '#8A8FA3' },
  infoValue: { flexShrink: 1, fontFamily: 'Poppins_600SemiBold', fontSize: 12, color: INK },

  label: { marginTop: 18, marginBottom: 8, fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: INK },
  required: { color: '#DC2626' },
  // The downloadable form, as a file row with a download icon.
  formFile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E4E4E7',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  formIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: '#FEE2E2',
  },
  formText: { flex: 1 },
  formName: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: INK },
  formHint: { fontFamily: 'Poppins_400Regular', fontSize: 11, color: '#8A8FA3' },
  input: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E4E4E7',
    backgroundColor: '#F5F6F8',
    paddingHorizontal: 14,
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: INK,
  },
  error: { marginTop: 8, fontFamily: 'Poppins_400Regular', fontSize: 12, lineHeight: 17, color: '#DC2626' },

  warning: {
    marginTop: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  warningText: { fontFamily: 'Poppins_400Regular', fontSize: 12, lineHeight: 18, color: '#92400E' },

  actions: { marginTop: 20, flexDirection: 'row', gap: 10 },
  button: { height: 50, alignItems: 'center', justifyContent: 'center', borderRadius: 999 },
  cancel: { flex: 2, borderWidth: 1, borderColor: '#D4D4D8', backgroundColor: '#FFFFFF' },
  cancelText: { fontFamily: 'Poppins_500Medium', fontSize: 14, color: INK },
  submit: { flex: 4, backgroundColor: NAVY },
  submitText: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: '#FFFFFF' },
});
