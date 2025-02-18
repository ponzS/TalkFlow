export const UserUpgradeStatements = [
    {
    toVersion: 1,
    statements: [
        `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        active INTEGER DEFAULT 1
        );`
    ]
    },
    /* add new statements below for next database version when required*/
    /*
    {
    toVersion: 2,
    statements: [
        `ALTER TABLE users ADD COLUMN email TEXT;`,
    ]
    },
    */
];
