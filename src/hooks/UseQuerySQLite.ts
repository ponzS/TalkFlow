import { ref, Ref, onMounted } from 'vue';
import { SQLiteDBConnection } from '@capacitor-community/sqlite';

export const useQuerySQLite = async (
  db: Ref<SQLiteDBConnection | null>,
  stmt: string,
  values: any[]
) => {
    if (db.value) {
        try {
          const queryResult = await db.value.query(stmt, values);
          return queryResult.values as never[];
        } catch (err: any) {
          const msg = err.message ? err.message : err;
          throw new Error(`useQuerySQLite: ${msg}`);
        }
    }
    return [];
};  