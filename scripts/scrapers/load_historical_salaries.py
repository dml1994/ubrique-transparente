"""
Carga manual de retribuciones históricas de cargos electos de Ubrique.

Fuentes:
  - Mandato 2015-2019: Acuerdo Plenario 24/06/2015 (retribuciones y asistencias)
    Confirmadas en tabla de diciembre 2016 del portal de transparencia.
  - Mandato 2019-2023: Acuerdo Plenario 01/07/2019
    Decreto Alcaldía 01/07/2019 (dedicaciones exclusivas tenencias)

Los importes son los fijados en los acuerdos plenarios de inicio de mandato.
Las subidas anuales aplicadas por PGE no están reflejadas (datos aproximados).

Uso:
    python scripts/scrapers/load_historical_salaries.py
    python scripts/scrapers/load_historical_salaries.py --years 2016 2017
"""

import sys
import logging
import argparse
from typing import List

import psycopg2.extras

sys.path.insert(0, str(__import__("pathlib").Path(__file__).parent.parent))
from db import get_conn  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

INSERT_SQL = """
INSERT INTO salaries (position, person_name, year, gross_annual, total, source_url, source_doc)
VALUES (%(position)s, %(person_name)s, %(year)s, %(gross_annual)s, %(gross_annual)s,
        %(source_url)s, %(source_doc)s)
"""

SOURCE_URL = "https://ubrique.sedelectronica.es/transparency/c965ac03-ab13-4381-b019-2168832b209b/"

# ─── Mandato 2015-2019 ────────────────────────────────────────────────────────
# Acuerdo Plenario 24/06/2015 (14 pagas/año para cargos con dedicación exclusiva)
# Confirmados sin variación en tabla publicada en diciembre 2016.

MANDATO_2015 = {
    "source_doc": "Acuerdo Plenario 24/06/2015 — retribuciones mandato 2015-2019",
    "positions": [
        # Dedicación exclusiva (mensual × 14)
        {"position": "Alcalde/sa",                  "person_name": None, "gross_annual": 2900.00 * 14},
        {"position": "1er Teniente de Alcalde",      "person_name": None, "gross_annual": 2128.00 * 14},
        {"position": "2ª Teniente de Alcalde",       "person_name": None, "gross_annual": 1915.70 * 14},
        {"position": "3er Teniente de Alcalde",      "person_name": None, "gross_annual": 1915.70 * 14},
        {"position": "4º Teniente de Alcalde",       "person_name": None, "gross_annual": 1915.70 * 14},
        # Sin dedicación exclusiva: asistencias mensuales (× 12)
        # 4 concejales PSOE con delegación
        {"position": "Concejal/a con delegación (sin dedicación)", "person_name": None, "gross_annual": 450.00 * 12},
        {"position": "Concejal/a con delegación (sin dedicación)", "person_name": None, "gross_annual": 450.00 * 12},
        {"position": "Concejal/a con delegación (sin dedicación)", "person_name": None, "gross_annual": 450.00 * 12},
        {"position": "Concejal/a con delegación (sin dedicación)", "person_name": None, "gross_annual": 450.00 * 12},
        # 8 concejales de oposición sin delegación (5 PP + 2 PA + 1 IU)
        {"position": "Concejal/a (sin dedicación)", "person_name": None, "gross_annual": 150.00 * 12},
        {"position": "Concejal/a (sin dedicación)", "person_name": None, "gross_annual": 150.00 * 12},
        {"position": "Concejal/a (sin dedicación)", "person_name": None, "gross_annual": 150.00 * 12},
        {"position": "Concejal/a (sin dedicación)", "person_name": None, "gross_annual": 150.00 * 12},
        {"position": "Concejal/a (sin dedicación)", "person_name": None, "gross_annual": 150.00 * 12},
        {"position": "Concejal/a (sin dedicación)", "person_name": None, "gross_annual": 150.00 * 12},
        {"position": "Concejal/a (sin dedicación)", "person_name": None, "gross_annual": 150.00 * 12},
        {"position": "Concejal/a (sin dedicación)", "person_name": None, "gross_annual": 150.00 * 12},
    ],
    "years": [2016, 2017, 2018],
}

