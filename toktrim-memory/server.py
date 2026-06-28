import os
import sqlite3
from mcp.server.fastmcp import FastMCP

DB_PATH = os.path.expanduser(
    os.environ.get("TOKTRIM_MEMORY_DB_PATH", "~/.cache/toktrim/memory.db")
)

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    # Usando FTS5 (Full Text Search) para permitir buscas por similaridade textual ultrarrápidas
    cursor.execute('''
        CREATE VIRTUAL TABLE IF NOT EXISTS memory_fts USING fts5(
            concept,
            context,
            tokenize='porter'
        )
    ''')
    conn.commit()
    conn.close()

init_db()

mcp = FastMCP("TokTrim-Memory")

@mcp.tool()
def store_memory(concept: str, context: str) -> str:
    """
    Grava de forma permanente uma decisão técnica, correção de bug ou convenção arquitetural na memória da IA.
    Utilize essa ferramenta para guardar o "Porquê" das coisas, regras de negócio ou caminhos críticos para não esquecer em sessões futuras.
    """
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("INSERT INTO memory_fts (concept, context) VALUES (?, ?)", (concept, context))
        conn.commit()
        conn.close()
        return f"Memória gravada com sucesso no NeoCortex. Conceito: {concept}"
    except Exception as e:
        return f"Falha ao gravar memória: {str(e)}"

@mcp.tool()
def search_memory(query: str) -> str:
    """
    Busca na memória persistente da IA por decisões passadas, bugs já resolvidos ou regras de arquitetura.
    Faça buscas por palavras-chave ou conceitos (Ex: 'database auth', 'cors error fix').
    """
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        # A magia do FTS5: Busca indexada ultra leve
        cursor.execute("SELECT concept, context FROM memory_fts WHERE memory_fts MATCH ? ORDER BY rank LIMIT 5", (query,))
        results = cursor.fetchall()
        conn.close()
        
        if not results:
            return "Nenhuma lembrança encontrada para essa query."
            
        formatted = "\n---\n".join([f"🧠 [{r[0]}]: {r[1]}" for r in results])
        return formatted
    except Exception as e:
        return f"Falha ao buscar memória: {str(e)}"

if __name__ == "__main__":
    mcp.run()
