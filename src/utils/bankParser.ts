export interface ParsedTransaction {
  amount: number; // Sempre positivo, representando a despesa
  date: number; // Timestamp em milissegundos
  description: string; // Estabelecimento / Histórico
}

/**
 * Normaliza uma string de texto para facilitar o mapeamento de cabeçalhos.
 */
function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .trim();
}

/**
 * Tenta converter uma string brasileira de data (DD/MM/AAAA ou DD/MM/AA ou AAAA-MM-DD) em timestamp.
 */
function parseDateString(dateStr: string): number | null {
  try {
    const cleanStr = dateStr.trim();
    
    // Formato ISO (AAAA-MM-DD)
    if (cleanStr.includes('-')) {
      const parts = cleanStr.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const parsed = new Date(year, month, day);
        if (!isNaN(parsed.getTime())) return parsed.getTime();
      }
    }

    // Formato Brasileiro (DD/MM/AAAA ou DD/MM/AA)
    if (cleanStr.includes('/')) {
      const parts = cleanStr.split('/');
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        let year = parseInt(parts[2], 10);
        if (year < 100) {
          year += 2000; // Ajusta ano curto de 2 dígitos
        }
        const parsed = new Date(year, month, day);
        if (!isNaN(parsed.getTime())) return parsed.getTime();
      }
    }
  } catch (err) {
    console.warn('Erro ao parsear data:', dateStr, err);
  }
  return null;
}

/**
 * Converte string brasileira de número (ex: "-45,90" ou "1.250,00") em float.
 */
function parseAmountString(amtStr: string): number | null {
  try {
    let cleanStr = amtStr.trim().replace(/\s/g, '');
    
    // Verifica se usa ponto para milhares e vírgula para decimais
    if (cleanStr.includes(',') && cleanStr.includes('.')) {
      if (cleanStr.indexOf('.') < cleanStr.indexOf(',')) {
        cleanStr = cleanStr.replace(/\./g, '').replace(',', '.'); // BR format: 1.200,50 -> 1200.50
      } else {
        cleanStr = cleanStr.replace(/,/g, ''); // US format: 1,200.50 -> 1200.50
      }
    } else if (cleanStr.includes(',')) {
      cleanStr = cleanStr.replace(',', '.'); // Apenas vírgula: 45,90 -> 45.90
    }

    const num = parseFloat(cleanStr);
    return isNaN(num) ? null : num;
  } catch (err) {
    console.warn('Erro ao parsear valor:', amtStr, err);
  }
  return null;
}

/**
 * Parser de arquivos OFX (Open Financial Exchange).
 */
function parseOfx(content: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  
  // Encontra todos os blocos de transação <STMTTRN>...</STMTTRN>
  const stmttrnRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
  let match;
  
  while ((match = stmttrnRegex.exec(content)) !== null) {
    const block = match[1];
    
    // OFX tags podem não ter fechamento (ex: <TRNAMT>-45.90 na linha)
    const amtMatch = block.match(/<TRNAMT>\s*([-\d.,]+)/i);
    const memoMatch = block.match(/<(?:MEMO|NAME)>\s*([^<\r\n]+)/i);
    const dateMatch = block.match(/<DTPOSTED>\s*(\d{8})/i);
    
    if (amtMatch) {
      const rawAmt = parseAmountString(amtMatch[1]);
      if (rawAmt !== null && rawAmt < 0) { // Somente saídas (despesas)
        const description = memoMatch ? memoMatch[1].trim() : 'Transação Banco';
        let date = Date.now();
        
        if (dateMatch) {
          const dateStr = dateMatch[1]; // YYYYMMDD
          const year = parseInt(dateStr.substring(0, 4), 10);
          const month = parseInt(dateStr.substring(4, 6), 10) - 1;
          const day = parseInt(dateStr.substring(6, 8), 10);
          const parsedDate = new Date(year, month, day);
          if (!isNaN(parsedDate.getTime())) {
            date = parsedDate.getTime();
          }
        }
        
        transactions.push({
          amount: Math.abs(rawAmt), // Armazena valor absoluto (positivo)
          date,
          description
        });
      }
    }
  }
  
  return transactions;
}

