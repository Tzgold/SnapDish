import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { colors, radius, shadow } from '@/src/theme/snapdish';
import { analyzeRecipe } from '@/src/services/analyze';
import type { AnalyzeRecipeRequest } from '@/src/types/recipe';

type TrendingRecipe = {
  id: string;
  title: string;
  image: string;
  time: string;
};

type PickedImage = {
  base64: string;
  mimeType: string;
};

const SUGGESTIONS = ['Chicken tikka masala', 'Banana bread', 'Greek salad', 'Beef tacos'];

export default function HomeScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [dishName, setDishName] = useState('');
  const [pendingImage, setPendingImage] = useState<PickedImage | null>(null);
  const [statusMessage, setStatusMessage] = useState(
    'Type a dish or add a photo — we’ll build a full recipe for you.'
  );
  const [busy, setBusy] = useState(false);
  const [analysisLabel, setAnalysisLabel] = useState('');

  const horizontalPadding = width < 360 ? 16 : 22;
  const cardWidth = Math.min(260, Math.max(200, width * 0.58));

  const trendingRecipes: TrendingRecipe[] = [
    {
      id: '1',
      title: 'Creamy Garlic Pasta',
      image:
        'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=900&q=80',
      time: '25 min',
    },
    {
      id: '2',
      title: 'Smoky Grilled Chicken',
      image:
        'https://images.unsplash.com/photo-1532550907401-a500c9a57435?auto=format&fit=crop&w=900&q=80',
      time: '30 min',
    },
    {
      id: '3',
      title: 'Berry Pancake Stack',
      image:
        'https://images.unsplash.com/photo-1528207776546-365bb710ee93?auto=format&fit=crop&w=900&q=80',
      time: '20 min',
    },
    {
      id: '4',
      title: 'Fresh Poke Bowl',
      image:
        'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=900&q=80',
      time: '18 min',
    },
  ];

  const canSubmit = dishName.trim().length > 0 || pendingImage !== null;
  const isGenerateDisabled = busy || !canSubmit;

  const pickFromGallery = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Phone only', 'Open SnapDish in Expo Go on your phone to use photos.');
      return;
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow photo library access to add a food picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.85,
      base64: true,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (!asset.base64) {
      Alert.alert('Error', 'Could not read this image. Try another.');
      return;
    }
    setPendingImage({ base64: asset.base64, mimeType: asset.mimeType ?? 'image/jpeg' });
    setStatusMessage('Photo added. Add a dish name if you want, then tap Get recipe.');
  };

  const pickFromCamera = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Phone only', 'Use Expo Go on your phone to take a picture.');
      return;
    }
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow camera access to photograph your food.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.85,
      base64: true,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (!asset.base64) {
      Alert.alert('Error', 'Could not read the photo. Try again.');
      return;
    }
    setPendingImage({ base64: asset.base64, mimeType: asset.mimeType ?? 'image/jpeg' });
    setStatusMessage('Photo captured. Optionally name the dish, then tap Get recipe.');
  };

  const handleGetRecipe = async () => {
    if (busy || !canSubmit) return;

    const name = dishName.trim();
    const label =
      name && pendingImage
        ? `Looking up “${name}” and your photo…`
        : name
          ? `Finding a trusted-style recipe for “${name}”…`
          : 'Reading your food photo…';

    setAnalysisLabel(label);
    setBusy(true);
    setStatusMessage('Talking to SnapDish AI…');

    try {
      const payload: AnalyzeRecipeRequest = {};
      if (name) payload.dishName = name;
      if (pendingImage) {
        payload.imageBase64 = pendingImage.base64;
        payload.imageMimeType = pendingImage.mimeType;
      }

      const { recipe } = await analyzeRecipe(payload);

      const sourceBits = [name ? `"${name}"` : null, pendingImage ? 'photo' : null].filter(Boolean);
      const source = sourceBits.length ? sourceBits.join(' + ') : 'SnapDish';

      router.push({
        pathname: '/recipe-result',
        params: {
          source,
          recipe: JSON.stringify(recipe),
        },
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not get a recipe. Try again.';
      setStatusMessage(msg);
      Alert.alert('SnapDish', msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[styles.container, { paddingHorizontal: horizontalPadding }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        <View style={styles.topRow}>
          <Pressable
            style={styles.profileRow}
            onPress={() => router.push('/(tabs)/profile')}
            accessibilityRole="button"
            accessibilityLabel="Open profile">
            <View style={styles.avatarFrame}>
              <Image
                source="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=200&q=80"
                style={styles.avatarImage}
                contentFit="cover"
              />
            </View>
            <View style={styles.profileTextBlock}>
              <ThemedText style={styles.greeting}>Hi, Samantha</ThemedText>
              <ThemedText style={styles.profileHint}>Profile & settings</ThemedText>
            </View>
          </Pressable>
          <Pressable
            style={styles.iconGhost}
            onPress={() => Alert.alert('Notifications', 'Coming soon.')}
            hitSlop={10}>
            <Ionicons name="notifications-outline" size={20} color={colors.text} />
          </Pressable>
        </View>

        <View style={styles.heroCard}>
          <ThemedText style={styles.brandLine}>SnapDish</ThemedText>
          <ThemedText style={styles.heroTitle}>What are we cooking?</ThemedText>
          <ThemedText style={styles.heroSub}>
            Name a dish and we’ll pull together a clear recipe — or snap a photo (or both).
          </ThemedText>

          <View style={styles.inputShell}>
            <Ionicons name="search" size={20} color={colors.textTertiary} style={styles.inputIcon} />
            <TextInput
              placeholder='e.g. "pad thai", "sourdough bread"'
              placeholderTextColor={colors.textTertiary}
              value={dishName}
              onChangeText={setDishName}
              style={styles.mainInput}
              autoCorrect
              returnKeyType="done"
            />
          </View>

          <View style={styles.suggestionRow}>
            {SUGGESTIONS.map((s) => (
              <Pressable key={s} style={styles.suggestionChip} onPress={() => setDishName(s)}>
                <ThemedText style={styles.suggestionText}>{s}</ThemedText>
              </Pressable>
            ))}
          </View>

          <View style={styles.photoRow}>
            <Pressable style={styles.photoAction} onPress={() => void pickFromGallery()}>
              <View style={styles.photoIconCircle}>
                <Ionicons name="images-outline" size={22} color={colors.text} />
              </View>
              <ThemedText style={styles.photoActionLabel}>Gallery</ThemedText>
            </Pressable>
            <Pressable style={styles.photoAction} onPress={() => void pickFromCamera()}>
              <View style={styles.photoIconCircle}>
                <Ionicons name="camera-outline" size={22} color={colors.text} />
              </View>
              <ThemedText style={styles.photoActionLabel}>Camera</ThemedText>
            </Pressable>
          </View>

          {pendingImage ? (
            <View style={styles.previewRow}>
              <ThemedText style={styles.previewLabel}>Your photo</ThemedText>
              <View style={styles.previewBox}>
                <Image
                  source={{ uri: `data:${pendingImage.mimeType};base64,${pendingImage.base64}` }}
                  style={styles.previewImage}
                  contentFit="cover"
                />
                <Pressable style={styles.clearPhoto} onPress={() => setPendingImage(null)}>
                  <Ionicons name="close" size={18} color="#FFF" />
                </Pressable>
              </View>
            </View>
          ) : null}

          <Pressable
            style={[styles.primaryCta, isGenerateDisabled && styles.primaryCtaDisabled]}
            onPress={() => void handleGetRecipe()}
            disabled={isGenerateDisabled}>
            {busy ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="sparkles" size={18} color="#FFFFFF" />
                <ThemedText style={styles.primaryCtaText}>Get recipe</ThemedText>
              </>
            )}
          </Pressable>
        </View>

        <View style={styles.hintCard}>
          <Ionicons name="information-circle-outline" size={18} color={colors.textSecondary} />
          <ThemedText style={styles.hintText}>{statusMessage}</ThemedText>
        </View>

        <ThemedText style={styles.sectionTitle}>Popular right now</ThemedText>
        <FlatList
          horizontal
          data={trendingRecipes}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Pressable
              style={[styles.trendCard, { width: cardWidth }]}
              onPress={() => setDishName(item.title)}>
              <Image source={item.image} style={styles.trendImage} contentFit="cover" />
              <View style={styles.trendBody}>
                <ThemedText style={styles.trendTitle}>{item.title}</ThemedText>
                <View style={styles.trendMeta}>
                  <Ionicons name="time-outline" size={14} color={colors.textTertiary} />
                  <ThemedText style={styles.trendTime}>{item.time}</ThemedText>
                </View>
              </View>
            </Pressable>
          )}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.carousel}
        />
      </ScrollView>

      {busy ? (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color={colors.text} />
            <ThemedText style={styles.loadingTitle}>Finding your recipe</ThemedText>
            <ThemedText style={styles.loadingText}>{analysisLabel}</ThemedText>
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.canvas,
    flex: 1,
  },
  screen: {
    backgroundColor: colors.canvas,
  },
  container: {
    gap: 16,
    paddingBottom: 120,
    paddingTop: 8,
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  profileRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flex: 1,
    gap: 10,
  },
  profileTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  greeting: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  profileHint: {
    color: colors.textTertiary,
    fontSize: 12,
    marginTop: 1,
  },
  avatarFrame: {
    borderRadius: 22,
    height: 44,
    overflow: 'hidden',
    width: 44,
  },
  avatarImage: {
    height: '100%',
    width: '100%',
  },
  iconGhost: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: 18,
    ...shadow.md,
  },
  brandLine: {
    color: colors.brand,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '700',
    lineHeight: 30,
  },
  heroSub: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
  inputShell: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.sm,
    flexDirection: 'row',
    marginTop: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  inputIcon: {
    marginRight: 8,
  },
  mainInput: {
    color: colors.text,
    flex: 1,
    fontSize: 16,
    minHeight: 48,
    paddingVertical: 10,
  },
  suggestionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  suggestionChip: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  suggestionText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '500',
    opacity: 0.85,
  },
  photoRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  photoAction: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 10,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  photoIconCircle: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.xs,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  photoActionLabel: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  previewRow: {
    marginTop: 14,
  },
  previewLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    marginBottom: 8,
  },
  previewBox: {
    alignSelf: 'flex-start',
    borderRadius: radius.sm,
    overflow: 'hidden',
    position: 'relative',
  },
  previewImage: {
    height: 100,
    width: 100,
  },
  clearPhoto: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: radius.sm,
    height: 28,
    justifyContent: 'center',
    position: 'absolute',
    right: 6,
    top: 6,
    width: 28,
  },
  primaryCta: {
    alignItems: 'center',
    backgroundColor: colors.text,
    borderRadius: radius.sm,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: 18,
    paddingVertical: 14,
  },
  primaryCtaDisabled: {
    opacity: 0.45,
  },
  primaryCtaText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  hintCard: {
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    flexDirection: 'row',
    gap: 10,
    padding: 14,
    ...shadow.sm,
  },
  hintText: {
    color: colors.textSecondary,
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
    marginTop: 4,
  },
  carousel: {
    gap: 12,
    paddingRight: 8,
  },
  trendCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
    ...shadow.sm,
  },
  trendImage: {
    height: 120,
    width: '100%',
  },
  trendBody: {
    padding: 10,
  },
  trendTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  trendMeta: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    marginTop: 4,
  },
  trendTime: {
    color: colors.textTertiary,
    fontSize: 12,
  },
  loadingOverlay: {
    alignItems: 'center',
    backgroundColor: colors.overlay,
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  loadingCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    gap: 10,
    marginHorizontal: 32,
    paddingHorizontal: 24,
    paddingVertical: 22,
    ...shadow.md,
  },
  loadingTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});
