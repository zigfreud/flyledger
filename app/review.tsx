import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import {
    discardCaptureRecord,
    finalizeManualCaptureAsExpense,
    getActiveCategories,
    getExpenseById,
    updateExpense
} from '../src/db/queries';
import { Category } from '../src/types/models';

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

    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    useEffect(() => {
        loadInitialData();
    }, []);

    const loadInitialData = async () => {
        try {
            const cats = await getActiveCategories();
            setCategories(cats);

            if (mode === 'create') {
                if (!captureRecordId) throw new Error('ID de captura não fornecido.');
                // In create, initial state defaults (amount='', date=today) are already set
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
                Alert.alert('Valor Inválido', 'O valor deve ser maior que zero.');
                return;
            }
            if (!categoryId) {
                Alert.alert('Categoria Obrigatória', 'Selecione uma categoria para salvar.');
                return;
            }
            if (!date) {
                Alert.alert('Data Inválida', 'Preencha uma data válida.');
                return;
            }

            const parsedDate = new Date(date).getTime();
            if (isNaN(parsedDate)) {
                Alert.alert('Data Inválida', 'A data informada não possui um formato correto numérico.');
                return;
            }

            if (mode === 'create') {
                await finalizeManualCaptureAsExpense({
                    capture_record_id: captureRecordId!,
                    category_id: categoryId,
                    amount: numAmount,
                    date: parsedDate,
                    merchant_name: merchantName || null,
                    description: description || null,
                    retained_image_path: null
                });
            } else {
                await updateExpense(expenseId!, {
                    category_id: categoryId,
                    amount: numAmount,
                    date: parsedDate,
                    merchant_name: merchantName || null,
                    description: description || null
                });
            }

            // Always go back to Home (removing review from stack)
            router.replace('/(tabs)');
        } catch (err: any) {
            Alert.alert('Erro ao Salvar', err.message);
        }
    };

    const handleDiscard = async () => {
        if (mode === 'create') {
            try {
                await discardCaptureRecord(captureRecordId!);
                router.replace('/(tabs)');
            } catch (err: any) {
                Alert.alert('Erro ao Descartar', err.message);
            }
        }
    };

    if (loading) {
        return <View style={styles.center}><Text>Carregando...</Text></View>;
    }

    if (errorMsg) {
        return (
            <View style={styles.center}>
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
                <Text style={styles.headerTitle}>{mode === 'create' ? 'Nova Despesa' : 'Editar Despesa'}</Text>
            </View>

            <ScrollView style={styles.form} keyboardShouldPersistTaps="handled">
                <Text style={styles.label}>Valor (R$)*</Text>
                <TextInput
                    style={styles.input}
                    value={amount}
                    onChangeText={setAmount}
                    keyboardType="numeric"
                    placeholder="0.00"
                    autoFocus={mode === 'create'}
                />

                <Text style={styles.label}>Data (YYYY-MM-DD)*</Text>
                <TextInput
                    style={styles.input}
                    value={date}
                    onChangeText={setDate}
                    placeholder="YYYY-MM-DD"
                />

                <Text style={styles.label}>Estabelecimento (Opcional)</Text>
                <TextInput
                    style={styles.input}
                    value={merchantName}
                    onChangeText={setMerchantName}
                    placeholder="Ex: Padaria do Bairro"
                />

                <Text style={styles.label}>Descrição (Opcional)</Text>
                <TextInput
                    style={styles.input}
                    value={description}
                    onChangeText={setDescription}
                    placeholder="Ex: Pão de Queijo"
                />

                <Text style={styles.label}>Categoria*</Text>
                <View style={styles.categoriesContainer}>
                    {categories.map((cat) => (
                        <TouchableOpacity
                            key={cat.id}
                            style={[
                                styles.categoryChip,
                                categoryId === cat.id && styles.categoryChipSelected
                            ]}
                            onPress={() => setCategoryId(cat.id)}
                        >
                            <Text style={[
                                styles.categoryText,
                                categoryId === cat.id && styles.categoryTextSelected
                            ]}>
                                {cat.name}
                            </Text>
                        </TouchableOpacity>
                    ))}
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
                    <Text style={styles.btnSaveText}>{mode === 'create' ? 'Salvar' : 'Salvar Alterações'}</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFF' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
    header: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#EEE' },
    headerTitle: { fontSize: 20, fontWeight: 'bold' },
    form: { padding: 16 },
    label: { fontSize: 14, color: '#666', marginBottom: 6, marginTop: 12, fontWeight: '500' },
    input: { borderWidth: 1, borderColor: '#DDD', borderRadius: 8, padding: 12, fontSize: 16 },
    categoriesContainer: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
    categoryChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#F5F5F5',
        marginRight: 8,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#E0E0E0'
    },
    categoryChipSelected: { backgroundColor: '#E3F2FD', borderColor: '#2196F3' },
    categoryText: { color: '#666', fontWeight: '500' },
    categoryTextSelected: { color: '#1976D2', fontWeight: 'bold' },
    footer: { flexDirection: 'row', padding: 16, borderTopWidth: 1, borderTopColor: '#EEE' },
    btn: { flex: 1, padding: 16, borderRadius: 8, alignItems: 'center', marginHorizontal: 4 },
    btnDiscard: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#D32F2F' },
    btnDiscardText: { color: '#D32F2F', fontWeight: 'bold', fontSize: 16 },
    btnCancel: { backgroundColor: '#E0E0E0', borderWidth: 0 },
    btnCancelText: { color: '#424242', fontWeight: 'bold', fontSize: 16 },
    btnSave: { backgroundColor: '#2196F3' },
    btnSaveText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
    errorText: { color: 'red', fontSize: 16, textAlign: 'center', marginBottom: 24 },
    backButton: { padding: 12, backgroundColor: '#EEE', borderRadius: 8 },
    backText: { fontWeight: 'bold' }
});
