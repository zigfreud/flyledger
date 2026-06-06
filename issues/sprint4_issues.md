# Issues Local - Sprint 4 (Chatbot de Finanças IA)

## #FL-021: Estatísticas de Contexto do Chat
- **Status:** Concluído (Merged no Sprint 4)
- **Descrição:** O assistente de IA precisava de dados reais consolidados de gastos recentes para fornecer insights úteis sem comprometer o sigilo das despesas individuais.
- **Resolução:** Implementação da função `getChatContextStats` em `src/db/queries.ts` agregando totais e maiores despesas dos últimos 30 dias para injeção direta no System Prompt do assistente.

## #FL-022: Interface de Conversação do Chat IA
- **Status:** Concluído (Merged no Sprint 4)
- **Descrição:** Faltava uma tela dedicada para conversar e interagir de forma reativa com o assistente inteligente no app.
- **Resolução:** Desenvolvimento da aba `chat` em `app/(tabs)/chat.tsx` configurada no Tab Navigator com scroll automático, animação de digitação, pílulas de atalhos de sugestão e resposta tátil rápida (Haptics).

## #FL-023: Integração Híbrida Multimotor
- **Status:** Concluído (Merged no Sprint 4)
- **Descrição:** Encaminhar as mensagens para o motor adequado conforme definido nas configurações do usuário (Gemini API, Ollama PC local, Langflow).
- **Resolução:** Criação do utilitário `src/utils/chatService.ts` gerenciando a chamada HTTP apropriada com formatação de janelas de contexto e sanitização de respostas JSON/Markdown.
