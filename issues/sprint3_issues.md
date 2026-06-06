# Issues Local - Sprint 3 (Importador de Extratos Bancários)

## #FL-018: Integração com Document Picker
- **Status:** Concluído (Merged no Sprint 3)
- **Descrição:** Necessidade de selecionar arquivos CSV ou OFX armazenados no celular para leitura de transações bancárias.
- **Resolução:** Instalação e integração da biblioteca nativa `expo-document-picker` em `app/bank-import.tsx` com filtros de arquivos e tratamento de erros.

## #FL-019: Parser de Extratos Locais (OFX/CSV)
- **Status:** Concluído (Merged no Sprint 3)
- **Descrição:** Ler e decodificar dados financeiros brutos de múltiplos layouts de bancos brasileiros de forma 100% offline.
- **Resolução:** Implementação do módulo `src/utils/bankParser.ts` contendo lógica de normalização estruturada para C6 Bank, Inter, Santander, BTG Pactual e Bradesco.

## #FL-020: Fila de Transações Pendentes (Deck de Revisão na Home)
- **Status:** Concluído (Merged no Sprint 3)
- **Descrição:** Exibir registros que foram importados mas ainda não foram categorizados/consolidados pelo usuário.
- **Resolução:** Inclusão de um deck de cartões horizontais premium na Home (`app/(tabs)/index.tsx`) exibindo valor, data, descrição e atalho para revisão detalhada em `/review`.
