import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';

export default function CreateScreen() {
  return (
    <View style={styles.container}>
      <ThemedText type="title">Create</ThemedText>
      <ThemedText>Recipe creation tools will be added here.</ThemedText>
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
