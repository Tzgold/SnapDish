import { FontAwesome6, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';

type ChoiceItem = {
  label: string;
  icon: React.ReactNode;
};

type TrendingRecipe = {
  id: string;
  title: string;
  image: string;
  time: string;
};

export default function HomeScreen() {
  const { width } = useWindowDimensions();
  const [linkInput, setLinkInput] = useState('');
  const [selectedChoice, setSelectedChoice] = useState('Shorts');
  const [statusMessage, setStatusMessage] = useState('Paste a link or choose an image option to continue.');

  const choices: ChoiceItem[] = [
    { label: 'Shorts', icon: <FontAwesome6 name="youtube" size={20} color="#FF0033" /> },
    { label: 'TikTok', icon: <FontAwesome6 name="tiktok" size={20} color="#111827" /> },
    { label: 'Reels', icon: <FontAwesome6 name="instagram" size={20} color="#E1306C" /> },
    { label: 'Upload Img', icon: <Ionicons name="image-outline" size={20} color="#2563EB" /> },
    { label: 'Take Photo', icon: <Ionicons name="camera-outline" size={20} color="#2563EB" /> },
  ];

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

  const isLinkChoice = selectedChoice === 'Shorts' || selectedChoice === 'TikTok' || selectedChoice === 'Reels';
  const isGenerateDisabled = isLinkChoice && linkInput.trim().length === 0;
  const horizontalPadding = width < 360 ? 14 : 20;
  const choiceGap = 10;
  const choiceColumns = width < 360 ? 2 : 3;
  const contentWidth = width - horizontalPadding * 2;
  const choiceCardWidth = (contentWidth - choiceGap * (choiceColumns - 1)) / choiceColumns;
  const cardWidth = Math.min(260, Math.max(210, width * 0.62));
  const headingFontSize = width < 360 ? 30 : width < 420 ? 34 : 38;
  const headingLineHeight = headingFontSize + 4;

  const handleGenerate = () => {
    if (selectedChoice === 'Upload Img') {
      setStatusMessage('Upload flow selected. Next we will open image picker and analyze the selected photo.');
      Alert.alert('Upload Image', 'Image picker will be connected next.');
      return;
    }

    if (selectedChoice === 'Take Photo') {
      setStatusMessage('Camera flow selected. Next we will open camera and analyze captured food photo.');
      Alert.alert('Take Photo', 'Camera capture will be connected next.');
      return;
    }

    if (!linkInput.trim()) {
      Alert.alert('Link Needed', `Paste a ${selectedChoice} link first.`);
      return;
    }

    setStatusMessage(`${selectedChoice} link ready. Next step is sending it to the recipe AI endpoint.`);
    Alert.alert('Ready', `${selectedChoice} link captured. We can now generate recipe steps.`);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[styles.container, { paddingHorizontal: horizontalPadding }]}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled">
        <View style={styles.topRow}>
          <View style={styles.profileRow}>
            <View style={styles.avatarFrame}>
              <Image
                source="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=200&q=80"
                style={styles.avatarImage}
                contentFit="cover"
              />
            </View>
            <View>
              <ThemedText style={styles.profileName}>Samantha</ThemedText>
              <ThemedText style={styles.profileHint}>Ready to cook?</ThemedText>
            </View>
          </View>
          <Pressable
            style={styles.notificationButton}
            onPress={() => Alert.alert('Notifications', 'Notifications panel will open here.')}
            hitSlop={10}>
            <Ionicons name="notifications-outline" size={18} color="#0F172A" />
          </Pressable>
        </View>

        <ThemedText style={[styles.heading, { fontSize: headingFontSize, lineHeight: headingLineHeight }]}>
          What&apos;s cooking today?
        </ThemedText>

        <View style={styles.searchContainer}>
          <Ionicons name="link-outline" size={20} color="#64748B" />
          <TextInput
            placeholder={
              isLinkChoice
                ? `Copy/paste ${selectedChoice.toLowerCase()} link here`
                : 'Image mode selected below'
            }
            placeholderTextColor="#94A3B8"
            value={linkInput}
            onChangeText={setLinkInput}
            style={styles.searchInput}
            autoCapitalize="none"
            autoCorrect={false}
            editable={isLinkChoice}
          />
        </View>

        <Pressable
          style={[styles.primaryGenerateButton, isGenerateDisabled && styles.primaryGenerateButtonDisabled]}
          onPress={handleGenerate}
          disabled={isGenerateDisabled}>
          <Ionicons name="sparkles" size={18} color="#0F172A" />
          <ThemedText style={styles.primaryGenerateButtonText}>
            {selectedChoice === 'Upload Img' || selectedChoice === 'Take Photo'
              ? `Continue with ${selectedChoice}`
              : `Generate from ${selectedChoice}`}
          </ThemedText>
        </Pressable>

        <View style={styles.statusBox}>
          <Ionicons name="information-circle-outline" size={16} color="#334155" />
          <ThemedText style={styles.statusText}>{statusMessage}</ThemedText>
        </View>

        <View style={styles.choicesGrid}>
          {choices.map((choice) => (
            <Pressable
              key={choice.label}
              onPress={() => setSelectedChoice(choice.label)}
              style={[
                styles.choiceCard,
                { width: choiceCardWidth },
                selectedChoice === choice.label && styles.choiceCardActive,
              ]}>
              <View style={styles.choiceIconWrap}>
                {selectedChoice === choice.label ? (
                  <MaterialCommunityIcons name="checkbox-marked-circle" size={20} color="#0F172A" />
                ) : (
                  choice.icon
                )}
              </View>
              <ThemedText
                style={[styles.choiceText, selectedChoice === choice.label && styles.choiceTextActive]}>
                {choice.label}
              </ThemedText>
            </Pressable>
          ))}
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Trending Recipe</ThemedText>
        </View>

        <FlatList
          horizontal
          data={trendingRecipes}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={[styles.recipeCard, { width: cardWidth }]}>
              <Image source={item.image} style={styles.recipeImage} contentFit="cover" />
              <Pressable
                style={styles.heartButton}
                onPress={() => Alert.alert('Saved', `${item.title} added to favorites.`)}
                hitSlop={8}>
                <Ionicons name="heart" size={16} color="#EF4444" />
              </Pressable>
              <View style={styles.recipeInfo}>
                <ThemedText style={styles.recipeTitle}>{item.title}</ThemedText>
                <View style={styles.recipeMetaRow}>
                  <Ionicons name="time-outline" size={14} color="#64748B" />
                  <ThemedText style={styles.recipeMeta}>{item.time}</ThemedText>
                </View>
              </View>
            </View>
          )}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.carousel}
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
        />

        <Pressable style={styles.generateButton} onPress={handleGenerate}>
          <Ionicons name="sparkles-outline" size={18} color="#0F172A" />
          <ThemedText style={styles.generateButtonText}>Generate Recipe from {selectedChoice}</ThemedText>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#F8FAFC',
    flex: 1,
  },
  screen: {
    backgroundColor: '#F8FAFC',
  },
  container: {
    gap: 14,
    paddingBottom: 110,
    paddingHorizontal: 14,
    paddingTop: 10,
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  profileRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  avatarFrame: {
    borderColor: '#E2E8F0',
    borderRadius: 24,
    borderWidth: 1.5,
    height: 44,
    overflow: 'hidden',
    width: 44,
  },
  avatarImage: {
    height: '100%',
    width: '100%',
  },
  profileName: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '600',
  },
  profileHint: {
    color: '#64748B',
    fontSize: 12,
  },
  notificationButton: {
    alignItems: 'center',
    borderRadius: 16,
    height: 36,
    justifyContent: 'center',
    marginRight: -4,
    width: 36,
  },
  heading: {
    color: '#0F172A',
    fontSize: 34,
    fontWeight: '700',
    lineHeight: 38,
  },
  searchContainer: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  searchInput: {
    color: '#0F172A',
    flex: 1,
    fontSize: 15,
  },
  primaryGenerateButton: {
    alignItems: 'center',
    backgroundColor: '#D9F27B',
    borderRadius: 16,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    paddingVertical: 13,
  },
  primaryGenerateButtonText: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '700',
  },
  primaryGenerateButtonDisabled: {
    opacity: 0.5,
  },
  statusBox: {
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  statusText: {
    color: '#334155',
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  choicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  choiceCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    gap: 8,
    minHeight: 82,
    justifyContent: 'center',
  },
  choiceCardActive: {
    backgroundColor: '#D9F27B',
  },
  choiceIconWrap: {
    alignItems: 'center',
    height: 22,
    justifyContent: 'center',
  },
  choiceText: {
    color: '#111827',
    fontSize: 14,
  },
  choiceTextActive: {
    fontWeight: '600',
  },
  section: {
    marginTop: 6,
  },
  sectionTitle: {
    color: '#0F172A',
    fontSize: 32,
    fontWeight: '700',
  },
  carousel: {
    gap: 12,
    paddingRight: 8,
  },
  recipeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    paddingBottom: 10,
    position: 'relative',
  },
  recipeImage: {
    height: 160,
  },
  recipeInfo: {
    gap: 4,
    paddingHorizontal: 10,
    paddingTop: 8,
  },
  recipeTitle: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '600',
  },
  recipeMetaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  recipeMeta: {
    color: '#64748B',
    fontSize: 13,
  },
  heartButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    position: 'absolute',
    right: 10,
    top: 10,
    width: 36,
    zIndex: 1,
  },
  generateButton: {
    alignItems: 'center',
    backgroundColor: '#EEF5CF',
    borderRadius: 14,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: 8,
    paddingVertical: 14,
  },
  generateButtonText: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '700',
  },
});
