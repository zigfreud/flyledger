import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { listExpensesOrderedByDate } from '../../src/db/queries';
import { Category, Expense } from '../../src/types/models';
import { Fonts } from '../../constants/theme';

type ExpenseWithCategory = Expense & { category: Category };

interface ChartItem {
  name: string;
  amount: number;
  percentage: number;
  color: string;
  icon: string;
}

interface MonthlyData {
  label: string;
  amount: number;
}

export default function DashboardScreen() {
  const [expenses, setExpenses] = useState<ExpenseWithCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      const data = await listExpensesOrderedByDate();
      setExpenses(data);
    } catch (err) {
      console.error("Erro ao carregar dados do dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  // 1. Processamento de Categorias
  const processCategories = (): { chartData: ChartItem[]; totalAmount: number } => {
    const categoryTotals: { [key: string]: { amount: number; category: Category } } = {};
    let totalAmount = 0;

    expenses.forEach((e) => {
      totalAmount += e.amount;
      if (!categoryTotals[e.category_id]) {
        categoryTotals[e.category_id] = {
          amount: 0,
          category: e.category,
        };
      }
      categoryTotals[e.category_id].amount += e.amount;
    });

    const chartData = Object.values(categoryTotals).map((item) => ({
      name: item.category?.name || 'Outros',
      amount: item.amount,
      percentage: totalAmount > 0 ? (item.amount / totalAmount) : 0,
      color: item.category?.color || '#94A3B8',
      icon: item.category?.icon || 'help',
    })).sort((a, b) => b.amount - a.amount);

    return { chartData, totalAmount };
  };

  const { chartData, totalAmount } = processCategories();

  // 2. Processamento de Histórico Mensal (Últimos 6 meses)
  const processMonthlyHistory = (): MonthlyData[] => {
    const monthsName = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const history: MonthlyData[] = [];

    const now = new Date();
    // Gera os últimos 6 meses
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      history.push({
        label: `${monthsName[d.getMonth()]} ${d.getFullYear().toString().substring(2)}`,
        amount: 0,
      });
    }

    expenses.forEach((e) => {
      const expDate = new Date(e.date);
      const expMonth = expDate.getMonth();
      const expYear = expDate.getFullYear();

      // Encontra se a despesa cai em algum dos 6 meses do histórico
      history.forEach((h) => {
        const [hMonthName, hYearShort] = h.label.split(' ');
        const hMonthIndex = monthsName.indexOf(hMonthName);
        const hYear = 2000 + parseInt(hYearShort);

        if (expMonth === hMonthIndex && expYear === hYear) {
          h.amount += e.amount;
        }
      });
    });

    return history;
  };

  const monthlyHistory = processMonthlyHistory();
  const maxMonthlyAmount = Math.max(...monthlyHistory.map(m => m.amount), 1);

  // Parâmetros do gráfico de rosca SVG
  const radius = 50;
  const strokeWidth = 18;
  const circumference = 2 * Math.PI * radius; // ~314.16
  let accumulatedPercent = 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Analytics</Text>
        <Text style={styles.headerSubtitle}>Resumo e distribuição de gastos</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <Text style={styles.loadingText}>Carregando gráficos...</Text>
        </View>
      ) : expenses.length === 0 ? (
        <View style={styles.center}>
          <View style={styles.emptyIconBg}>
            <Ionicons name="pie-chart-outline" size={40} color="#6366F1" />
          </View>
          <Text style={styles.emptyTitle}>Sem dados para análise</Text>
          <Text style={styles.emptySubtitle}>
            Adicione despesas na aba Transações para ver a distribuição dos seus gastos aqui.
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          {/* Card do Donut Chart */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Distribuição por Categoria</Text>
            
            <View style={styles.chartRow}>
              {/* SVG Donut */}
              <View style={styles.donutContainer}>
                <Svg width={140} height={140} viewBox="0 0 140 140">
                  <G transform="rotate(-90 70 70)">
                    {/* Círculo de fundo/track */}
                    <Circle
                      cx={70}
                      cy={70}
                      r={radius}
                      stroke="#1E293B"
                      strokeWidth={strokeWidth}
                      fill="transparent"
                    />
                    
                    {/* Fatias */}
                    {chartData.map((item, index) => {
                      const strokeDashoffset = circumference - (accumulatedPercent * circumference);
                      const strokeDasharray = `${item.percentage * circumference} ${circumference}`;
                      accumulatedPercent += item.percentage;

                      return (
                        <Circle
                          key={index}
                          cx={70}
                          cy={70}
                          r={radius}
                          stroke={item.color}
                          strokeWidth={strokeWidth}
                          strokeDasharray={strokeDasharray}
                          strokeDashoffset={strokeDashoffset}
                          strokeLinecap="round"
                          fill="transparent"
                        />
                      );
                    })}
                  </G>
                </Svg>
                
                {/* Texto do Centro */}
                <View style={styles.donutCenter}>
                  <Text style={styles.donutCenterLabel}>Total</Text>
                  <Text style={styles.donutCenterVal} numberOfLines={1}>
                    R${Math.round(totalAmount)}
                  </Text>
                </View>
              </View>

              {/* Legendas Rápidas */}
              <View style={styles.legendContainer}>
                {chartData.slice(0, 4).map((item, index) => (
                  <View key={index} style={styles.legendItem}>
                    <View style={[styles.legendIndicator, { backgroundColor: item.color }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.legendText} numberOfLines={1}>{item.name}</Text>
                      <Text style={styles.legendVal}>
                        {(item.percentage * 100).toFixed(0)}% • R$ {item.amount.toFixed(0)}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* Card de Evolução Mensal */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Evolução dos Gastos</Text>
            <Text style={styles.cardSubtitle}>Comparativo dos últimos 6 meses</Text>

            <View style={styles.barChartContainer}>
              {monthlyHistory.map((item, index) => {
                const heightPercentage = (item.amount / maxMonthlyAmount) * 100;
                // Altura mínima de 6px se tiver gastos, para não sumir o visual
                const barHeight = item.amount > 0 ? Math.max((heightPercentage * 1.2), 8) : 2;

                return (
                  <View key={index} style={styles.barCol}>
                    <View style={styles.barTrack}>
                      <View 
                        style={[
                          styles.barFill, 
                          { 
                            height: barHeight,
                            backgroundColor: index === 5 ? '#818CF8' : '#334155' // Destaque para o mês atual
                          }
                        ]} 
                      />
                    </View>
                    <Text style={styles.barLabel}>{item.label.split(' ')[0]}</Text>
                    <Text style={styles.barValue}>R$ {Math.round(item.amount)}</Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Listagem de Progresso / Detalhes de Categoria */}
          <View style={[styles.card, { marginBottom: 120 }]}>
            <Text style={styles.cardTitle}>Detalhamento das Categorias</Text>
            
            {chartData.map((item, index) => (
              <View key={index} style={styles.categoryProgressRow}>
                <View style={styles.categoryProgressHeader}>
                  <View style={styles.categoryLabelGroup}>
                    <View style={[styles.categoryIconCircle, { backgroundColor: item.color }]}>
                      <Ionicons name={item.icon as any} size={14} color="#FFF" />
                    </View>
                    <Text style={styles.categoryProgressName}>{item.name}</Text>
                  </View>
                  <Text style={styles.categoryProgressVal}>
                    R$ {item.amount.toFixed(2).replace('.', ',')}
                  </Text>
                </View>
                
                {/* Progress bar track */}
                <View style={styles.progressBarTrack}>
                  <View 
                    style={[
                      styles.progressBarFill, 
                      { 
                        width: `${item.percentage * 100}%`,
                        backgroundColor: item.color 
                      }
                    ]} 
                  />
                </View>
                <Text style={styles.categoryProgressPercent}>
                  {(item.percentage * 100).toFixed(1)}% do orçamento total
                </Text>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0F19',
  },
  header: {
    padding: 20,
    paddingTop: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: Fonts.rounded,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  loadingText: {
    color: '#94A3B8',
    fontSize: 16,
    fontFamily: Fonts.rounded,
  },
  scrollContainer: {
    flex: 1,
    padding: 20,
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F1F5F9',
    marginBottom: 16,
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: -12,
    marginBottom: 16,
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  donutContainer: {
    position: 'relative',
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: 80,
    height: 80,
  },
  donutCenterLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  donutCenterVal: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: Fonts.rounded,
    marginTop: 2,
  },
  legendContainer: {
    flex: 1,
    marginLeft: 20,
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
  },
  legendText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#E2E8F0',
  },
  legendVal: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  // Bar Chart Styles
  barChartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 140,
    paddingTop: 10,
    paddingBottom: 5,
  },
  barCol: {
    alignItems: 'center',
    flex: 1,
  },
  barTrack: {
    height: 90,
    width: 14,
    backgroundColor: '#0F172A',
    borderRadius: 7,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 7,
  },
  barLabel: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 8,
    fontWeight: '600',
  },
  barValue: {
    fontSize: 8,
    color: '#94A3B8',
    marginTop: 2,
    fontWeight: '500',
  },
  // Progress list styles
  categoryProgressRow: {
    marginBottom: 16,
  },
  categoryProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  categoryLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryProgressName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E2E8F0',
  },
  categoryProgressVal: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: '#0F172A',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  categoryProgressPercent: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
  },
  // Empty State Styles
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
