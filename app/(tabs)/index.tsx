import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CaptureActionSheet } from '../../src/components/CaptureActionSheet';
import { FAB } from '../../src/components/FAB';
import { listExpensesOrderedByDate } from '../../src/db/queries';
import { Category, Expense } from '../../src/types/models';

type ExpenseWithCategory = Expense & { category: Category };

export default function HomeScreen() {
  const router = useRouter();
  const [isActionSheetVisible, setActionSheetVisible] = useState(false);
  const [expenses, setExpenses] = useState<ExpenseWithCategory[]>([]);
  const [loading, setLoading] = useState(true);

  // useFocusEffect garante que a lista recarregue sempre que a aba Home ganha foco (ao voltar do Review)
  useFocusEffect(
    useCallback(() => {
      loadExpenses();
    }, [])
  );

  const loadExpenses = async () => {
    try {
      const data = await listExpensesOrderedByDate();
      setExpenses(data);
    } catch (err) {
      console.error("Erro ao carregar despesas:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleExpensePress = (expenseId: string) => {
    router.push({
      pathname: '/review',
      params: { mode: 'edit', expenseId }
    });
  };

  const renderExpenseItem = ({ item }: { item: ExpenseWithCategory }) => {
    return (
      <TouchableOpacity
        style={styles.expenseCard}
        onPress={() => handleExpensePress(item.id)}
        activeOpacity={0.7}
      >
        <View style={[styles.iconContainer, { backgroundColor: item.category?.color || '#CCC' }]}>
          <Ionicons name={item.category?.icon as any || 'help'} size={24} color="#FFF" />
        </View>
        <View style={styles.expenseInfo}>
          <Text style={styles.expenseTitle} numberOfLines={1}>
            {item.merchant_name || item.description || item.category?.name || 'Sem Nome'}
          </Text>
          <Text style={styles.expenseDate}>
            {new Date(item.date).toLocaleDateString('pt-BR')}
          </Text>
        </View>
        <Text style={styles.expenseAmount}>
          R$ {item.amount.toFixed(2).replace('.', ',')}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.center}><Text>Carregando...</Text></View>
      ) : expenses.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.placeholderText}>Histórico (Em Breve)</Text>
          <Text style={styles.emptySubtitle}>Pressione + para adicionar uma despesa</Text>
        </View>
      ) : (
        <FlatList
          data={expenses}
          keyExtractor={(item) => item.id}
          renderItem={renderExpenseItem}
          contentContainerStyle={styles.listContainer}
        />
      )}

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
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 18,
    color: '#888',
    fontWeight: 'bold',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#AAA',
    marginTop: 8,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 100, // Espaço pro FAB não tampar o último
  },
  expenseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  expenseInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  expenseTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  expenseDate: {
    fontSize: 12,
    color: '#888',
  },
  expenseAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  }
});