/**
 * Parser de arquivos CSV.
 */
function parseCsv(content: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);
  
  if (lines.length < 2) return [];
  
  // 1. Detecta separador (vírgula ou ponto e vírgula)
  const firstLine = lines[0];
  const separator = firstLine.split(';').length >= firstLine.split(',').length ? ';' : ',';
  
  // 2. Processa cabeçalhos
  const headers = firstLine.split(separator).map(normalizeHeader);
  
  // Mapeadores de índice
  let dateIdx = -1;
  let descIdx = -1;
  let amountIdx = -1;
  let debitIdx = -1; // Para colunas exclusivas de saídas
  
  headers.forEach((header, index) => {
    if (header.match(/^(data|date|dt|movimentacao)$/)) {
      dateIdx = index;
    } else if (header.match(/^(descricao|historico|detalhe|memo|estabelecimento|transacao)$/)) {
      descIdx = index;
    } else if (header.match(/^(valor|valor\(r\$\)|amount|lancamento|total)$/)) {
      amountIdx = index;
    } else if (header.match(/^(debito|debitos|saida|saidas)$/)) {
      debitIdx = index;
    }
  });

  // Fallback caso não ache cabeçalhos estritos, tenta heurísticas de nome
  if (dateIdx === -1) dateIdx = headers.findIndex(h => h.includes('dat') || h.includes('dt'));
  if (descIdx === -1) descIdx = headers.findIndex(h => h.includes('desc') || h.includes('hist') || h.includes('estab'));
  if (amountIdx === -1) amountIdx = headers.findIndex(h => h.includes('val') || h.includes('amo') || h.includes('total') || h.includes('saida'));

  // Se ainda assim não achar o básico, cancela o parse
  if (dateIdx === -1 || descIdx === -1 || (amountIdx === -1 && debitIdx === -1)) {
    console.warn('Cabeçalhos não identificados no CSV:', headers);
    return [];
  }

  // 3. Processa linhas
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(separator).map(col => col.replace(/^["']|["']$/g, '').trim());
    if (row.length <= Math.max(dateIdx, descIdx, amountIdx, debitIdx)) continue;

    const rawDate = row[dateIdx];
    const rawDesc = row[descIdx];
    const rawAmt = amountIdx !== -1 ? row[amountIdx] : '';
    const rawDebit = debitIdx !== -1 ? row[debitIdx] : '';

    if (!rawDate || !rawDesc) continue;

    const date = parseDateString(rawDate);
    if (!date) continue;

    // Se houver uma coluna de Débito exclusiva
    if (debitIdx !== -1 && rawDebit) {
      const amt = parseAmountString(rawDebit);
      if (amt && amt > 0) { // No Bradesco/Santander, débitos aparecem como valores positivos na coluna "Débito"
        transactions.push({
          amount: amt,
          date,
          description: rawDesc
        });
        continue;
      }
    }

    // Se houver uma coluna genérica de Valor
    if (amountIdx !== -1 && rawAmt) {
      const amt = parseAmountString(rawAmt);
      if (amt !== null) {
        // Regra geral: despesas são valores negativos em extratos bancários normais (ex: Nubank, C6, Inter)
        if (amt < 0) {
          transactions.push({
            amount: Math.abs(amt),
            date,
            description: rawDesc
          });
        }
      }
    }
  }

  return transactions;
}

/**
 * Função principal que decide o parser correto pelo tipo e processa o arquivo.
 */
export function parseBankFile(content: string, filename: string): ParsedTransaction[] {
  const lowerName = filename.toLowerCase();
  
  if (lowerName.endsWith('.ofx') || content.includes('<OFX>')) {
    return parseOfx(content);
  }
  
  // Por padrão trata como CSV
  return parseCsv(content);
}
