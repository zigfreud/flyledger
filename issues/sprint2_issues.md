# Issues Local - Sprint 2 (Ajustes Avançados & OCR Híbrido)

## #FL-014: Tabela de Configurações no SQLite
- **Status:** Concluído (Merged no Sprint 2)
- **Descrição:** Era necessária uma tabela local para armazenar e ler as preferências de conexão com APIs externas e servidores locais (Ollama/Langflow), sem persistência estática temporária no código.
- **Resolução:** Criada a tabela `Settings (key PRIMARY KEY, value)` no schema relacional em `src/db/init.ts` e queries do DAO em `src/db/queries.ts`. Seeding automático inicial configurado em `src/db/seed.ts` e executado durante o bootstrap de RootLayout.

## #FL-015: Tela de Ajustes Avançados (Tab)
- **Status:** Concluído (Merged no Sprint 2)
- **Descrição:** O usuário precisava configurar chaves de API e caminhos de IP sem alterar o código-fonte.
- **Resolução:** Implementação da tela `app/(tabs)/adjusts.tsx` com campos condicionais reativos para o motor de IA selecionado (Manual, Gemini, Ollama, Langflow) e salvamento dinâmico com feedbacks visuais e hápticos.

## #FL-016: Captura de Fotos do Recibo
- **Status:** Concluído (Merged no Sprint 2)
- **Descrição:** Falta de suporte para capturar fotos e armazenar a imagem localmente antes do OCR.
- **Resolução:** Implementação do scanner de fotos em `app/scan-receipt.tsx` integrado com a câmera do celular via `expo-camera`, gerando o `CaptureRecord` do tipo `IMAGE`.

## #FL-017: Conversão em Base64 & Chamadas OCR Híbridas
- **Status:** Concluído (Merged no Sprint 2)
- **Descrição:** O aplicativo precisava se comunicar com APIs externas usando arquivos de imagem locais sem depender de prebuilds pesadas ou customizações complexas que quebrariam a execução no Expo Go.
- **Resolução:** Desenvolvimento do serviço `src/utils/ocrService.ts` utilizando a biblioteca `expo-file-system` para ler e codificar a imagem local em base64 e despachar as requisições HTTP (com formato estruturado JSON forçado) para a API do Gemini ou servidor Ollama local.
