# Issues Local - Sprint 6 (Categorização Automática & Aprendizado)

## #FL-027: Migração e Tabela MerchantRules no SQLite
- **Status:** Concluído (Merged no Sprint 6)
- **Descrição:** Armazenar as regras de classificação de estabelecimentos criadas localmente pelo usuário ou carregadas por padrão no bootstrap.
- **Resolução:** Criação da tabela `MerchantRule (id PRIMARY KEY, merchant_pattern UNIQUE, category_id)` em `src/db/init.ts` e inclusão segura via `ALTER TABLE` do campo `suggested_category_id` na tabela `ProcessingSnapshot`.

## #FL-028: Serviço Híbrido de Predição de Categoria
- **Status:** Concluído (Merged no Sprint 6)
- **Descrição:** Resolver e atribuir categorias adequadas aos novos gastos de forma inteligente.
- **Resolução:** Desenvolvimento do utilitário `src/utils/categorizationService.ts` realizando busca sequencial: primeiro verifica as regras de Regex/padrões locais no SQLite; caso não encontre, aciona a IA ativa (Gemini API ou Ollama local) fornecendo a lista estruturada de categorias registradas para obter a recomendação de classificação em background.

## #FL-029: Feedback Loop de Correção de Regras
- **Status:** Concluído (Merged no Sprint 6)
- **Descrição:** O aplicativo precisava se auto-adaptar às correções de categoria que o usuário faz manualmente nas despesas sugeridas.
- **Resolução:** Inclusão de estados em `app/review.tsx` para carregar a sugestão original e, no momento de salvar, se a categoria selecionada diferir da sugestão inicial, grava ou atualiza a regra para o estabelecimento no SQLite via `saveMerchantRule`.
