import sqlite3

DATABASE_URL = "docling.db"

def get_db_connection():
    conn = sqlite3.connect(DATABASE_URL)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS files (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        original_filename TEXT,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        started_at TEXT,
        completed_at TEXT
    );
    """)

    # Handle migration for existing databases gracefully
    try:
        cursor.execute('ALTER TABLE files ADD COLUMN original_filename TEXT;')
    except sqlite3.OperationalError:
        # Column already exists, which is fine
        pass

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS conversion_jobs (
        id TEXT PRIMARY KEY,
        file_id TEXT NOT NULL,
        status TEXT NOT NULL,
        result TEXT,
        error_message TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (file_id) REFERENCES files (id)
    );
    """)

    conn.commit()
    conn.close()

if __name__ == "__main__":
    init_db()
