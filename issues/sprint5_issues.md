# Issues Local - Sprint 5 (Relatórios & Backup Local)

## #FL-024: Planilha CSV estruturada para Excel
- **Status:** Concluído (Merged no Sprint 5)
- **Descrição:** Necessidade de exportar despesas para relatórios externos com codificação correta para que acentos e ponto decimal do padrão brasileiro abram corretamente no Excel.
- **Resolução:** Desenvolvimento da lógica em `app/(tabs)/adjusts.tsx` agregando despesas locais por data, injetando cabeçalho BOM UTF-8 (`\uFEFF`) e delimitando colunas por ponto e vírgula antes de enviar via `expo-sharing`.

## #FL-025: Exportação e Restauração Atômica de Backups (JSON)
- **Status:** Concluído (Merged no Sprint 5)
- **Descrição:** Evitar perdas de histórico em formatações de celular ou migrações de aparelho.
- **Resolução:** Criação das funções DAO `getBackupPayload` e `restoreBackupPayload` em `src/db/queries.ts` executando comandos relacionais em bloco com garantias transacionais ACID (SQLite `BEGIN/COMMIT/ROLLBACK`).

## #FL-026: Compartilhamento Nativo com Compartilhar e Picker
- **Status:** Concluído (Merged no Sprint 5)
- **Descrição:** Integrar o app com as folhas nativas de envio e navegação de documentos sem violar as permissões ou exigir build próprio (compatível com Expo Go).
- **Resolução:** Instalação e uso da biblioteca `expo-sharing` (para disparo de envio/salvamento do arquivo) e uso reativo de `expo-document-picker` na leitura offline do backup JSON.
