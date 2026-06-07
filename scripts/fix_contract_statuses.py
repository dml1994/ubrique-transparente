"""
Corrige el campo `status` de los contratos en BD usando las páginas de detalle
de la PCSP. Fetcha cada source_url, extrae el "State of the Tender" y actualiza.
"""

import os
import re
import logging
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Optional

from html import unescape as html_unescape

import requests
import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env.local"))

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

# ─── Mapeo de estados PCSP → enum BD ─────────────────────────────────────────

HTML_STATUS_MAP = {
    "adjudicada":      "awarded",
    "adjudicado":      "awarded",
    "formalizado":     "awarded",
    "formalizada":     "awarded",
    "anulada":         "cancelled",
    "anulado":         "cancelled",
    "desistida":       "cancelled",
    "desierta":        "cancelled",
    "en tramitación":  "in_progress",
    "en tramitacion":  "in_progress",
    "publicada":       "published",
    "publicado":       "published",
}

SESSION = requests.Session()
SESSION.headers["User-Agent"] = "UbriqueTransparente/1.0 (contacto@ubrique.es)"

# ─── Parsing ──────────────────────────────────────────────────────────────────

def fetch_status(contract_id: int, url: str) -> Optional[str]:
    """Descarga la página de detalle y devuelve el status mapeado, o None si falla."""
    try:
        r = SESSION.get(url, timeout=15)
        r.raise_for_status()
    except Exception as e:
        log.warning("[%d] Error fetching %s: %s", contract_id, url, e)
        return None

    html = r.text

    # 1. Lee text_Estado
    m_estado = re.search(r'text_Estado[^>]*title="([^"]+)"', html)
    estado = html_unescape(m_estado.group(1)).strip().lower() if m_estado else ""

    if not estado:
        log.warning("[%d] No se encontró estado en %s", contract_id, url)
        return None

    # 2. "Resuelta" es un meta-estado: el resultado real está en text_Resultado
    if "resuelta" in estado:
        m_resultado = re.search(r'text_Resultado[^>]*title="([^"]+)"', html)
        raw = html_unescape(m_resultado.group(1)).strip().lower() if m_resultado else ""
    else:
        raw = estado

    status = HTML_STATUS_MAP.get(raw)
    if not status:
        for key, val in HTML_STATUS_MAP.items():
            if key in raw:
                status = val
                break
    if not status:
        log.warning("[%d] Estado desconocido: estado=%r resultado=%r", contract_id, estado, raw)
    return status

# ─── Main ─────────────────────────────────────────────────────────────────────

def run(dry_run: bool = False, max_workers: int = 8):
    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    cur = conn.cursor()
    cur.execute("SELECT id, source_url, status FROM contracts WHERE source_url IS NOT NULL ORDER BY id")
    rows = cur.fetchall()
    log.info("Procesando %d contratos…", len(rows))

    updates: list[tuple[str, int]] = []
    changed = 0

    with ThreadPoolExecutor(max_workers=max_workers) as pool:
        futures = {pool.submit(fetch_status, r[0], r[1]): r for r in rows}
        done = 0
        for future in as_completed(futures):
            contract_id, url, current_status = futures[future]
            done += 1
            new_status = future.result()
            if new_status and new_status != current_status:
                updates.append((new_status, contract_id))
                changed += 1
                log.info("[%d] %s → %s", contract_id, current_status, new_status)
            if done % 50 == 0:
                log.info("Progreso: %d/%d", done, len(rows))

    log.info("Contratos a actualizar: %d de %d", changed, len(rows))

    if not dry_run and updates:
        psycopg2.extras.execute_batch(
            cur,
            "UPDATE contracts SET status = %s, updated_at = NOW() WHERE id = %s",
            updates,
        )
        conn.commit()
        log.info("✓ %d contratos actualizados en BD", len(updates))
    elif dry_run:
        log.info("[DRY RUN] No se ha escrito nada.")

    cur.close()
    conn.close()


if __name__ == "__main__":
    dry_run = "--dry-run" in sys.argv
    run(dry_run=dry_run)
