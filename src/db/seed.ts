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
