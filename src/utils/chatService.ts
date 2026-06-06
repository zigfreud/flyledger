import { getSettings, getChatContextStats } from '../db/queries';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: number;
}

export async function sendChatMessage(
  messages: ChatMessage[],
  userMessageText: string
): Promise<string> {
  try {
    const settings = await getSettings();
    const engine = settings.ai_engine || 'manual';

    // 1. Obtém as estatísticas do banco SQLite local
    const stats = await getChatContextStats();

    // 2. Formata as instruções do sistema com os dados das despesas
    const formattedCategories = stats.detalheCategorias
      .map(c => `  * ${c.nome}: R$ ${c.valor.toFixed(2).replace('.', ',')} (${c.contagem} compra(s))`)
      .join('\n');

    const formattedExpenses = stats.maioresDespesas
      .map((d, i) => `  ${i + 1}. R$ ${d.valor.toFixed(2).replace('.', ',')} em "${d.estabelecimento}" (${d.data})${d.descricao ? ` - Descrição: ${d.descricao}` : ''}`)
      .join('\n');

    const systemPrompt = `Você é o FlyLedger IA, um assistente virtual inteligente e especialista em finanças pessoais.
Você está rodando diretamente no celular do usuário e ajuda a analisar seus hábitos de gastos de forma construtiva.

Aqui estão os dados agregados das despesas deste usuário nos últimos 30 dias, consultados no SQLite local dele:
- Total Gasto nos Últimos 30 Dias: R$ ${stats.totalGeral30Dias.toFixed(2).replace('.', ',')}
- Divisão de Gastos por Categoria:
${formattedCategories || '  (Nenhum gasto registrado nos últimos 30 dias)'}
- Top 5 Maiores Despesas no período:
${formattedExpenses || '  (Nenhuma despesa registrada)'}

Diretrizes de resposta:
1. Responda em português do Brasil de maneira concisa, amigável, clara e objetiva. Use formatação limpa (listas, negritos).
2. Nunca invente valores, estabelecimentos ou datas que não estejam descritos no resumo acima.
3. Se o usuário perguntar sobre alguma despesa específica não presente na lista ou fora dos 30 dias, responda educadamente que você tem visibilidade apenas dos totais agregados e destaques dos últimos 30 dias por motivos de segurança e eficiência de dados.
4. Forneça insights úteis de economia baseados nas categorias em que ele mais gastou (ex: sugerir metas, cortes ou atenção).`;

    if (engine === 'manual') {
      return "O assistente está desativado (motor configurado como 'Manual' nos Ajustes). Acesse a aba de Ajustes para ativar o Gemini, Ollama ou Langflow.";
    }

    if (engine === 'gemini') {
      const apiKey = settings.gemini_api_key;
      if (!apiKey) {
        return "Para conversar via Gemini, por favor insira sua Chave de API na aba de Ajustes.";
      }

      // Converte histórico mantendo limite de contexto
      const contents = [
        ...messages.slice(-6).map(msg => ({
          role: msg.sender === 'user' ? 'user' : 'model',
          parts: [{ text: msg.text }]
        })),
        {
          role: 'user',
          parts: [{ text: userMessageText }]
        }
      ];

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: contents,
            systemInstruction: {
              parts: [{ text: systemPrompt }]
            }
          })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Gemini Chat Error:', errorText);
        return `Erro de comunicação com a API Gemini (${response.status}). Verifique sua chave e conexão de rede nos Ajustes.`;
      }

      const resJson = await response.json();
      return resJson.candidates?.[0]?.content?.parts?.[0]?.text || 'O assistente não gerou conteúdo.';
    }

    if (engine === 'ollama') {
      const url = settings.ollama_url || 'http://192.168.1.50:11434';
      const model = settings.ai_model || 'llama3.2';

      // Histórico formatado para o Ollama
      const chatMessages = [
        { role: 'system', content: systemPrompt },
        ...messages.slice(-6).map(msg => ({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.text
        })),
        { role: 'user', content: userMessageText }
      ];

      const response = await fetch(`${url}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model,
          messages: chatMessages,
          stream: false
        })
      });

      if (!response.ok) {
        throw new Error(`Servidor local do Ollama respondeu com status ${response.status}`);
      }

      const resJson = await response.json();
      return resJson.message?.content || 'Sem resposta do assistente local.';
    }

    if (engine === 'langflow') {
      const url = settings.langflow_url;
      const token = settings.langflow_token;

      if (!url) {
        return 'Endpoint da API do Langflow não está configurado na aba Ajustes.';
      }

      const headers: any = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const combinedPrompt = `${systemPrompt}\n\nHistórico Recente:\n${messages.slice(-4).map(m => `${m.sender === 'user' ? 'Usuário' : 'IA'}: ${m.text}`).join('\n')}\n\nNova Pergunta:\n${userMessageText}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          input_value: combinedPrompt,
          input_type: 'chat',
          output_type: 'chat',
          tweaks: {}
        })
      });

      if (!response.ok) {
        throw new Error(`O Langflow respondeu com status ${response.status}`);
      }

      const resJson = await response.json();
      return resJson.outputs?.[0]?.outputs?.[0]?.results?.message?.text || 'Sem resposta do Langflow.';
    }

    return 'Configuração de motor de IA desconhecida.';
  } catch (err: any) {
    console.error('Error in sendChatMessage:', err);
    return `Ocorreu uma falha ao conectar com o serviço de inteligência artificial: ${err.message || 'Erro de conexão'}. Certifique-se de que seus servidores locais ou conexões de rede estejam operacionais.`;
  }
}
