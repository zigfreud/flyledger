# FlyLedger 🚀

FlyLedger é um gerenciador de finanças pessoais moderno e de alta performance, construído com **React Native (Expo)** e **TypeScript**, sob o paradigma **Local-First (Offline-First)**.

O aplicativo opera inteiramente no dispositivo do usuário usando **SQLite**, garantindo latência quase zero (< 2ms) em operações de leitura/gravação, privacidade absoluta dos dados financeiros e funcionamento offline ininterrupto. Além disso, conta com recursos de OCR híbrido, chatbot financeiro de IA e auto-categorização inteligente com ciclo de feedback dinâmico.

---

## ✨ Principais Funcionalidades

### 🎨 1. Design Premium & Analytics Reativo
* **Performance Extrema:** Listagem principal otimizada com `@shopify/flash-list` para rolagem suave a 120 FPS.
* **Aparência Dark Slate:** Identidade visual sofisticada e moderna com tons escuros (`#0B0F19`) e acentos HSL vibrantes de acordo com cada categoria.
* **Analytics com SVG:** Gráficos nativos de rosca e barras mensais construídos inteiramente em SVG (`react-native-svg`), atualizados instantaneamente conforme despesas são adicionadas.
* **Feedback Háptico:** Integração precisa de `expo-haptics` para respostas tácteis em cliques, salvamento de despesas e alertas de erro.

### 📸 2. Captura Multimodal e OCR Híbrido
* **Leitor de QR Code Fiscal:** Parser offline de URLs fiscais do SEFAZ brasileiro. Extrai data e valor total diretamente da URL de forma instantânea.
* **OCR de Recibos Físicos:** Scanner integrado de câmera (`expo-camera`) para tirar fotos de cupons e submeter à extração de texto via chamada Base64 (compatível com Expo Go).
* **Motores Flexíveis:** Suporte nativo nas configurações para selecionar o motor de IA/OCR desejado: **Manual**, **Gemini API**, **Ollama local** (servido do PC, ex: `llama3.2-vision`) ou **Langflow**.

### 🏦 3. Importação de Extratos e Conciliação
* **Seletor Nativo:** Importação de extratos via `expo-document-picker`.
* **Parser Offline:** Leitura e normalização de arquivos CSV/OFX dos bancos **C6 Bank, Inter, Santander, BTG Pactual e Bradesco**.
* **Deck de Conciliação:** Fila horizontal de transações pendentes de revisão exibida no topo da Home. O usuário pode validar cada transação de forma fluida.

### 💬 4. Assistente IA de Finanças
* **Privacidade Máxima:** Agrega estatísticas mensais e maiores gastos dos últimos 30 dias (`getChatContextStats`) e as injeta no prompt do sistema da IA, mantendo as transações detalhadas confidenciais.
* **Histórico e Chat:** Aba dedicada de chat com balões esteticamente polidos, sugestões rápidas de perguntas e respostas táteis rápidas.

### 💾 5. Relatórios & Backups Locais
* **Exportação para Excel:** Gera planilha CSV contendo cabeçalho BOM UTF-8 (`\uFEFF`) e delimitador ponto e vírgula, abrindo sem quebrar formatação de acentos e ponto decimal no Excel brasileiro.
* **Backups Atômicos (JSON):** Exportação e restauração completa das tabelas (`Expense`, `Category`, `Settings`, `CaptureRecord`, `ProcessingSnapshot`, `MerchantRule`) sob garantias transacionais ACID (SQLite `BEGIN/COMMIT`).
* **Compartilhamento Nativo:** Integração com as folhas nativas do sistema operacional via `expo-sharing`.

### 🧠 6. Auto-Categorização & Loop de Aprendizado
* **Predição Híbrida:** O app busca regras deRegex e padrões locais (`MerchantRule`) no SQLite. Se não encontrar, consulta a IA configurada passando a lista de categorias existentes.
* **Feedback Loop:** Ao corrigir ou selecionar uma categoria diferente no Review, o app aprende e grava automaticamente uma nova regra `MerchantRule` para que as próximas transações daquele estabelecimento sejam categorizadas instantaneamente.

---

## 🛠️ Tecnologias Utilizadas

