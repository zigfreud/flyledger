import { CaptureRecord, CaptureRecordStatus, Category, Expense, ProcessingSnapshot } from '../types/models';
import DBManager from './database';

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

export async function getActiveCategories(): Promise<Category[]> {
    const db = DBManager.getDB();
    return await db.getAllAsync<Category>('SELECT * FROM Category WHERE is_active = 1 ORDER BY name ASC;');
}

export async function createManualCaptureRecord(): Promise<CaptureRecord> {
    const db = DBManager.getDB();
    const newRecord: CaptureRecord = {
        id: generateUUID(),
        capture_type: 'MANUAL',
        captured_at: Date.now(),
        status: 'pending_review',
        media_local_path: null,
        raw_payload: null,
        payload_format: null,
        failure_reason: null
    };

    await db.runAsync(
        `INSERT INTO CaptureRecord (id, capture_type, captured_at, status, media_local_path, raw_payload, payload_format, failure_reason) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            newRecord.id, newRecord.capture_type, newRecord.captured_at, newRecord.status,
            newRecord.media_local_path, newRecord.raw_payload, newRecord.payload_format, newRecord.failure_reason
        ]
    );
    return newRecord;
}

export async function createQrCaptureRecord(rawPayload: string, payloadFormat: 'URL' | 'TEXT' = 'URL'): Promise<CaptureRecord> {
    const db = DBManager.getDB();
    const newRecord: CaptureRecord = {
        id: generateUUID(),
        capture_type: 'QR_CODE',
        captured_at: Date.now(),
        status: 'captured', // Initial status before parser
        media_local_path: null,
        raw_payload: rawPayload,
        payload_format: payloadFormat,
        failure_reason: null
    };

    await db.runAsync(
        `INSERT INTO CaptureRecord (id, capture_type, captured_at, status, media_local_path, raw_payload, payload_format, failure_reason) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            newRecord.id, newRecord.capture_type, newRecord.captured_at, newRecord.status,
            newRecord.media_local_path, newRecord.raw_payload, newRecord.payload_format, newRecord.failure_reason
        ]
    );
    return newRecord;
}

export async function createImageCaptureRecord(mediaLocalPath: string): Promise<CaptureRecord> {
    const db = DBManager.getDB();
    const newRecord: CaptureRecord = {
        id: generateUUID(),
        capture_type: 'IMAGE',
        captured_at: Date.now(),
        status: 'captured',
        media_local_path: mediaLocalPath,
        raw_payload: null,
        payload_format: null,
        failure_reason: null
    };

    await db.runAsync(
        `INSERT INTO CaptureRecord (id, capture_type, captured_at, status, media_local_path, raw_payload, payload_format, failure_reason) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            newRecord.id, newRecord.capture_type, newRecord.captured_at, newRecord.status,
            newRecord.media_local_path, newRecord.raw_payload, newRecord.payload_format, newRecord.failure_reason
        ]
    );
    return newRecord;
}

export async function updateCaptureRecordStatus(id: string, status: CaptureRecordStatus): Promise<void> {
    const db = DBManager.getDB();
    await db.runAsync('UPDATE CaptureRecord SET status = ? WHERE id = ?;', [status, id]);
}

export async function discardCaptureRecord(id: string): Promise<void> {
    const db = DBManager.getDB();
    const result = await db.runAsync("UPDATE CaptureRecord SET status = 'discarded' WHERE id = ?;", [id]);
    if (result.changes === 0) {
        throw new Error('Falha ao descartar: Registro de captura não encontrado.');
    }
}

export async function finalizeCaptureAsExpense(expense: Omit<Expense, 'id' | 'created_at' | 'updated_at'>): Promise<Expense> {
    const db = DBManager.getDB();
    const newId = generateUUID();
    const now = Date.now();

    await db.execAsync('BEGIN TRANSACTION;');
    try {
        await db.runAsync(
            `INSERT INTO Expense (id, capture_record_id, category_id, amount, date, merchant_name, description, retained_image_path, created_at, updated_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                newId, expense.capture_record_id, expense.category_id, expense.amount, expense.date,
                expense.merchant_name, expense.description, expense.retained_image_path, now, now
            ]
        );

        const recordUpdate = await db.runAsync(
            "UPDATE CaptureRecord SET status = 'validated' WHERE id = ?;",
            [expense.capture_record_id]
        );

        if (recordUpdate.changes === 0) {
            throw new Error('CaptureRecord base não foi encontrado para atualização de status.');
        }

        await db.execAsync('COMMIT;');
    } catch (error) {
        await db.execAsync('ROLLBACK;');
        throw error;
    }

    return { ...expense, id: newId, created_at: now, updated_at: now } as Expense;
}

