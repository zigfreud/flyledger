# Issues Local - Sprint 1 (Design Premium & Analytics)

## #FL-010: Migração de FlatList para FlashList na Home
- **Status:** Concluído (Merged no Sprint 1)
- **Descrição:** A FlatList da tela Home (`app/(tabs)/index.tsx`) causava lentidão desnecessária no scroll sob grande volume de dados. Foi substituída pela `@shopify/flash-list` para renderização a 120 FPS.
- **Resolução:** Utilização de `estimatedItemSize={76}` com tipo genérico explicitado no `keyExtractor` para evitar warnings do TypeScript.

## #FL-011: Design System Dark Slate & HSL Dinâmico
- **Status:** Concluído (Merged no Sprint 1)
- **Descrição:** A UI inicial possuía tons de branco genéricos que não expressavam a qualidade premium do produto.
- **Resolução:** Redesenho completo da Home e da tela de Review (`app/review.tsx`) usando fundo Slate escuro (`#0B0F19`), inputs polidos (`#1E293B`) e chips de categoria que assumem as cores HSL correspondentes quando selecionados.

## #FL-012: Dashboard Interativo SVG na aba Analytics
- **Status:** Concluído (Merged no Sprint 1)
- **Descrição:** A aba de relatórios ("explore" / "dashboard") possuía apenas dados de teste estáticos sem agregação de gastos.
- **Resolução:** Implementação de gráfico de rosca nativo usando SVG (`react-native-svg`), evolução financeira mensal em barras flexíveis e legenda dinâmica com cálculos reativos baseados nos registros do banco local.

## #FL-013: Feedback Háptico na confirmação de Despesas
- **Status:** Concluído (Merged no Sprint 1)
- **Descrição:** O usuário não recebia nenhuma confirmação tátil ao interagir com o fluxo financeiro.
- **Resolução:** Integração de `expo-haptics` para disparar feedback leve (`Light`) ao selecionar categorias e confirmação/aviso (`Success`/`Warning`) ao salvar ou descartar despesas.
