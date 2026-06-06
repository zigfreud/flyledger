import * as SQLite from 'expo-sqlite';

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

export async function seedCategoriesIfEmpty(db: SQLite.SQLiteDatabase) {
    const result = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM Category;');

    if (result && result.count === 0) {
        console.log('Seeding initial categories...');

        // Inserção das 5 categorias iniciais
        const insertStatement = await db.prepareAsync(
            'INSERT INTO Category (id, name, icon, color, is_active) VALUES (?, ?, ?, ?, ?)'
        );

        try {
            await insertStatement.executeAsync([generateUUID(), 'Alimentação', 'fast-food', '#FF5722', 1]);
            await insertStatement.executeAsync([generateUUID(), 'Transporte', 'car-sport', '#2196F3', 1]);
            await insertStatement.executeAsync([generateUUID(), 'Casa', 'home', '#4CAF50', 1]);
            await insertStatement.executeAsync([generateUUID(), 'Saúde', 'medkit', '#E91E63', 1]);
            await insertStatement.executeAsync([generateUUID(), 'Lazer', 'game-controller', '#9C27B0', 1]);

            console.log('Categories seeded successfully.');
        } finally {
            await insertStatement.finalizeAsync();
        }
    } else {
        console.log('Categories already seeded. Count:', result?.count);
    }
}

export async function seedDefaultSettingsIfEmpty(db: SQLite.SQLiteDatabase) {
    const result = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM Settings;');

    if (result && result.count === 0) {
        console.log('Seeding default settings...');
        await db.runAsync("INSERT INTO Settings (key, value) VALUES ('ai_engine', 'manual');");
        await db.runAsync("INSERT INTO Settings (key, value) VALUES ('gemini_api_key', '');");
        await db.runAsync("INSERT INTO Settings (key, value) VALUES ('ollama_url', 'http://192.168.1.50:11434');");
        await db.runAsync("INSERT INTO Settings (key, value) VALUES ('langflow_url', '');");
        await db.runAsync("INSERT INTO Settings (key, value) VALUES ('langflow_token', '');");
        console.log('Default settings seeded successfully.');
    } else {
        console.log('Settings already seeded. Count:', result?.count);
    }
}

export async function seedDefaultMerchantRulesIfEmpty(db: SQLite.SQLiteDatabase) {
    const result = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM MerchantRule;');

    if (result && result.count === 0) {
        console.log('Seeding initial merchant rules...');
        
        // Lookup categories to get their UUIDs
        const categories = await db.getAllAsync<{ id: string; name: string }>('SELECT id, name FROM Category;');
        const catMap = new Map(categories.map(c => [c.name, c.id]));

        const alimentacaoId = catMap.get('Alimentação');
        const transporteId = catMap.get('Transporte');
        const lazerId = catMap.get('Lazer');

        const insertStatement = await db.prepareAsync(
            'INSERT INTO MerchantRule (id, merchant_pattern, category_id) VALUES (?, ?, ?)'
        );

        try {
            if (transporteId) {
                await insertStatement.executeAsync([generateUUID(), 'uber', transporteId]);
                await insertStatement.executeAsync([generateUUID(), '99app', transporteId]);
                await insertStatement.executeAsync([generateUUID(), 'posto', transporteId]);
            }
            if (alimentacaoId) {
                await insertStatement.executeAsync([generateUUID(), 'ifood', alimentacaoId]);
                await insertStatement.executeAsync([generateUUID(), 'mcdonald', alimentacaoId]);
                await insertStatement.executeAsync([generateUUID(), 'restaurante', alimentacaoId]);
                await insertStatement.executeAsync([generateUUID(), 'mercado', alimentacaoId]);
                await insertStatement.executeAsync([generateUUID(), 'supermercado', alimentacaoId]);
            }
            if (lazerId) {
                await insertStatement.executeAsync([generateUUID(), 'netflix', lazerId]);
                await insertStatement.executeAsync([generateUUID(), 'spotify', lazerId]);
                await insertStatement.executeAsync([generateUUID(), 'steam', lazerId]);
            }
            console.log('Merchant rules seeded successfully.');
        } finally {
            await insertStatement.finalizeAsync();
        }
    } else {
        console.log('Merchant rules already seeded. Count:', result?.count);
    }
}
