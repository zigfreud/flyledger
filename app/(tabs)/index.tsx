import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, SafeAreaView } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { CaptureActionSheet } from '../../src/components/CaptureActionSheet';
import { FAB } from '../../src/components/FAB';
import { listExpensesOrderedByDate } from '../../src/db/queries';
import { Category, Expense } from '../../src/types/models';
import { Fonts } from '../../constants/theme';

type ExpenseWithCategory = Expense & { category: Category };

export default function HomeScreen() {
  const router = useRouter();
  const [isActionSheetVisible, setActionSheetVisible] = useState(false);
  const [expenses, setExpenses] = useState<ExpenseWithCategory[]>([]);
  const [loading, setLoading] = useState(true);

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

  // Cálculos de Totais
  const getTotals = () => {
    const now = new Date();
    const todayStr = now.toDateString();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let todaySum = 0;
    let monthSum = 0;

    expenses.forEach((e) => {
      const expDate = new Date(e.date);
      if (expDate.toDateString() === todayStr) {
        todaySum += e.amount;
      }
      if (expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear) {
        monthSum += e.amount;
      }
    });

    return { todaySum, monthSum };
  };

  const { todaySum, monthSum } = getTotals();

  const renderExpenseItem = ({ item }: { item: ExpenseWithCategory }) => {
    return (
      <TouchableOpacity
        style={styles.expenseCard}
        onPress={() => handleExpensePress(item.id)}
        activeOpacity={0.7}
      >
        <View style={[styles.iconContainer, { backgroundColor: item.category?.color || '#CCC' }]}>
          <Ionicons name={item.category?.icon as any || 'help'} size={22} color="#FFF" />
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
          - R$ {item.amount.toFixed(2).replace('.', ',')}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View style={styles.headerSection}>
      {/* Título Principal */}
      <View style={styles.titleRow}>
        <Text style={styles.appTitle}>FlyLedger</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Local-First</Text>
        </View>
      </View>

      {/* Cartão de Destaque Premium */}
      <View style={styles.heroCard}>
        <Text style={styles.heroLabel}>Total de Gastos (Mês Atual)</Text>
        <Text style={styles.heroAmount}>
          R$ {monthSum.toFixed(2).replace('.', ',')}
        </Text>
        
        <View style={styles.heroDivider} />
        
        <View style={styles.heroFooter}>
          <View style={styles.heroFooterItem}>
            <Ionicons name="calendar-outline" size={16} color="#94A3B8" />
            <Text style={styles.heroFooterLabel}>Hoje:</Text>
            <Text style={styles.heroFooterVal}>R$ {todaySum.toFixed(2).replace('.', ',')}</Text>
          </View>
          <View style={styles.heroFooterItem}>
            <Ionicons name="receipt-outline" size={16} color="#94A3B8" />
            <Text style={styles.heroFooterLabel}>Itens:</Text>
            <Text style={styles.heroFooterVal}>{expenses.length}</Text>
          </View>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Transações Recentes</Text>
    </View>
  );

  const FlashListAny = FlashList as any;

  return (
    <SafeAreaView style={styles.container}>
      {loading ? (
        <View style={styles.center}>
          <Text style={styles.loadingText}>Carregando transações...</Text>
        </View>
      ) : (
        <FlashListAny
          data={expenses}
          keyExtractor={(item: ExpenseWithCategory) => item.id}
          renderItem={renderExpenseItem}
          estimatedItemSize={76}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconBg}>
                <Ionicons name="sparkles-outline" size={40} color="#6366F1" />
              </View>
              <Text style={styles.emptyTitle}>Tudo pronto para começar!</Text>
              <Text style={styles.emptySubtitle}>
                Cadastre suas primeiras despesas pressionando o botão de adição abaixo.
              </Text>
            </View>
          }
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}

      <FAB onPress={() => setActionSheetVisible(true)} />

      <CaptureActionSheet
        visible={isActionSheetVisible}
        onClose={() => setActionSheetVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0F19', // Deep dark slate background
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#94A3B8',
    fontSize: 16,
    fontFamily: Fonts.rounded,
  },
  listContainer: {
    padding: 20,
    paddingBottom: 120, // Space for FAB
  },
  headerSection: {
    marginBottom: 24,
    marginTop: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: Fonts.rounded,
    letterSpacing: -0.5,
  },
  badge: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)', // Indigo transparent badge
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  badgeText: {
    color: '#818CF8',
    fontSize: 12,
    fontWeight: 'bold',
  },
  heroCard: {
    backgroundColor: '#1E293B', // Slate 800 cards
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#334155', // Slate 700 border
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  heroLabel: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '600',
    marginBottom: 8,
  },
  heroAmount: {
    fontSize: 34,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: Fonts.rounded,
    letterSpacing: -1,
  },
  heroDivider: {
    height: 1,
    backgroundColor: '#334155',
    marginVertical: 18,
  },
  heroFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  heroFooterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroFooterLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  heroFooterVal: {
    fontSize: 14,
    color: '#E2E8F0',
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F1F5F9',
    marginTop: 28,
    marginBottom: 12,
    letterSpacing: -0.2,
  },
  expenseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    padding: 16,
    borderRadius: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  expenseInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  expenseTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  expenseDate: {
    fontSize: 12,
    color: '#64748B',
  },
  expenseAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F43F5E', // Rose color for spending
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 20,
  },
  emptyIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F1F5F9',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
});

