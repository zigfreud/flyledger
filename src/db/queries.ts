import { CaptureRecord, CaptureRecordStatus, Category, Expense } from '../types/models';
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

export async function finalizeManualCaptureAsExpense(expense: Omit<Expense, 'id' | 'created_at' | 'updated_at'>): Promise<Expense> {
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
 * USO RESERVADO: Esta função não é usada no fluxo MANUAL do V1, 
 * pois o salvamento manual ocorre via transação atômica em finalizeManualCaptureAsExpense.
 * Mantida explicitamente para uso futuro nos fluxos complexos de QR Code e OCR.
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
    status: 'pending' | 'processing' | 'completed' | 'failed',
    rawPayload: string | null,
    extractedData: string | null
): Promise<void> {
    const db = DBManager.getDB();
    const newId = generateUUID();
    const now = Date.now();

    await db.runAsync(
        `INSERT INTO ProcessingSnapshot (id, capture_record_id, status, error_details, raw_payload, extracted_data, confidence_amount, confidence_merchant, confidence_date, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            newId, captureRecordId, status, null, rawPayload, extractedData,
            null, null, null, now, now
        ]
    );
}

export async function getProcessingSnapshotByCaptureRecordId(captureRecordId: string): Promise<any | null> {
    const db = DBManager.getDB();
    const row = await db.getFirstAsync<any>('SELECT * FROM ProcessingSnapshot WHERE capture_record_id = ? ORDER BY created_at DESC LIMIT 1;', [captureRecordId]);
    return row || null;
}
