import * as SQLite from 'expo-sqlite';

// Simple UUID generator
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

export async function seedDB(db: SQLite.SQLiteDatabase) {
    const categoriesCount = db.getFirstSync<{ count: number }>('SELECT COUNT(*) as count FROM Category');

    if (categoriesCount && categoriesCount.count === 0) {
        console.log('Seeding initial categories...');
        const statement = db.prepareSync('INSERT INTO Category (id, name, icon, color, is_active) VALUES (?, ?, ?, ?, ?)');
        try {
            statement.executeSync([generateUUID(), 'Alimentação', 'fast-food', '#FF5722', 1]);
            statement.executeSync([generateUUID(), 'Transporte', 'car-sport', '#2196F3', 1]);
            statement.executeSync([generateUUID(), 'Casa', 'home', '#4CAF50', 1]);
            statement.executeSync([generateUUID(), 'Saúde', 'medkit', '#E91E63', 1]);
            statement.executeSync([generateUUID(), 'Lazer', 'game-controller', '#9C27B0', 1]);
            console.log('Categories seeded successfully.');
        } finally {
            statement.finalizeSync();
        }
    }
}
