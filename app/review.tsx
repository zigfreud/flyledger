import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import {
    discardCaptureRecord,
    finalizeCaptureAsExpense,
    getActiveCategories,
    getCaptureRecordById,
    getExpenseById,
    getProcessingSnapshotByCaptureRecordId,
    updateExpense,
    saveMerchantRule
} from '../src/db/queries';
import { Category } from '../src/types/models';
import { Fonts } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function ReviewScreen() {
    const router = useRouter();
    const { mode, captureRecordId, expenseId } = useLocalSearchParams<{
        mode: 'create' | 'edit';
        captureRecordId?: string;
        expenseId?: string;
    }>();

    const [categories, setCategories] = useState<Category[]>([]);
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]); // YYYY-MM-DD simplificado
    const [merchantName, setMerchantName] = useState('');
    const [description, setDescription] = useState('');
    const [categoryId, setCategoryId] = useState<string | null>(null);
    const [initialSuggestedCategoryId, setInitialSuggestedCategoryId] = useState<string | null>(null);

    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [qrWarning, setQrWarning] = useState<string | null>(null);

    useEffect(() => {
        loadInitialData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const loadInitialData = async () => {
        try {
            const cats = await getActiveCategories();
            setCategories(cats);

            if (mode === 'create') {
                if (!captureRecordId) throw new Error('ID de captura não fornecido.');
                const record = await getCaptureRecordById(captureRecordId as string);
                if (!record) throw new Error('Registro de captura não encontrado ou já processado.');

                if (record.capture_type === 'QR_CODE' || record.capture_type === 'IMAGE' || record.capture_type === 'MANUAL') {
                    const snapshot = await getProcessingSnapshotByCaptureRecordId(record.id);
                    if (snapshot) {
                        try {
                            if (snapshot.suggested_amount) {
                                setAmount(snapshot.suggested_amount.toFixed(2));
                            } else {
                                setQrWarning(record.capture_type === 'QR_CODE'
                                    ? 'Nenhum valor financeiro extraído offline na URL capturada.'
                                    : (record.capture_type === 'IMAGE'
                                        ? 'Não foi possível extrair o valor do recibo de forma automática.'
                                        : 'Não foi possível extrair o valor da transação.')
                                );
                            }

                            if (snapshot.suggested_date) {
                                setDate(new Date(snapshot.suggested_date).toISOString().split('T')[0]);
                            }
                            if (snapshot.suggested_merchant) {
                                setMerchantName(snapshot.suggested_merchant);
                            }
                            if (snapshot.suggested_category_id) {
                                setCategoryId(snapshot.suggested_category_id);
                                setInitialSuggestedCategoryId(snapshot.suggested_category_id);
                            }

                            if (snapshot.warnings) {
                                setQrWarning(snapshot.warnings);
                            }
                        } catch {
                            setQrWarning('Erro no processamento dos dados sugeridos. Preencha manualmente.');
                        }
                    } else if (record.capture_type !== 'MANUAL') {
                        setQrWarning(record.capture_type === 'QR_CODE'
                            ? 'Processamento de QR incompleto.'
                            : 'Processamento de OCR do recibo incompleto.'
                        );
                    }
                }

                setLoading(false);
            } else if (mode === 'edit') {
                if (!expenseId) throw new Error('ID de despesa não fornecido.');
                const expense = await getExpenseById(expenseId);
                if (!expense) throw new Error('Despesa não encontrada.');

                setAmount(expense.amount.toFixed(2));
                setDate(new Date(expense.date).toISOString().split('T')[0]);
                setMerchantName(expense.merchant_name || '');
                setDescription(expense.description || '');
                setCategoryId(expense.category_id);
                setLoading(false);
            }
        } catch (err: any) {
            setErrorMsg(err.message || 'Erro ao carregar dados.');
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            const numAmount = parseFloat(amount.replace(',', '.'));
            if (isNaN(numAmount) || numAmount <= 0) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                Alert.alert('Valor Inválido', 'O valor deve ser maior que zero.');
                return;
            }
            if (!categoryId) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                Alert.alert('Categoria Obrigatória', 'Selecione uma categoria para salvar.');
                return;
            }
            if (!date) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                Alert.alert('Data Inválida', 'Preencha uma data válida.');
                return;
            }

            const parsedDate = new Date(date).getTime();
            if (isNaN(parsedDate)) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                Alert.alert('Data Inválida', 'A data informada não possui um formato correto numérico.');
                return;
            }

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            if (mode === 'create') {
                await finalizeCaptureAsExpense({
                    capture_record_id: captureRecordId!,
                    category_id: categoryId,
                    amount: numAmount,
                    date: parsedDate,
                    merchant_name: merchantName || null,
                    description: description || null,
                    retained_image_path: null
                });

                // Feedback Loop: Se houve alteração ou classificação nova de categoria
                if (merchantName && merchantName.trim() && categoryId !== initialSuggestedCategoryId) {
                    await saveMerchantRule(merchantName, categoryId);
                }
            } else {
                await updateExpense(expenseId!, {
                    category_id: categoryId,
                    amount: numAmount,
                    date: parsedDate,
                    merchant_name: merchantName || null,
                    description: description || null
                });
            }

            router.replace('/(tabs)');
        } catch (err: any) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert('Erro ao Salvar', err.message);
        }
    };

    const handleDiscard = async () => {
        if (mode === 'create') {
            try {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                await discardCaptureRecord(captureRecordId!);
                router.replace('/(tabs)');
            } catch (err: any) {
                Alert.alert('Erro ao Descartar', err.message);
            }
        }
    };

    const selectCategory = (catId: string) => {
        setCategoryId(catId);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <Text style={styles.loadingText}>Carregando...</Text>
            </View>
        );
    }

    if (errorMsg) {
        return (
            <View style={styles.center}>
                <Ionicons name="alert-circle-outline" size={60} color="#F43F5E" style={{ marginBottom: 16 }} />
                <Text style={styles.errorText}>{errorMsg}</Text>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Text style={styles.backText}>Voltar</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.headerBackButton}>
                    <Ionicons name="arrow-back" size={24} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>
                    {mode === 'create' ? 'Nova Despesa' : 'Editar Despesa'}
                </Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.form} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                {qrWarning && (
                    <View style={styles.warningBox}>
                        <Ionicons name="warning-outline" size={20} color="#F59E0B" style={{ marginRight: 8 }} />
                        <Text style={styles.warningBoxText}>{qrWarning}</Text>
                    </View>
                )}

                <Text style={styles.label}>Valor (R$)*</Text>
                <TextInput
                    style={styles.input}
                    value={amount}
                    onChangeText={setAmount}
                    keyboardType="numeric"
                    placeholder="0.00"
                    placeholderTextColor="#475569"
                    autoFocus={mode === 'create'}
                />

                <Text style={styles.label}>Data (YYYY-MM-DD)*</Text>
                <TextInput
                    style={styles.input}
                    value={date}
                    onChangeText={setDate}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#475569"
                />

                <Text style={styles.label}>Estabelecimento (Opcional)</Text>
                <TextInput
                    style={styles.input}
                    value={merchantName}
                    onChangeText={setMerchantName}
                    placeholder="Ex: Padaria do Bairro"
                    placeholderTextColor="#475569"
                />

                <Text style={styles.label}>Descrição (Opcional)</Text>
                <TextInput
                    style={styles.input}
                    value={description}
                    onChangeText={setDescription}
                    placeholder="Ex: Pão de Queijo"
                    placeholderTextColor="#475569"
                />

                <Text style={styles.label}>Categoria*</Text>
                <View style={styles.categoriesContainer}>
                    {categories.map((cat) => {
                        const isSelected = categoryId === cat.id;
                        return (
                            <TouchableOpacity
                                key={cat.id}
                                style={[
                                    styles.categoryChip,
                                    {
                                        borderColor: isSelected ? cat.color : '#334155',
                                        backgroundColor: isSelected ? cat.color : '#1E293B',
                                    }
                                ]}
                                onPress={() => selectCategory(cat.id)}
                            >
                                <Ionicons
                                    name={cat.icon as any}
                                    size={16}
                                    color={isSelected ? '#FFF' : cat.color}
                                    style={{ marginRight: 6 }}
                                />
                                <Text style={[
                                    styles.categoryText,
                                    { color: isSelected ? '#FFF' : '#E2E8F0' }
                                ]}>
                                    {cat.name}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </ScrollView>

            <View style={styles.footer}>
                {mode === 'create' ? (
                    <TouchableOpacity style={[styles.btn, styles.btnDiscard]} onPress={handleDiscard}>
                        <Text style={styles.btnDiscardText}>Descartar</Text>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity style={[styles.btn, styles.btnCancel]} onPress={() => router.back()}>
                        <Text style={styles.btnCancelText}>Voltar</Text>
                    </TouchableOpacity>
                )}
                <TouchableOpacity style={[styles.btn, styles.btnSave]} onPress={handleSave}>
                    <Text style={styles.btnSaveText}>
                        {mode === 'create' ? 'Confirmar' : 'Salvar'}
                    </Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0B0F19' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#0B0F19' },
    loadingText: { color: '#94A3B8', fontSize: 16 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#1E293B',
    },
    headerBackButton: {
        padding: 8,
    },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#FFF', fontFamily: Fonts.rounded },
    form: { padding: 20 },
    label: { fontSize: 13, color: '#94A3B8', marginBottom: 8, marginTop: 16, fontWeight: '600', letterSpacing: 0.2 },
    input: {
        backgroundColor: '#1E293B',
        borderWidth: 1,
        borderColor: '#334155',
        borderRadius: 12,
        padding: 14,
        fontSize: 16,
        color: '#F8FAFC',
    },
    categoriesContainer: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, gap: 8 },
    categoryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 24,
        borderWidth: 1.5,
    },
    categoryText: { fontWeight: '600', fontSize: 14 },
    footer: { flexDirection: 'row', padding: 20, borderTopWidth: 1, borderTopColor: '#1E293B', gap: 12 },
    btn: { flex: 1, padding: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    btnDiscard: { backgroundColor: '#1E293B', borderWidth: 1.5, borderColor: '#F43F5E' },
    btnDiscardText: { color: '#F43F5E', fontWeight: 'bold', fontSize: 16 },
    btnCancel: { backgroundColor: '#1E293B', borderWidth: 1.5, borderColor: '#475569' },
    btnCancelText: { color: '#94A3B8', fontWeight: 'bold', fontSize: 16 },
    btnSave: { backgroundColor: '#8B5CF6' },
    btnSaveText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
    errorText: { color: '#F43F5E', fontSize: 16, textAlign: 'center', marginBottom: 24, lineHeight: 22 },
    backButton: { paddingHorizontal: 24, paddingVertical: 12, backgroundColor: '#1E293B', borderRadius: 12, borderWidth: 1, borderColor: '#334155' },
    backText: { color: '#FFF', fontWeight: 'bold' },
    warningBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        padding: 14,
        borderRadius: 14,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(245, 158, 11, 0.3)',
    },
    warningBoxText: { color: '#FBBF24', fontSize: 13, fontWeight: '500', flex: 1, lineHeight: 18 }
});

