import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { createManualCaptureRecord } from '../db/queries';
import { Fonts } from '../../constants/theme';

interface CaptureActionSheetProps {
    visible: boolean;
    onClose: () => void;
}

export function CaptureActionSheet({ visible, onClose }: CaptureActionSheetProps) {
    const router = useRouter();

    const handleOptionSelect = async (option: string) => {
        onClose();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        
        if (option === 'IMAGE') {
            router.push('/scan-receipt' as any);
        } else if (option === 'BANK_IMPORT') {
            router.push('/bank-import' as any);
        } else if (option === 'MANUAL') {
            try {
                const record = await createManualCaptureRecord();
                router.push({
                    pathname: '/review',
                    params: { mode: 'create', captureRecordId: record.id }
                });
            } catch (err: any) {
                Alert.alert('Erro ao processar captura', err.message || 'Falha desconhecida no armazenamento nativo.');
                console.error("Erro ao criar CaptureRecord", err);
            }
        } else if (option === 'QR_CODE') {
            router.push('/scan-qr');
        }
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
                        <View style={[styles.iconContainer, { backgroundColor: 'rgba(139, 92, 246, 0.15)' }]}>
                            <Ionicons name="camera-outline" size={22} color="#A78BFA" />
                        </View>
                        <Text style={styles.optionText}>📸 Escanear Recibo Físico</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.optionButton}
                        onPress={() => handleOptionSelect('QR_CODE')}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.iconContainer, { backgroundColor: 'rgba(244, 63, 94, 0.15)' }]}>
                            <Ionicons name="qr-code-outline" size={22} color="#F43F5E" />
                        </View>
                        <Text style={styles.optionText}>🔲 Ler QR Code Fiscal</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.optionButton}
                        onPress={() => handleOptionSelect('BANK_IMPORT')}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.iconContainer, { backgroundColor: 'rgba(139, 92, 246, 0.15)' }]}>
                            <Ionicons name="document-text-outline" size={22} color="#A78BFA" />
                        </View>
                        <Text style={styles.optionText}>💵 Importar Extrato Bancário</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.optionButton}
                        onPress={() => handleOptionSelect('MANUAL')}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.iconContainer, { backgroundColor: 'rgba(234, 179, 8, 0.15)' }]}>
                            <Ionicons name="create-outline" size={22} color="#FBBF24" />
                        </View>
                        <Text style={styles.optionText}>✍️ Digitar Manualmente</Text>
                    </TouchableOpacity>
                </Pressable>
            </Pressable>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(11, 15, 25, 0.6)',
        justifyContent: 'flex-end',
    },
    sheetContent: {
        backgroundColor: '#1E293B',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        padding: 24,
        paddingBottom: 44,
        borderWidth: 1,
        borderColor: '#334155',
        borderBottomWidth: 0,
    },
    dragHandle: {
        width: 36,
        height: 4,
        backgroundColor: '#334155',
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 20,
        color: '#FFFFFF',
        fontFamily: Fonts.rounded,
    },
    optionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#334155',
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    optionText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#F1F5F9',
    }
});
