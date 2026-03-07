import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function DashboardScreen() {
    return (
        <View style={styles.container}>
            <Text style={styles.placeholderText}>Dashboard (Em Breve)</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F5',
        justifyContent: 'center',
        alignItems: 'center',
    },
    placeholderText: {
        fontSize: 18,
        color: '#888',
    }
});