* **Framework:** Expo SDK 54 (React Native)
* **Linguagem:** TypeScript
* **Roteamento:** Expo Router (File-based Routing)
* **Banco de Dados:** `expo-sqlite` (Local SQL Engine)
* **Renderização de Listas:** `@shopify/flash-list`
* **Feedback Háptico:** `expo-haptics`
* **Navegação e Seleção de Documentos:** `expo-document-picker` & `expo-sharing`
* **Estilização:** Vanilla CSS / React Native StyleSheet

---

## 🚀 Como Executar o Projeto Localmente

### Pré-requisitos
1. **Node.js** instalado (LTS recomendado).
2. Aplicativo **Expo Go** instalado no seu celular Android ou iOS para rodar em dispositivo físico.
3. Caso queira rodar o motor local de IA, certifique-se de ter o **Ollama** rodando no seu computador na mesma rede local.

### Passos para Inicialização

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/zigfreud/flyledger.git
   cd flyledger
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   ```

3. **Inicie o servidor de desenvolvimento do Expo:**
   ```bash
   npx expo start
   ```

4. **Escaneie o QR Code** exibido no terminal utilizando o aplicativo Expo Go no seu celular.

---

## 📂 Estrutura de Diretórios

```
├── app/                  # Roteamento baseado em arquivos (Expo Router)
│   ├── (tabs)/           # Abas principais (Home, Analytics, Chat, Ajustes)
│   │   ├── index.tsx     # Home & Deck de Conciliação
│   │   ├── dashboard.tsx # Relatórios Gráficos SVG
│   │   ├── chat.tsx      # Chatbot de IA Financeira
│   │   └── adjusts.tsx   # Configurações & Backups
│   ├── _layout.tsx       # Layout raiz e carregamento do DB
│   ├── review.tsx        # Tela de Revisão e Feedback Loop
│   ├── scan-qr.tsx       # Câmera para scanner de QR Code
│   └── scan-receipt.tsx  # Câmera para foto de cupom/recibo
├── src/
│   ├── components/       # Componentes reusáveis (FAB, Action Sheet)
│   ├── db/               # Banco de dados (Inicialização, Seeds e Queries DAO)
│   │   ├── database.ts   # Conexão e PRAGMAs do SQLite
│   │   ├── init.ts       # Schema do banco e migrações
│   │   ├── queries.ts    # Transações ACID e consultas DAO
│   │   └── seed.ts       # Categorias e Regras padrão
│   ├── types/            # Tipagens globais do TypeScript
│   └── utils/            # Serviços de OCR, IA, Banco e Classificação
│       ├── bankParser.ts # Parsers de extratos (C6, Inter, etc.)
│       ├── categorizationService.ts # Motor híbrido de predição
│       ├── chatService.ts# Interface com APIs de IA (Gemini/Ollama)
│       ├── ocrService.ts # Envio Base64 para OCR
│       └── qrParser.ts   # Parse offline de URLs fiscais
└── constants/            # Constantes de Tema e Cores
```

---

## ⚙️ Configuração dos Motores de IA

Na aba **Ajustes** dentro do aplicativo, você pode personalizar a inteligência artificial do app:

1. **Manual:** Sem chamadas externas. Útil para quem busca privacidade total offline imediata.
2. **Gemini API:** Forneça sua chave de API da Google Gemini. O app fará as requisições diretamente para a API oficial do Gemini.
3. **Ollama:** Insira o IP da sua máquina na rede local e a porta (ex: `http://192.168.1.100:11434`) junto com o modelo desejado (ex: `llama3.2-vision` ou `llava` para imagens, e `llama3.2` ou `gemma` para o chat). Certifique-se de que o Ollama esteja configurado para aceitar requisições de origem externa (`OLLAMA_HOST=0.0.0.0`).
4. **Langflow:** Insira o endpoint do seu fluxo personalizado do Langflow.

---

## 🔒 Compromisso com a Privacidade

O FlyLedger não possui banco de dados em nuvem próprio e não armazena nenhuma transação em servidores externos. Tudo o que você digita, escaneia ou importa permanece de forma isolada na sandbox segura do aplicativo dentro do seu dispositivo físico.