/**
 * USO RESERVADO: Esta função não é usada nos fluxos locais da V1, 
 * pois o salvamento ocorre via transação atômica em finalizeCaptureAsExpense.
 * Mantida explicitamente para uso futuro nos fluxos complexos assíncronos de OCR.
 */
export async function createExpense(expense: Omit<Expense, 'id' | 'created_at' | 'updated_at'>): Promise<Expense> {
    const db = DBManager.getDB();
    const newId = generateUUID();
    const now = Date.now();

    await db.runAsync(
        `INSERT INTO Expense (id, capture_record_id, category_id, amount, date, merchant_name, description, retained_image_path, created_at, updated_at) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            newId, expense.capture_record_id, expense.category_id, expense.amount, expense.date,
            expense.merchant_name, expense.description, expense.retained_image_path, now, now
        ]
    );

    return { ...expense, id: newId, created_at: now, updated_at: now } as Expense;
}

export async function updateExpense(id: string, updates: Partial<Omit<Expense, 'id' | 'capture_record_id' | 'created_at'>>): Promise<void> {
    const db = DBManager.getDB();
    const now = Date.now();

    // Constroi campos de update dinamicamente
    const entries = Object.entries(updates).filter(([_, value]) => value !== undefined);
    if (entries.length === 0) return;

    const setClauses = entries.map(([key]) => `${key} = ?`).join(', ');
    const values = entries.map(([_, value]) => value);

    await db.runAsync(
        `UPDATE Expense SET ${setClauses}, updated_at = ? WHERE id = ?;`,
        [...values, now, id]
    );
}

export async function listExpensesOrderedByDate(): Promise<(Expense & { category: Category })[]> {
    const db = DBManager.getDB();
    // Relacionamento com Category via JOIN
    const result = await db.getAllAsync<any>(`
    SELECT e.*, c.name as category_name, c.icon as category_icon, c.color as category_color, c.is_active as category_is_active 
    FROM Expense e
    LEFT JOIN Category c ON e.category_id = c.id
    ORDER BY e.date DESC, e.created_at DESC;
  `);

    return result.map(row => ({
        id: row.id,
        capture_record_id: row.capture_record_id,
        category_id: row.category_id,
        amount: row.amount,
        date: row.date,
        merchant_name: row.merchant_name,
        description: row.description,
        retained_image_path: row.retained_image_path,
        created_at: row.created_at,
        updated_at: row.updated_at,
        category: {
            id: row.category_id,
            name: row.category_name,
            icon: row.category_icon,
            color: row.category_color,
            is_active: row.category_is_active
        }
    }));
}

export async function getExpenseById(id: string): Promise<Expense | null> {
    const db = DBManager.getDB();
    const row = await db.getFirstAsync<Expense>('SELECT * FROM Expense WHERE id = ?;', [id]);
    return row || null;
}

export async function getCaptureRecordById(id: string): Promise<CaptureRecord | null> {
    const db = DBManager.getDB();
    const row = await db.getFirstAsync<CaptureRecord>('SELECT * FROM CaptureRecord WHERE id = ?;', [id]);
    return row || null;
}

export async function createProcessingSnapshot(
    captureRecordId: string,
    normalizedText: string | null,
    suggestedDate: number | null,
    suggestedAmount: number | null,
    suggestedMerchant: string | null,
    warnings: string | null
): Promise<void> {
    const db = DBManager.getDB();
    const newId = generateUUID();
    const now = Date.now();

    await db.runAsync(
        `INSERT INTO ProcessingSnapshot (
            id, capture_record_id, processed_at, normalized_text, 
            suggested_date, suggested_date_confidence, 
            suggested_amount, suggested_amount_confidence, 
            suggested_merchant, suggested_merchant_confidence, 
            warnings
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            newId, captureRecordId, now, normalizedText,
            suggestedDate, suggestedDate ? 'MEDIUM' : null,
            suggestedAmount, suggestedAmount ? 'MEDIUM' : null,
            suggestedMerchant, suggestedMerchant ? 'LOW' : null,
            warnings
        ]
    );
}

export async function getProcessingSnapshotByCaptureRecordId(captureRecordId: string): Promise<ProcessingSnapshot | null> {
    const db = DBManager.getDB();
    const row = await db.getFirstAsync<ProcessingSnapshot>('SELECT * FROM ProcessingSnapshot WHERE capture_record_id = ? ORDER BY processed_at DESC LIMIT 1;', [captureRecordId]);
    return row || null;
}

export async function getSettings(): Promise<{ [key: string]: string }> {
    const db = DBManager.getDB();
    const rows = await db.getAllAsync<{ key: string; value: string }>('SELECT * FROM Settings;');
    const settings: { [key: string]: string } = {};
    rows.forEach(row => {
        settings[row.key] = row.value;
    });
    return settings;
}

