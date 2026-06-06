import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { createImageCaptureRecord } from '../src/db/queries';
import { processReceiptOcr } from '../src/utils/ocrService';
import { Fonts } from '../constants/theme';

export default function ScanReceiptScreen() {
    const [permission, requestPermission] = useCameraPermissions();
    const [isProcessing, setIsProcessing] = useState(false);
    const [statusMessage, setStatusMessage] = useState('Processando...');
    const cameraRef = useRef<any>(null);
    const router = useRouter();

    if (!permission) {
        return <View style={styles.container} />;
    }

    if (!permission.granted) {
        return (
            <SafeAreaContainer>
                <View style={styles.center}>
                    <Ionicons name="camera-outline" size={60} color="#8B5CF6" style={{ marginBottom: 16 }} />
                    <Text style={styles.warningText}>Precisamos de permissão para usar a câmera e capturar recibos.</Text>
                    <TouchableOpacity style={styles.prmButton} onPress={requestPermission}>
                        <Text style={styles.prmButtonText}>Conceder Permissão</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.prmButton, styles.btnCancel]} onPress={() => router.back()}>
                        <Text style={[styles.prmButtonText, styles.btnCancelText]}>Voltar</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaContainer>
        );
    }

    const takePicture = async () => {
        if (cameraRef.current && !isProcessing) {
            setIsProcessing(true);
            setStatusMessage('Capturando imagem...');
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

            try {
                const photo = await cameraRef.current.takePictureAsync({
                    quality: 0.85,
                    skipProcessing: false,
                });

                if (photo && photo.uri) {
                    setStatusMessage('Executando OCR Inteligente...');
                    
                    // 1. Cria o Capture Record do tipo IMAGE
                    const record = await createImageCaptureRecord(photo.uri);
                    
                    // 2. Dispara OCR Híbrido conforme motor configurado
                    try {
                        await processReceiptOcr(record.id, photo.uri);
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    } catch (ocrErr: any) {
                        console.warn('Falha no OCR, prosseguindo para inserção manual:', ocrErr);
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                    }

                    // 3. Encaminha para tela de Review
                    router.replace({
                        pathname: '/review',
                        params: { mode: 'create', captureRecordId: record.id }
                    });
                }
            } catch (err: any) {
                Alert.alert('Erro ao capturar recibo', err.message);
                setIsProcessing(false);
            }
        }
    };

    return (
        <View style={styles.container}>
            <CameraView
                ref={cameraRef}
                style={styles.camera}
                facing="back"
            >
                <View style={styles.overlay}>
                    <View style={styles.maskContainer}>
                        <Text style={styles.instructionText}>Posicione o recibo dentro da área abaixo</Text>
                    </View>
                    
                    <View style={styles.row}>
                        <View style={styles.sideMask} />
                        <View style={styles.focusFrame}>
                            <View style={styles.cornerTL} />
                            <View style={styles.cornerTR} />
                            <View style={styles.cornerBL} />
                            <View style={styles.cornerBR} />
                        </View>
                        <View style={styles.sideMask} />
                    </View>
                    
                    <View style={styles.bottomOverlay}>
                        {!isProcessing ? (
                            <View style={styles.actionRow}>
                                <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()}>
                                    <Text style={styles.cancelText}>Cancelar</Text>
                                </TouchableOpacity>
                                
                                <TouchableOpacity style={styles.captureBtn} onPress={takePicture}>
                                    <View style={styles.captureBtnInner} />
                                </TouchableOpacity>
                                
                                <View style={{ width: 60 }} />
                            </View>
                        ) : (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size="large" color="#8B5CF6" />
                                <Text style={styles.loadingText}>{statusMessage}</Text>
                            </View>
                        )}
                    </View>
                </View>
            </CameraView>
        </View>
    );
}

// Wrapper auxiliar
function SafeAreaContainer({ children }: { children: React.ReactNode }) {
    return <View style={{ flex: 1, backgroundColor: '#0B0F19' }}>{children}</View>;
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
    warningText: { fontSize: 16, color: '#94A3B8', marginBottom: 24, textAlign: 'center', lineHeight: 22 },
    prmButton: { backgroundColor: '#8B5CF6', padding: 16, borderRadius: 12, width: '100%', marginBottom: 12 },
    prmButtonText: { color: '#FFF', textAlign: 'center', fontWeight: 'bold', fontSize: 16 },
    btnCancel: { backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155' },
    btnCancelText: { color: '#94A3B8' },
    camera: { flex: 1 },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'space-between',
    },
    maskContainer: {
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        padding: 30,
        paddingTop: 60,
        alignItems: 'center',
    },
    instructionText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
        fontFamily: Fonts.rounded,
    },
    row: {
        flexDirection: 'row',
        height: 350,
    },
    sideMask: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
    },
    focusFrame: {
        width: 280,
        height: 350,
        position: 'relative',
        backgroundColor: 'transparent',
    },
    cornerTL: { position: 'absolute', top: 0, left: 0, width: 30, height: 30, borderTopWidth: 4, borderLeftWidth: 4, borderColor: '#8B5CF6' },
    cornerTR: { position: 'absolute', top: 0, right: 0, width: 30, height: 30, borderTopWidth: 4, borderRightWidth: 4, borderColor: '#8B5CF6' },
    cornerBL: { position: 'absolute', bottom: 0, left: 0, width: 30, height: 30, borderBottomWidth: 4, borderLeftWidth: 4, borderColor: '#8B5CF6' },
    cornerBR: { position: 'absolute', bottom: 0, right: 0, width: 30, height: 30, borderBottomWidth: 4, borderRightWidth: 4, borderColor: '#8B5CF6' },
    bottomOverlay: {
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        paddingBottom: 40,
        paddingTop: 20,
        alignItems: 'center',
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '80%',
    },
    cancelBtn: {
        paddingVertical: 12,
        paddingHorizontal: 20,
    },
    cancelText: {
        color: '#94A3B8',
        fontSize: 16,
        fontWeight: '600',
    },
    captureBtn: {
        width: 76,
        height: 76,
        borderRadius: 38,
        borderWidth: 4,
        borderColor: '#FFF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    captureBtnInner: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#8B5CF6',
    },
    loadingContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingText: {
        color: '#FFF',
        marginTop: 12,
        fontSize: 15,
        fontWeight: '600',
    },
});
