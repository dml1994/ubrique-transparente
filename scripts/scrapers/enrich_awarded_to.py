"""
Enriquece contratos sin adjudicatario consultando el portal PCSP.

Para cada contrato con awarded_to IS NULL y source_url disponible,
visita la página de detalle y extrae el nombre del adjudicatario del HTML.

Uso:
    python scripts/scrapers/enrich_awarded_to.py          # todos los pendientes
    python scripts/scrapers/enrich_awarded_to.py --dry-run # muestra sin guardar
"""

import sys
import re
import time
import logging
import argparse

import requests

sys.path.insert(0, str(__import__("pathlib").Path(__file__).parent.parent))
from db import get_conn  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; UbriqueTransparente/1.0)"}
AWARDED_RE = re.compile(r'text_Adjudicatario[^>]*title="([^"]+)"')
# Textos que indican que no hay un nombre real (lotes, enlaces de navegación...)
_INVALID = re.compile(r"^(ver |http|s\.a\.$|$)", re.IGNORECASE)
DELAY = 1.5  # segundos entre peticiones para no saturar el servidor


def fetch_awarded_to(source_url: str) -> str | None:
    try:
        r = requests.get(source_url, headers=HEADERS, timeout=30, allow_redirects=True)
        m = AWARDED_RE.search(r.text)
        if not m:
            return None
        name = re.sub(r"&#\d+;|&\w+;", lambda x: __import__("html").unescape(x.group()), m.group(1)).strip()
        return None if _INVALID.match(name) else name
    except Exception as e:
        log.warning("Error fetching %s: %s", source_url, e)
        return None


def run(dry_run: bool = False):
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT id, source_url FROM contracts
                WHERE awarded_to IS NULL AND source_url IS NOT NULL
                ORDER BY id
            """)
            pending = cur.fetchall()

        log.info("%d contratos sin adjudicatario con source_url", len(pending))
        updated = 0

        for row in pending:
            awarded = fetch_awarded_to(row["source_url"])
            if awarded:
                log.info("[%d] → %s", row["id"], awarded)
                if not dry_run:
                    with conn.cursor() as cur:
                        cur.execute(
                            "UPDATE contracts SET awarded_to = %s WHERE id = %s",
                            (awarded, row["id"]),
                        )
                    conn.commit()
                updated += 1
            else:
                log.info("[%d] sin adjudicatario en portal", row["id"])

            time.sleep(DELAY)

        log.info("=== %d contratos enriquecidos ===", updated)
        return updated
    finally:
        conn.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true",
                        help="Muestra resultados sin modificar la BD")
    args = parser.parse_args()
    run(dry_run=args.dry_run)
