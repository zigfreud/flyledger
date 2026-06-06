import { getCategoryByMerchant, getActiveCategories, getSettings } from '../db/queries';

export async function predictCategory(merchantName: string): Promise<string | null> {
  if (!merchantName) return null;

  try {
    // 1. Tenta correspondência local offline pelas regras gravadas
    const localMatchId = await getCategoryByMerchant(merchantName);
    if (localMatchId) {
      console.log(`Auto-categorização: Match de regra local para "${merchantName}" -> ${localMatchId}`);
      return localMatchId;
    }

    // 2. Se não encontrou regra local, verifica o motor de IA ativo
    const settings = await getSettings();
    const engine = settings.ai_engine || 'manual';

    if (engine === 'manual') {
      return null;
    }

    // Obter as categorias ativas para instruir o modelo
    const categories = await getActiveCategories();
    if (categories.length === 0) return null;

    const categoriesContext = categories
      .map(c => `- ID: "${c.id}", Nome: "${c.name}"`)
      .join('\n');

    const systemPrompt = `Você é um robô de categorização financeira de alta precisão.
Aqui está a lista de categorias disponíveis no app com seus respectivos IDs:
${categoriesContext}

Analise a descrição ou nome do estabelecimento comercial: "${merchantName}".
Selecione a categoria correspondente mais adequada.
Responda EXCLUSIVAMENTE com o ID da categoria correspondente (apenas o UUID bruto, sem markdown ou aspas, por exemplo: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx).
Se nenhuma categoria se encaixar bem ou se houver dúvida, responda EXCLUSIVAMENTE com a palavra "null" (sem aspas).
Não retorne markdown, não retorne justificativas, não escreva mais nada além do ID ou da palavra "null".`;

    if (engine === 'gemini') {
      const apiKey = settings.gemini_api_key;
      if (!apiKey) return null;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: systemPrompt }]
              }
            ]
          })
        }
      );

      if (!response.ok) return null;
      const resJson = await response.json();
      const text = resJson.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      
      // Limpa possíveis marcações adicionais que a IA possa ter retornado por engano
      const cleanText = text ? text.replace(/[`"'\n\r\t]/g, '').trim() : '';
      if (cleanText && cleanText !== 'null' && cleanText.length > 10) {
        return cleanText;
      }
    } else if (engine === 'ollama') {
      const url = settings.ollama_url || 'http://192.168.1.50:11434';
      const model = settings.ai_model || 'llama3.2';

      const response = await fetch(`${url}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model,
          prompt: systemPrompt,
          stream: false
        })
      });

      if (!response.ok) return null;
      const resJson = await response.json();
      const text = resJson.response?.trim();
      
      const cleanText = text ? text.replace(/[`"'\n\r\t]/g, '').trim() : '';
      if (cleanText && cleanText !== 'null' && cleanText.length > 10) {
        return cleanText;
      }
    }
  } catch (err) {
    console.error('Erro ao prever categoria por IA:', err);
  }

  return null;
}
