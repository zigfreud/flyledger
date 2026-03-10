import * as SQLite from 'expo-sqlite';

class DatabaseManager {
    private static instance: SQLite.SQLiteDatabase | null = null;
    private static isInitialized = false;

    static async init(): Promise<SQLite.SQLiteDatabase> {
        if (!this.instance) {
            this.instance = await SQLite.openDatabaseAsync('gastos.db');

            // Sempre no init garantimos que a API respeite FKs independentemente de cache
            await this.instance.execAsync('PRAGMA foreign_keys = ON;');
            this.isInitialized = true;
        }
        return this.instance;
    }

    static getDB(): SQLite.SQLiteDatabase {
        if (!this.instance || !this.isInitialized) {
            throw new Error('Database not initialized. Call DBManager.init() during app bootstrap.');
        }
        return this.instance;
    }
}

export default DatabaseManager;