export async function getSettingByKey(key: string): Promise<string | null> {
    const db = DBManager.getDB();
    const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM Settings WHERE key = ?;', [key]);
    return row ? row.value : null;
}

export async function updateSetting(key: string, value: string): Promise<void> {
    const db = DBManager.getDB();
    await db.runAsync('INSERT OR REPLACE INTO Settings (key, value) VALUES (?, ?);', [key, value]);
}

export async function listPendingCaptureRecords(): Promise<(CaptureRecord & { snapshot: ProcessingSnapshot | null })[]> {
    const db = DBManager.getDB();
    const records = await db.getAllAsync<any>(
        `SELECT cr.*, 
                ps.id as ps_id, ps.processed_at as ps_processed_at, ps.normalized_text as ps_normalized_text,
                ps.suggested_date as ps_suggested_date, ps.suggested_date_confidence as ps_suggested_date_confidence,
                ps.suggested_amount as ps_suggested_amount, ps.suggested_amount_confidence as ps_suggested_amount_confidence,
                ps.suggested_merchant as ps_suggested_merchant, ps.suggested_merchant_confidence as ps_suggested_merchant_confidence,
                ps.warnings as ps_warnings
         FROM CaptureRecord cr
         LEFT JOIN ProcessingSnapshot ps ON cr.id = ps.capture_record_id
         WHERE cr.status = 'pending_review'
         ORDER BY cr.captured_at DESC;`
    );

    return records.map(row => ({
        id: row.id,
        capture_type: row.capture_type,
        captured_at: row.captured_at,
        status: row.status,
        media_local_path: row.media_local_path,
        raw_payload: row.raw_payload,
        payload_format: row.payload_format,
        failure_reason: row.failure_reason,
        snapshot: row.ps_id ? {
            id: row.ps_id,
            capture_record_id: row.id,
            processed_at: row.ps_processed_at,
            normalized_text: row.ps_normalized_text,
            suggested_date: row.ps_suggested_date,
            suggested_date_confidence: row.ps_suggested_date_confidence,
            suggested_amount: row.ps_suggested_amount,
            suggested_amount_confidence: row.ps_suggested_amount_confidence,
            suggested_merchant: row.ps_suggested_merchant,
            suggested_merchant_confidence: row.ps_suggested_merchant_confidence,
            warnings: row.ps_warnings
        } : null
    }));
}

export async function importBankTransaction(amount: number, date: number, description: string): Promise<void> {
    const db = DBManager.getDB();
    const recordId = generateUUID();
    const snapshotId = generateUUID();
    const now = Date.now();

    await db.execAsync('BEGIN TRANSACTION;');
    try {
        await db.runAsync(
            `INSERT INTO CaptureRecord (id, capture_type, captured_at, status, media_local_path, raw_payload, payload_format, failure_reason) 
             VALUES (?, 'MANUAL', ?, 'pending_review', NULL, ?, 'TEXT', NULL)`,
            [recordId, now, `Import: ${description}`]
        );

        await db.runAsync(
            `INSERT INTO ProcessingSnapshot (
                 id, capture_record_id, processed_at, normalized_text, 
                 suggested_date, suggested_date_confidence, 
                 suggested_amount, suggested_amount_confidence, 
                 suggested_merchant, suggested_merchant_confidence, 
                 warnings
             ) VALUES (?, ?, ?, ?, ?, 'HIGH', ?, 'HIGH', ?, 'HIGH', ?)`,
            [
                snapshotId, recordId, now, `Imported bank transaction: ${description}`,
                date, amount, description, 'Transação importada do extrato. Revise e selecione a categoria.'
            ]
        );

        await db.execAsync('COMMIT;');
    } catch (error) {
        await db.execAsync('ROLLBACK;');
        throw error;
    }
}

