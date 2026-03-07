import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface CaptureActionSheetProps {
    visible: boolean;
    onClose: () => void;
}

export function CaptureActionSheet({ visible, onClose }: CaptureActionSheetProps) {
    const handleOptionSelect = (option: string) => {
        console.log(`Selected: ${option}`);
        onClose();
    };

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <Pressable style={styles.overlay} onPress={onClose}>
                <Pressable style={styles.sheetContent} onPress={(e) => e.stopPropagation()}>
                    <View style={styles.dragHandle} />
                    <Text style={styles.title}>Nova Captura</Text>

                    <TouchableOpacity
                        style={styles.optionButton}
                        onPress={() => handleOptionSelect('IMAGE')}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.iconContainer, { backgroundColor: '#E3F2FD' }]}>
                            <Ionicons name="camera-outline" size={24} color="#1976D2" />
                        </View>
                        <Text style={styles.optionText}>Escanear Recibo</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.optionButton}
                        onPress={() => handleOptionSelect('QR_CODE')}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.iconContainer, { backgroundColor: '#E8F5E9' }]}>
                            <Ionicons name="qr-code-outline" size={24} color="#388E3C" />
                        </View>
                        <Text style={styles.optionText}>Ler QR Code Fiscal</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.optionButton}
                        onPress={() => handleOptionSelect('MANUAL')}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.iconContainer, { backgroundColor: '#F3E5F5' }]}>
                            <Ionicons name="create-outline" size={24} color="#7B1FA2" />
                        </View>
                        <Text style={styles.optionText}>Digitar Manualmente</Text>
                    </TouchableOpacity>
                </Pressable>
            </Pressable>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    sheetContent: {
        backgroundColor: 'white',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        paddingBottom: 40, // Extra padding for safe area
    },
    dragHandle: {
        width: 40,
        height: 4,
        backgroundColor: '#E0E0E0',
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 24,
        color: '#333',
    },
    optionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    optionText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#333',
    }
});
