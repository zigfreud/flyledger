import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
    createProcessingSnapshot,
    createQrCaptureRecord,
    updateCaptureRecordStatus
} from '../src/db/queries';
import { extractQrSuggestions } from '../src/utils/qrParser';

export default function ScanQrScreen() {
    const [permission, requestPermission] = useCameraPermissions();
    const [isProcessing, setIsProcessing] = useState(false);
    const router = useRouter();

    if (!permission) {
        // Carregando view
        return <View style={styles.container} />;
    }

    if (!permission.granted) {
        return (
            <View style={styles.center}>
                <Text style={styles.warningText}>Precisamos de permissão para usar a câmera.</Text>
                <TouchableOpacity style={styles.prmButton} onPress={requestPermission}>
                    <Text style={styles.prmButtonText}>Conceder Permissão</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.prmButton, styles.btnCancel]} onPress={() => router.back()}>
                    <Text style={[styles.prmButtonText, styles.btnCancelText]}>Voltar</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const handleBarcodeScanned = async ({ type, data }: { type: string; data: string }) => {
        if (isProcessing) return;
        setIsProcessing(true);

        try {
            // 1. Snapshot do Capture Record originado como QR
            const record = await createQrCaptureRecord(data, 'URL');
            await updateCaptureRecordStatus(record.id, 'normalized');

            // 2. Extrai sugestoes offline ingênuas
            const suggestions = extractQrSuggestions(data);
            await updateCaptureRecordStatus(record.id, 'extracted');

            // 3. Persiste o processamento offline com os campos corretos
            const hasAmount = suggestions.amount !== undefined;
            const warningMsg = hasAmount ? null : 'Leitura concluída, mas o valor não pôde ser extraído offline da matriz QR. Por favor, digite manualmente.';

            await createProcessingSnapshot(
                record.id,
                data,
                suggestions.date ?? null,
                suggestions.amount ?? null,
                suggestions.merchant_name ?? null,
                warningMsg
            );

            // 4. Libera para Review
            await updateCaptureRecordStatus(record.id, 'pending_review');

            // 5. Encaminha desempilhando a câmera
            router.replace({
                pathname: '/review',
                params: { mode: 'create', captureRecordId: record.id }
            });
        } catch (err: any) {
            Alert.alert('Erro ao processar QR', err.message);
            setIsProcessing(false);
        }
    };

    return (
        <View style={styles.container}>
            <CameraView
                style={styles.camera}
                facing="back"
                barcodeScannerSettings={{
                    barcodeTypes: ["qr"],
                }}
                onBarcodeScanned={handleBarcodeScanned}
            >
                <View style={styles.overlay}>
                    <View style={styles.maskContainer}>
                        <View style={styles.mask} />
                    </View>
                    <View style={styles.row}>
                        <View style={styles.mask} />
                        <View style={styles.focusFrame} />
                        <View style={styles.mask} />
                    </View>
                    <View style={styles.maskContainer}>
                        <View style={styles.mask} />
                    </View>
                </View>

                {isProcessing && (
                    <View style={styles.loadingOverlay}>
                        <ActivityIndicator size="large" color="#4CAF50" />
                        <Text style={styles.loadingText}>Processando QR...</Text>
                    </View>
                )}

                {!isProcessing && (
                    <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                        <Text style={styles.backText}>Cancelar</Text>
                    </TouchableOpacity>
                )}
            </CameraView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#FFF' },
    warningText: { fontSize: 16, marginBottom: 24, textAlign: 'center' },
    prmButton: { backgroundColor: '#2196F3', padding: 16, borderRadius: 8, width: '100%', marginBottom: 12 },
    prmButtonText: { color: '#FFF', textAlign: 'center', fontWeight: 'bold' },
    btnCancel: { backgroundColor: '#E0E0E0' },
    btnCancelText: { color: '#333' },
    camera: { flex: 1 },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
    },
    maskContainer: {
        flex: 1,
        width: '100%',
    },
    row: {
        flexDirection: 'row',
    },
    mask: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
    },
    focusFrame: {
        width: 250,
        height: 250,
        borderWidth: 2,
        borderColor: '#4CAF50',
        backgroundColor: 'transparent',
    },
    backButton: {
        position: 'absolute',
        bottom: 40,
        alignSelf: 'center',
        backgroundColor: 'rgba(0,0,0,0.7)',
        paddingHorizontal: 32,
        paddingVertical: 16,
        borderRadius: 24,
    },
    backText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10
    },
    loadingText: { color: '#FFF', marginTop: 16, fontSize: 16, fontWeight: 'bold' }
});