# ─── Mandato 2019-2023 ────────────────────────────────────────────────────────
# Acuerdo Plenario 01/07/2019 + Decreto Alcaldía 01/07/2019
# Dedicación exclusiva: Alcaldía + 2ª, 3ª y 4ª Tenencias.
# Asistencias para concejales sin dedicación exclusiva.

MANDATO_2019 = {
    "source_doc": "Acuerdo Plenario 01/07/2019 — retribuciones mandato 2019-2023",
    "positions": [
        # Dedicación exclusiva (mensual × 14)
        {"position": "Alcalde/sa",             "person_name": "Isabel Gómez García",          "gross_annual": 3077.79 * 14},
        {"position": "2ª Teniente de Alcalde", "person_name": "Isabel María Bazán Fernández", "gross_annual": 2033.15 * 14},
        {"position": "3er Teniente de Alcalde","person_name": "José Manuel Fernández Rivera",  "gross_annual": 2033.15 * 14},
        {"position": "4º Teniente de Alcalde", "person_name": "María Trinidad Jaén López",     "gross_annual": 2033.15 * 14},
        # Sin dedicación exclusiva: asistencias mensuales (× 12)
        # 1ª Teniente y concejales con delegación: 600 €/mes
        # (número exacto de concejales con delegación desconocido; registramos el cargo genérico)
        {"position": "Concejal/a con delegación (sin dedicación)", "person_name": None, "gross_annual": 600.00 * 12},
        {"position": "Concejal/a con delegación (sin dedicación)", "person_name": None, "gross_annual": 600.00 * 12},
        {"position": "Concejal/a con delegación (sin dedicación)", "person_name": None, "gross_annual": 600.00 * 12},
        # Portavoces de grupo: 250 €/mes
        {"position": "Portavoz de grupo municipal (sin dedicación)", "person_name": None, "gross_annual": 250.00 * 12},
        {"position": "Portavoz de grupo municipal (sin dedicación)", "person_name": None, "gross_annual": 250.00 * 12},
        # Concejales sin delegación: 150 €/mes
        {"position": "Concejal/a (sin dedicación)", "person_name": None, "gross_annual": 150.00 * 12},
        {"position": "Concejal/a (sin dedicación)", "person_name": None, "gross_annual": 150.00 * 12},
        {"position": "Concejal/a (sin dedicación)", "person_name": None, "gross_annual": 150.00 * 12},
        {"position": "Concejal/a (sin dedicación)", "person_name": None, "gross_annual": 150.00 * 12},
        {"position": "Concejal/a (sin dedicación)", "person_name": None, "gross_annual": 150.00 * 12},
        {"position": "Concejal/a (sin dedicación)", "person_name": None, "gross_annual": 150.00 * 12},
        {"position": "Concejal/a (sin dedicación)", "person_name": None, "gross_annual": 150.00 * 12},
    ],
    "years": [2019, 2020, 2021, 2022],
}

MANDATOS = [MANDATO_2015, MANDATO_2019]


def build_records(mandato: dict, year: int) -> List[dict]:
    records = []
    for pos in mandato["positions"]:
        records.append({
            "position":    pos["position"],
            "person_name": pos["person_name"],
            "year":        year,
            "gross_annual": round(pos["gross_annual"], 2),
            "source_url":  SOURCE_URL,
            "source_doc":  mandato["source_doc"],
        })
    return records


def save_records(records: List[dict], year: int) -> int:
    if not records:
        return 0
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM salaries WHERE year = %s", (year,))
            deleted = cur.rowcount
            psycopg2.extras.execute_batch(cur, INSERT_SQL, records, page_size=100)
        conn.commit()
        if deleted:
            log.info("  Eliminados %d registros previos para %d", deleted, year)
        return len(records)
    finally:
        conn.close()


def run(target_years: List[int] | None = None):
    total = 0
    for mandato in MANDATOS:
        for year in mandato["years"]:
            if target_years and year not in target_years:
                continue
            records = build_records(mandato, year)
            saved = save_records(records, year)
            log.info("=== %d retribuciones cargadas para %d ===", saved, year)
            total += saved
    log.info("Total: %d registros insertados", total)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Carga retribuciones históricas de Ubrique")
    parser.add_argument("--years", nargs="+", type=int, default=None,
                        help="Años a cargar (por defecto: 2016-2022)")
    args = parser.parse_args()
    run(args.years)
