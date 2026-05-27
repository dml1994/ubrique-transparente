"""Limpia la tabla contracts de la BD, eliminando todos los registros.

Uso:
    python scripts/cleanup_contracts.py           # muestra el recuento actual
    python scripts/cleanup_contracts.py --delete  # elimina todos los registros
"""
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))
from db import get_conn


def main():
    delete = "--delete" in sys.argv

    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) AS n FROM contracts")
            row = cur.fetchone()
            count = row["n"]

        if not delete:
            print(f"Contratos en BD: {count}")
            print("Ejecuta con --delete para eliminar todos los registros.")
            return

        with conn.cursor() as cur:
            cur.execute("DELETE FROM contracts")
        conn.commit()
        print(f"{count} contratos eliminados de la BD.")


if __name__ == "__main__":
    main()