export async function getChatContextStats(): Promise<{
    totalGeral30Dias: number;
    detalheCategorias: { nome: string; valor: number; contagem: number }[];
    maioresDespesas: { valor: number; data: string; estabelecimento: string; descricao: string }[];
}> {
    const db = DBManager.getDB();
    const trintaDiasAtras = Date.now() - 30 * 24 * 60 * 60 * 1000;

    // 1. Total Geral últimos 30 dias
    const rowTotal = await db.getFirstAsync<{ total: number }>(
        `SELECT SUM(amount) as total FROM Expense WHERE date >= ?;`,
        [trintaDiasAtras]
    );
    const totalGeral30Dias = rowTotal?.total || 0;

    // 2. Detalhe por Categorias nos últimos 30 dias
    const rowsCategorias = await db.getAllAsync<any>(
        `SELECT c.name, SUM(e.amount) as total, COUNT(e.id) as contagem
         FROM Expense e
         JOIN Category c ON e.category_id = c.id
         WHERE e.date >= ?
         GROUP BY c.id
         ORDER BY total DESC;`,
        [trintaDiasAtras]
    );
    const detalheCategorias = rowsCategorias.map(row => ({
        nome: row.name,
        valor: row.total || 0,
        contagem: row.contagem || 0
    }));

    // 3. Maiores despesas últimos 30 dias
    const rowsMaiores = await db.getAllAsync<any>(
        `SELECT amount, date, merchant_name, description
         FROM Expense
         WHERE date >= ?
         ORDER BY amount DESC
         LIMIT 5;`,
        [trintaDiasAtras]
    );
    const maioresDespesas = rowsMaiores.map(row => ({
        valor: row.amount,
        data: new Date(row.date).toLocaleDateString('pt-BR'),
        estabelecimento: row.merchant_name || 'Sem estabelecimento',
        descricao: row.description || ''
    }));

    return { totalGeral30Dias, detalheCategorias, maioresDespesas };
}

export async function getBackupPayload(): Promise<any> {
    const db = DBManager.getDB();
    const expenses = await db.getAllAsync('SELECT * FROM Expense;');
    const categories = await db.getAllAsync('SELECT * FROM Category;');
    const settings = await db.getAllAsync('SELECT * FROM Settings;');
    const captures = await db.getAllAsync('SELECT * FROM CaptureRecord;');
    const snapshots = await db.getAllAsync('SELECT * FROM ProcessingSnapshot;');

    return {
        version: 1,
        exported_at: Date.now(),
        expenses,
        categories,
        settings,
        captures,
        snapshots
    };
}

export async function restoreBackupPayload(payload: any): Promise<{ expensesCount: number }> {
    const db = DBManager.getDB();

    if (!payload || payload.version !== 1) {
        throw new Error('Formato de backup inválido ou versão não suportada.');
    }

    const { expenses, categories, settings, captures, snapshots } = payload;

    if (!Array.isArray(expenses) || !Array.isArray(categories) || !Array.isArray(settings) || !Array.isArray(captures) || !Array.isArray(snapshots)) {
        throw new Error('Estrutura de dados do backup corrompida.');
    }

    await db.execAsync('BEGIN TRANSACTION;');
    try {
        // 1. Restaurar Categorias
        for (const cat of categories) {
            await db.runAsync(
                'INSERT OR REPLACE INTO Category (id, name, icon, color, is_active) VALUES (?, ?, ?, ?, ?);',
                [cat.id, cat.name, cat.icon, cat.color, cat.is_active !== undefined ? cat.is_active : 1]
            );
        }

        // 2. Restaurar Settings
        for (const set of settings) {
            await db.runAsync(
                'INSERT OR REPLACE INTO Settings (key, value) VALUES (?, ?);',
                [set.key, set.value]
            );
        }

        // 3. Restaurar CaptureRecords
        for (const cap of captures) {
            await db.runAsync(
                `INSERT OR REPLACE INTO CaptureRecord (id, capture_type, captured_at, status, media_local_path, raw_payload, payload_format, failure_reason) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
                [cap.id, cap.capture_type, cap.captured_at, cap.status, cap.media_local_path, cap.raw_payload, cap.payload_format, cap.failure_reason]
            );
        }

        // 4. Restaurar ProcessingSnapshots
        for (const snap of snapshots) {
            await db.runAsync(
                `INSERT OR REPLACE INTO ProcessingSnapshot (
                     id, capture_record_id, processed_at, normalized_text, 
                     suggested_date, suggested_date_confidence, 
                     suggested_amount, suggested_amount_confidence, 
                     suggested_merchant, suggested_merchant_confidence, 
                     warnings
                 ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
                [
                    snap.id, snap.capture_record_id, snap.processed_at, snap.normalized_text,
                    snap.suggested_date, snap.suggested_date_confidence,
                    snap.suggested_amount, snap.suggested_amount_confidence,
                    snap.suggested_merchant, snap.suggested_merchant_confidence,
                    snap.warnings
                ]
            );
        }

        // 5. Restaurar Expenses
        for (const exp of expenses) {
            await db.runAsync(
                `INSERT OR REPLACE INTO Expense (id, capture_record_id, category_id, amount, date, merchant_name, description, retained_image_path, created_at, updated_at) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
                [
                    exp.id, exp.capture_record_id, exp.category_id, exp.amount, exp.date,
                    exp.merchant_name, exp.description, exp.retained_image_path, exp.created_at, exp.updated_at
                ]
            );
        }

        await db.execAsync('COMMIT;');
        return { expensesCount: expenses.length };
    } catch (error) {
        await db.execAsync('ROLLBACK;');
        throw error;
    }
}


