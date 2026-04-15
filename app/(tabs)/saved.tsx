import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';

export default function SavedScreen() {
  return (
    <View style={styles.container}>
      <ThemedText type="title">Saved</ThemedText>
      <ThemedText>Your saved recipes will show here.</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F8FAFC',
    flex: 1,
    gap: 8,
    padding: 20,
  },
});
