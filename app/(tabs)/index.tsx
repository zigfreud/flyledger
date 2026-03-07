import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CaptureActionSheet } from '../../src/components/CaptureActionSheet';
import { FAB } from '../../src/components/FAB';

export default function HomeScreen() {
  const [isActionSheetVisible, setActionSheetVisible] = useState(false);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.placeholderText}>Histórico (Em Breve)</Text>
      </View>

      <FAB onPress={() => setActionSheetVisible(true)} />

      <CaptureActionSheet
        visible={isActionSheetVisible}
        onClose={() => setActionSheetVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 18,
    color: '#888',
  }
});
