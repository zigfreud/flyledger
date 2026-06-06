import * as FileSystem from 'expo-file-system';
import {
  createProcessingSnapshot,
  getSettings,
  updateCaptureRecordStatus
} from '../db/queries';

export async function processReceiptOcr(captureRecordId: string, imageUri: string): Promise<void> {
  try {
    // 1. Obtém as configurações do banco local
    const settings = await getSettings();
    const engine = settings.ai_engine || 'manual';

    if (engine === 'manual') {
      // Avança diretamente para revisão manual sem processamento
      await updateCaptureRecordStatus(captureRecordId, 'pending_review');
      return;
    }

    // 2. Atualiza o status do registro para "normalized"
    await updateCaptureRecordStatus(captureRecordId, 'normalized');

    // 3. Lê o arquivo de imagem local e converte para base64
    const base64Image = await FileSystem.readAsStringAsync(imageUri, {
      encoding: 'base64',
    });

    await updateCaptureRecordStatus(captureRecordId, 'extracted');

    let suggestedAmount: number | null = null;
    let suggestedDate: number | null = null;
    let suggestedMerchant: string | null = null;
    let warningMsg: string | null = null;

    if (engine === 'gemini') {
      const apiKey = settings.gemini_api_key;
      if (!apiKey) {
        throw new Error('Chave da API Gemini não configurada nos Ajustes.');
      }

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: 'Você é um assistente de finanças pessoais. Analise esta imagem de recibo/cupom fiscal e extraia os dados estruturados em JSON no seguinte formato exato:\n{\n  "amount": 123.45,\n  "date": 1717632000000,\n  "merchant_name": "Supermercado XYZ"\n}\nNota: O campo date deve ser um timestamp numérico em milissegundos (UTC). Se não encontrar algum campo, retorne null. Responda apenas com o JSON bruto, sem tags markdown ou comentários.'
                  },
                  {
                    inlineData: {
                      mimeType: 'image/jpeg',
                      data: base64Image
                    }
                  }
                ]
              }
            ],
            generationConfig: {
              responseMimeType: 'application/json'
            }
          })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro na API Gemini: ${response.status} - ${errorText}`);
      }

      const resJson = await response.json();
      const textResponse = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (textResponse) {
        const parsed = JSON.parse(textResponse.trim());
        suggestedAmount = parsed.amount || null;
        suggestedDate = parsed.date || null;
        suggestedMerchant = parsed.merchant_name || null;
      } else {
        warningMsg = 'A resposta da IA veio vazia.';
      }

    } else if (engine === 'ollama') {
      const url = settings.ollama_url || 'http://192.168.1.50:11434';
      const model = settings.ai_model || 'llama3.2-vision';

      const response = await fetch(`${url}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model,
          prompt: 'Analise esta imagem de recibo e extraia os dados. Retorne EXCLUSIVAMENTE um objeto JSON no formato: {"amount": 12.34, "date": 1717632000000, "merchant_name": "Estabelecimento"}. Não retorne mais nada além do JSON bruto.',
          stream: false,
          images: [base64Image],
          format: 'json'
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama indisponível ou erro no servidor local: ${response.status}`);
      }

      const resJson = await response.json();
      const textResponse = resJson.response;

      if (textResponse) {
        const parsed = JSON.parse(textResponse.trim());
        suggestedAmount = parsed.amount || null;
        suggestedDate = parsed.date || null;
        suggestedMerchant = parsed.merchant_name || null;
      } else {
        warningMsg = 'Ollama não devolveu sugestões válidas.';
      }

    } else if (engine === 'langflow') {
      const url = settings.langflow_url;
      const token = settings.langflow_token;
      if (!url) {
        throw new Error('Endpoint do Langflow não configurado nos Ajustes.');
      }

      const headers: any = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          input_value: `Extraia amount (number), date (timestamp ms) e merchant_name (string) desta imagem base64: ${base64Image.substring(0, 100)}...`,
          input_type: 'chat',
          output_type: 'chat',
          tweaks: {
            "TextInput-image": {
              "input_value": base64Image
            }
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Erro na API do Langflow: ${response.status}`);
      }

      const resJson = await response.json();
      const outputText = resJson.outputs?.[0]?.outputs?.[0]?.results?.message?.text || '';
      
      // Tenta achar um bloco JSON na string de resposta caso venha com markdown
      const jsonMatch = outputText.match(/\{[\s\S]*?\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        suggestedAmount = parsed.amount || null;
        suggestedDate = parsed.date || null;
        suggestedMerchant = parsed.merchant_name || null;
      } else {
        warningMsg = 'Não foi possível extrair JSON da resposta do Langflow.';
      }
    }

    // 4. Cria o Snapshot de processamento com as sugestões
    await createProcessingSnapshot(
      captureRecordId,
      `Processamento via motor: ${engine}`,
      suggestedDate,
      suggestedAmount,
      suggestedMerchant,
      warningMsg
    );

    // 5. Finaliza marcando para review
    await updateCaptureRecordStatus(captureRecordId, 'pending_review');

  } catch (err: any) {
    console.error('Erro no OCR Híbrido:', err);
    // Salva o erro e deixa o registro disponível para preenchimento manual
    await createProcessingSnapshot(
      captureRecordId,
      null,
      null,
      null,
      null,
      `Falha no processamento automático: ${err.message || 'Erro de conexão'}. Preencha manualmente.`
    );
    await updateCaptureRecordStatus(captureRecordId, 'pending_review');
    throw err;
  }
}
