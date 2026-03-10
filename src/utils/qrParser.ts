/**
 * Extrai sugestões mínimas offline do conteúdo bruto de um QR Code fiscal.
 * 
 * Na V1 offline, tentamos identificar padrões ingênuos na URL. 
 * Se for uma chave neutra ou URL pura do SEFAZ sem query string rica,
 * devolvemos um objeto vazio e delegamos para digitação manual com Warning.
 */
export function extractQrSuggestions(rawPayload: string): { amount?: number; date?: number; merchant_name?: string } {
    const suggestions: { amount?: number; date?: number; merchant_name?: string } = {};

    try {
        // Exemplo simplificado de extração (heuristicas de query string)
        // qr: https://www.sefaz.rs.gov.br/NFCE/NFCE-COM.aspx?chNFe=...&vNF=120.50
        // tentamos pegar um param de valor (ex: vNF=, val=, v=)

        let url: URL;
        try {
            url = new URL(rawPayload);
        } catch {
            // Não é URL, vamos ver se é JSON direto ou texto solto.
            return suggestions;
        }

        const params = url.searchParams;

        // Tentar extrair valor
        const valStr = params.get('vNF') || params.get('val') || params.get('v');
        if (valStr) {
            const num = parseFloat(valStr.replace(',', '.'));
            if (!isNaN(num) && num > 0) {
                suggestions.amount = num;
            }
        }

        // Tentar extrair data em param (muito raro em SEFAZ, mas caso exista &data=YYYYMMDD)
        const dateStr = params.get('dhEmi') || params.get('data');
        if (dateStr && dateStr.length >= 8) { // ex: 20241015
            const year = parseInt(dateStr.substring(0, 4), 10);
            const month = parseInt(dateStr.substring(4, 6), 10) - 1;
            const day = parseInt(dateStr.substring(6, 8), 10);
            suggestions.date = new Date(year, month, day).getTime();
        }

    } catch (e) {
        // Fallback silencioso offline.
    }

    return suggestions;
}
