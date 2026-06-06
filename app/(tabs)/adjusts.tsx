import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { getSettings, updateSetting } from '../../src/db/queries';
import { Fonts } from '../../constants/theme';

type AIEngine = 'manual' | 'gemini' | 'ollama' | 'langflow';

export default function AdjustsScreen() {
  const [engine, setEngine] = useState<AIEngine>('manual');
  const [geminiKey, setGeminiKey] = useState('');
  const [ollamaUrl, setOllamaUrl] = useState('http://192.168.1.50:11434');
  const [ollamaModel, setOllamaModel] = useState('llama3.2-vision');
  const [langflowUrl, setLangflowUrl] = useState('');
  const [langflowToken, setLangflowToken] = useState('');
  
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadSettings();
    }, [])
  );

  const loadSettings = async () => {
    try {
      const settings = await getSettings();
      if (settings.ai_engine) setEngine(settings.ai_engine as AIEngine);
      if (settings.gemini_api_key) setGeminiKey(settings.gemini_api_key);
      if (settings.ollama_url) setOllamaUrl(settings.ollama_url);
      if (settings.ai_model) setOllamaModel(settings.ai_model);
      if (settings.langflow_url) setLangflowUrl(settings.langflow_url);
      if (settings.langflow_token) setLangflowToken(settings.langflow_token);
    } catch (err) {
      console.error('Erro ao carregar configurações:', err);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      await updateSetting('ai_engine', engine);
      await updateSetting('gemini_api_key', geminiKey);
      await updateSetting('ollama_url', ollamaUrl);
      await updateSetting('ai_model', ollamaModel);
      await updateSetting('langflow_url', langflowUrl);
      await updateSetting('langflow_token', langflowToken);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Configurações Salvas', 'Os ajustes do sistema foram atualizados com sucesso.');
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Erro ao Salvar', err.message || 'Erro desconhecido.');
    } finally {
      setSaving(false);
    }
  };

  const selectEngine = (selected: AIEngine) => {
    setEngine(selected);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Ajustes</Text>
        <Text style={styles.headerSubtitle}>Preferências de IA e Servidores</Text>
      </View>

      <ScrollView style={styles.scrollContainer} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {/* Escolha do Motor de IA */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Motor de Processamento (OCR / IA)</Text>
          <Text style={styles.cardSubtitle}>
            Selecione como os dados dos recibos e do assistente serão lidos e processados.
          </Text>

          <View style={styles.engineGrid}>
            <TouchableOpacity
              style={[styles.engineBtn, engine === 'manual' && styles.engineBtnSelected]}
              onPress={() => selectEngine('manual')}
            >
              <Ionicons
                name="create-outline"
                size={22}
                color={engine === 'manual' ? '#FFF' : '#A78BFA'}
              />
              <Text style={[styles.engineBtnText, engine === 'manual' && styles.engineBtnTextSelected]}>
                Manual
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.engineBtn, engine === 'gemini' && styles.engineBtnSelected]}
              onPress={() => selectEngine('gemini')}
            >
              <Ionicons
                name="cloud-upload-outline"
                size={22}
                color={engine === 'gemini' ? '#FFF' : '#A78BFA'}
              />
              <Text style={[styles.engineBtnText, engine === 'gemini' && styles.engineBtnTextSelected]}>
                Gemini API
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.engineBtn, engine === 'ollama' && styles.engineBtnSelected]}
              onPress={() => selectEngine('ollama')}
            >
              <Ionicons
                name="wifi-outline"
                size={22}
                color={engine === 'ollama' ? '#FFF' : '#A78BFA'}
              />
              <Text style={[styles.engineBtnText, engine === 'ollama' && styles.engineBtnTextSelected]}>
                Ollama PC
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.engineBtn, engine === 'langflow' && styles.engineBtnSelected]}
              onPress={() => selectEngine('langflow')}
            >
              <Ionicons
                name="git-branch-outline"
                size={22}
                color={engine === 'langflow' ? '#FFF' : '#A78BFA'}
              />
              <Text style={[styles.engineBtnText, engine === 'langflow' && styles.engineBtnTextSelected]}>
                Langflow
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Campos Condicionais do Gemini */}
        {engine === 'gemini' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Configurações do Gemini API</Text>
            <Text style={styles.inputLabel}>Chave da API Gemini (Google AI Studio)*</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.input, { flex: 1, borderRightWidth: 0, borderTopRightRadius: 0, borderBottomRightRadius: 0 }]}
                value={geminiKey}
                onChangeText={setGeminiKey}
                placeholder="Insira sua API Key do Google AI Studio"
                placeholderTextColor="#475569"
                secureTextEntry={!showKey}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={styles.keyToggleBtn}
                onPress={() => setShowKey(!showKey)}
              >
                <Ionicons
                  name={showKey ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#94A3B8"
                />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Campos Condicionais do Ollama */}
        {engine === 'ollama' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Configurações do Ollama</Text>
            <Text style={styles.inputLabel}>URL do Servidor Ollama (PC Local)*</Text>
            <TextInput
              style={styles.input}
              value={ollamaUrl}
              onChangeText={setOllamaUrl}
              placeholder="Ex: http://192.168.1.50:11434"
              placeholderTextColor="#475569"
              autoCapitalize="none"
              keyboardType="url"
              autoCorrect={false}
            />

            <Text style={[styles.inputLabel, { marginTop: 16 }]}>Modelo Vision no Ollama*</Text>
            <TextInput
              style={styles.input}
              value={ollamaModel}
              onChangeText={setOllamaModel}
              placeholder="Ex: llama3.2-vision ou llava"
              placeholderTextColor="#475569"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        )}

        {/* Campos Condicionais do Langflow */}
        {engine === 'langflow' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Configurações do Langflow</Text>
            
            <Text style={styles.inputLabel}>URL do Endpoint da API*</Text>
            <TextInput
              style={styles.input}
              value={langflowUrl}
              onChangeText={setLangflowUrl}
              placeholder="Ex: http://192.168.1.50:7860/api/v1/run/..."
              placeholderTextColor="#475569"
              autoCapitalize="none"
              keyboardType="url"
              autoCorrect={false}
            />

            <Text style={[styles.inputLabel, { marginTop: 16 }]}>Token do Langflow (Opcional)</Text>
            <TextInput
              style={styles.input}
              value={langflowToken}
              onChangeText={setLangflowToken}
              placeholder="Insira o Token de Acesso"
              placeholderTextColor="#475569"
              autoCapitalize="none"
              secureTextEntry
              autoCorrect={false}
            />
          </View>
        )}

        {/* Botão de Salvar */}
        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.8}
        >
          <Text style={styles.saveBtnText}>
            {saving ? 'Salvando...' : 'Salvar Configurações'}
          </Text>
        </TouchableOpacity>
        
        {/* Espaço inferior */}
        <View style={{ height: 100 }} />
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
    marginBottom: 8,
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 16,
    lineHeight: 18,
  },
  engineGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  engineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#0F172A',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#334155',
  },
  engineBtnSelected: {
    backgroundColor: '#8B5CF6', // Violet Selected background
    borderColor: '#A78BFA',
  },
  engineBtnText: {
    color: '#A78BFA', // Lavender default text
    fontWeight: '600',
    fontSize: 14,
  },
  engineBtnTextSelected: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  inputLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 8,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#F8FAFC',
  },
  keyToggleBtn: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    borderLeftWidth: 0,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtn: {
    backgroundColor: '#8B5CF6',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  saveBtnDisabled: {
    backgroundColor: '#4C1D95',
  },
  saveBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
