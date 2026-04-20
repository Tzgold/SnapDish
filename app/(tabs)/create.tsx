import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { colors, radius, shadow, typography } from '@/src/theme/snapdish';

type CreateOption = {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  accent: string;
};

export default function CreateScreen() {
  const handleOptionPress = (optionId: string) => {
    if (optionId === 'name') {
      Alert.alert('Start with a dish name', 'You can type your dish on Home and tap Get recipe.');
    } else {
      Alert.alert('Start with a photo', 'Use Gallery or Camera on Home, then tap Get recipe.');
    }
    router.push('/(tabs)');
  };

  const { width } = useWindowDimensions();
  const isSmall = width < 360;
  const horizontalPadding = isSmall ? 14 : width >= 430 ? 24 : 20;
  const router = useRouter();

  const options: CreateOption[] = [
    {
      id: 'name',
      title: 'Name a dish',
      description: 'Type what you want to cook on Home — we’ll build a full recipe.',
      icon: <Ionicons name="restaurant-outline" size={24} color={colors.text} />,
      accent: colors.surfaceMuted,
    },
    {
      id: 'upload',
      title: 'Food photo',
      description: 'Use Gallery or Camera on Home, optionally add the dish name.',
      icon: <Ionicons name="image-outline" size={24} color={colors.text} />,
      accent: '#E3F4E8',
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        contentContainerStyle={[styles.container, { paddingHorizontal: horizontalPadding, paddingBottom: 110 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <ThemedText style={[styles.title, { fontSize: isSmall ? typography.h1 - 2 : typography.h1 + 2 }]}>Create</ThemedText>
          <ThemedText style={styles.subtitle}>
            SnapDish turns a dish name and/or a photo into ingredients, steps, and timings.
          </ThemedText>
        </View>

        {options.map((opt) => (
          <Pressable
            key={opt.id}
            style={[styles.optionCard, { backgroundColor: opt.accent }]}
            onPress={() => handleOptionPress(opt.id)}>
            <View style={styles.optionIconWrap}>{opt.icon}</View>
            <View style={styles.optionText}>
              <ThemedText style={styles.optionTitle}>{opt.title}</ThemedText>
              <ThemedText style={styles.optionDesc}>{opt.description}</ThemedText>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
          </Pressable>
        ))}

        <Pressable style={styles.secondaryBtn} onPress={() => router.push('/(tabs)')}>
          <Ionicons name="home-outline" size={18} color="#FFFFFF" />
          <ThemedText style={styles.secondaryBtnText}>Open Home</ThemedText>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.canvas,
    flex: 1,
  },
  container: {
    gap: 14,
    paddingTop: 8,
  },
  header: {
    gap: 8,
    marginBottom: 4,
  },
  title: {
    color: colors.text,
    fontSize: 32,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  optionCard: {
    alignItems: 'center',
    borderRadius: radius.lg,
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    ...shadow.sm,
  },
  optionIconWrap: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  optionText: {
    flex: 1,
    gap: 4,
  },
  optionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  optionDesc: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  secondaryBtn: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.text,
    borderRadius: radius.sm,
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  secondaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
