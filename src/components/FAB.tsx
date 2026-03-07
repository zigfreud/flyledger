import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';

interface FABProps {
    onPress: () => void;
}

export function FAB({ onPress }: FABProps) {
    return (
        <TouchableOpacity
            style={styles.fab}
            onPress={onPress}
            activeOpacity={0.8}
        >
            <Ionicons name="add" size={32} color="white" />
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    fab: {
        position: 'absolute',
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
        right: 24,
        bottom: 24,
        backgroundColor: '#2196F3',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 8,
    },
});
