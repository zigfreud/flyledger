import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Haptics from 'expo-haptics';
import { importBankTransaction } from '../src/db/queries';
import { parseBankFile } from '../src/utils/bankParser';
import { predictCategory } from '../src/utils/categorizationService';
import { Fonts } from '../constants/theme';

export default function BankImportScreen() {
  const router = useRouter();
  const [fileUri, setFileUri] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');

  const pickDocument = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      const result = await DocumentPicker.getDocumentAsync({
        type: ['*/*'], // Aceita qualquer tipo para garantir compatibilidade móvel
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        
        // Valida se é um arquivo do tipo desejado (csv ou ofx)
        const name = asset.name.toLowerCase();
        if (!name.endsWith('.csv') && !name.endsWith('.ofx') && !name.endsWith('.txt')) {
          Alert.alert('Arquivo Inválido', 'Por favor, selecione um arquivo no formato CSV ou OFX.');
          return;
        }

        setFileUri(asset.uri);
        setFileName(asset.name);
        setFileSize(asset.size || null);
        
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err) {
      console.error('Erro ao selecionar documento:', err);
      Alert.alert('Erro', 'Ocorreu um erro ao abrir o seletor de arquivos.');
    }
  };

  const handleImport = async () => {
    if (!fileUri || !fileName) return;

    setLoading(true);
    setLoadingMsg('Lendo arquivo do extrato...');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // 1. Lê o conteúdo de texto do arquivo local
      const content = await FileSystem.readAsStringAsync(fileUri);
      
      setLoadingMsg('Parseando transações...');
      
      // 2. Executa o parser baseado em layouts de bancos brasileiros
      const parsedTransactions = parseBankFile(content, fileName);

      if (parsedTransactions.length === 0) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        Alert.alert(
          'Nenhuma Transação Encontrada',
          'Não identificamos gastos/saídas compatíveis neste arquivo de extrato. Verifique se selecionou o arquivo correto.'
        );
        setLoading(false);
        return;
      }

      setLoadingMsg(`Importando ${parsedTransactions.length} itens...`);

      // 3. Salva cada transação no SQLite como um CaptureRecord MANUAL com snapshot
      for (const tx of parsedTransactions) {
        const suggestedCatId = await predictCategory(tx.description);
        await importBankTransaction(tx.amount, tx.date, tx.description, suggestedCatId);
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      Alert.alert(
        'Importação Concluída',
        `${parsedTransactions.length} transações importadas com sucesso! Elas estão aguardando sua validação no histórico.`,
        [
          {
            text: 'Ir para Histórico',
            onPress: () => router.replace('/(tabs)'),
          },
        ]
      );
    } catch (err: any) {
      console.error('Erro ao importar transações:', err);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Erro na Importação', err.message || 'Falha ao processar o extrato.');
    } finally {
      setLoading(false);
    }
  };

  const removeFile = () => {
    setFileUri(null);
    setFileName(null);
    setFileSize(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBackButton}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Importar Extrato</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollContainer} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        
        {/* Card Informativo de Bancos Suportados */}
        <View style={styles.card}>
          <View style={styles.infoTitleRow}>
            <Ionicons name="information-circle-outline" size={20} color="#8B5CF6" />
            <Text style={styles.infoTitle}>Bancos & Layouts Suportados</Text>
          </View>
          <Text style={styles.infoDescription}>
            Navegue pelos aplicativos dos seus bancos e exporte faturas ou extratos em formato <Text style={{ fontWeight: 'bold', color: '#FFF' }}>CSV</Text> ou <Text style={{ fontWeight: 'bold', color: '#FFF' }}>OFX</Text> para os seguintes bancos:
          </Text>
          <View style={styles.bankGrid}>
            <View style={styles.bankBadge}><Text style={styles.bankBadgeText}>C6 Bank</Text></View>
            <View style={styles.bankBadge}><Text style={styles.bankBadgeText}>Inter</Text></View>
            <View style={styles.bankBadge}><Text style={styles.bankBadgeText}>Santander</Text></View>
            <View style={styles.bankBadge}><Text style={styles.bankBadgeText}>BTG Pactual</Text></View>
            <View style={styles.bankBadge}><Text style={styles.bankBadgeText}>Bradesco</Text></View>
          </View>
        </View>

        {/* Zona de Seleção de Arquivo */}
        {!fileUri ? (
          <TouchableOpacity style={styles.dropZone} onPress={pickDocument} activeOpacity={0.7}>
            <View style={styles.dropZoneIconBg}>
              <Ionicons name="document-text-outline" size={36} color="#8B5CF6" />
            </View>
            <Text style={styles.dropZoneTitle}>Selecionar Extrato Bancário</Text>
            <Text style={styles.dropZoneSubtitle}>Toque para navegar pelos arquivos do seu celular</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.selectedFileCard}>
            <View style={styles.selectedFileHeader}>
              <View style={styles.fileIconCircle}>
                <Ionicons name="document-attach-outline" size={24} color="#FFF" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.fileNameText} numberOfLines={1}>
                  {fileName}
                </Text>
                {fileSize && (
                  <Text style={styles.fileSizeText}>
                    {(fileSize / 1024).toFixed(1)} KB
                  </Text>
                )}
              </View>
              <TouchableOpacity style={styles.removeFileBtn} onPress={removeFile}>
                <Ionicons name="close-circle" size={24} color="#F43F5E" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Informações sobre o processamento de conciliação */}
        <View style={styles.attentionBox}>
          <Ionicons name="shield-checkmark-outline" size={22} color="#A78BFA" style={{ marginRight: 10 }} />
          <Text style={styles.attentionText}>
            Privacidade total: a leitura do extrato é executada 100% offline dentro do seu celular. Nenhum dado financeiro sai do dispositivo.
          </Text>
        </View>

        {/* Botão de Importação */}
        {fileUri && (
          <TouchableOpacity
            style={[styles.importBtn, loading && styles.importBtnDisabled]}
            onPress={handleImport}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color="#FFF" />
                <Text style={styles.importBtnText}>{loadingMsg}</Text>
              </View>
            ) : (
              <Text style={styles.importBtnText}>Processar e Importar Gastos</Text>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0F19',
  },
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
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
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
  infoTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F1F5F9',
  },
  infoDescription: {
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 20,
    marginBottom: 16,
  },
  bankGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  bankBadge: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  bankBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#A78BFA',
  },
  dropZone: {
    backgroundColor: '#0F172A',
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#334155',
    borderStyle: 'dashed',
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  dropZoneIconBg: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  dropZoneTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 6,
  },
  dropZoneSubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },
  selectedFileCard: {
    backgroundColor: '#1E293B',
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#8B5CF6', // Highlight border
  },
  selectedFileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fileIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileNameText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  fileSizeText: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  removeFileBtn: {
    padding: 6,
  },
  attentionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.05)',
    padding: 16,
    borderRadius: 18,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.1)',
  },
  attentionText: {
    flex: 1,
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 18,
  },
  importBtn: {
    backgroundColor: '#8B5CF6',
    borderRadius: 18,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  importBtnDisabled: {
    backgroundColor: '#4C1D95',
  },
  importBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
