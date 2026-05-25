"""
Scraper de contratos del Ayuntamiento de Ubrique desde la PCSP.

Fuente: ZIPs anuales de datos abiertos de la Plataforma de Contratación
del Sector Público (https://contrataciondelsectorpublico.gob.es).

Estrategia:
  1. Descarga el ZIP del año actual (licitaciones + contratos menores).
  2. Itera los ficheros .atom dentro del ZIP sin extraerlos a disco.
  3. Filtra entradas por NIF del Ayuntamiento de Ubrique (P1103800G).
  4. Upserta los contratos en Neon PostgreSQL.
"""

import io
import zipfile
import logging
import sys
import datetime
from typing import Optional, List, Dict
from xml.etree import ElementTree as ET

import requests
import psycopg2
import psycopg2.extras

# Ajusta sys.path para importar db.py desde scripts/
sys.path.insert(0, str(__import__("pathlib").Path(__file__).parent.parent))
from db import get_conn  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

# ─── Constantes ──────────────────────────────────────────────────────────────

UBRIQUE_NIF = "P1103800G"
UBRIQUE_DIR3 = "L01110380"

# ZIPs de datos abiertos PCSP (actualizados diariamente)
BASE_SINDICACION = "https://contrataciondelsectorpublico.gob.es/sindicacion"

FEEDS = {
    "licitaciones": f"{BASE_SINDICACION}/sindicacion_643/licitacionesPerfilesContratanteCompleto3_{{year}}.zip",
    "menores":      f"{BASE_SINDICACION}/sindicacion_1143/contratosMenoresPerfilesContratantes_{{year}}.zip",
}

# Namespaces CODICE 2 usados en los ATOM de la PCSP
NS = {
    "atom":  "http://www.w3.org/2005/Atom",
    "cbc":   "urn:dgpe:names:draft:codice:schema:xsd:CommonBasicComponents-2",
    "cac":   "urn:dgpe:names:draft:codice:schema:xsd:CommonAggregateComponents-2",
    "cbc2":  "urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2",
}

# ─── Descarga ─────────────────────────────────────────────────────────────────

def download_zip(url: str, retries: int = 3) -> bytes:
    """Descarga un ZIP con reintentos para errores SSL intermitentes en Windows."""
    log.info("Descargando %s", url)
    last_err = None
    for attempt in range(1, retries + 1):
        try:
            # stream=False evita errores SSL de corte en mid-stream en Windows
            r = requests.get(url, timeout=300, stream=False)
            r.raise_for_status()
            data = r.content
            log.info("  Descarga completa: %.1f MB", len(data) / 1024 / 1024)
            return data
        except Exception as e:
            last_err = e
            log.warning("  Intento %d/%d fallido: %s", attempt, retries, e)
    raise last_err

# ─── Parser ATOM/CODICE ───────────────────────────────────────────────────────

def _text(el: Optional[ET.Element], *paths: str, ns=NS) -> Optional[str]:
    """Extrae texto del primer path que encuentre un elemento."""
    if el is None:
        return None
    for path in paths:
        found = el.find(path, ns)
        if found is not None and found.text:
            return found.text.strip()
    return None


def _is_ubrique_entry(entry: ET.Element) -> bool:
    """True si la entry pertenece al Ayuntamiento de Ubrique."""
    # Busca en el bloque ContractingParty → Party → PartyIdentification → ID
    for id_el in entry.iter("{urn:dgpe:names:draft:codice:schema:xsd:CommonBasicComponents-2}ID"):
        if id_el.text and UBRIQUE_NIF in id_el.text:
            return True
    # Fallback: busca por nombre
    for name_el in entry.iter("{urn:dgpe:names:draft:codice:schema:xsd:CommonBasicComponents-2}Name"):
        if name_el.text and "ubrique" in name_el.text.lower():
            return True
    return False


def _parse_amount(entry: ET.Element) -> Optional[float]:
    """Extrae el importe del contrato."""
    tags = [
        "{urn:dgpe:names:draft:codice:schema:xsd:CommonBasicComponents-2}TaxExclusiveAmount",
        "{urn:dgpe:names:draft:codice:schema:xsd:CommonBasicComponents-2}EstimatedOverallContractAmount",
        "{urn:dgpe:names:draft:codice:schema:xsd:CommonBasicComponents-2}PayableAmount",
    ]
    for tag in tags:
        for el in entry.iter(tag):
            try:
                return float(el.text.replace(",", "."))
            except (ValueError, AttributeError):
                continue
    return None


def _parse_date(text: Optional[str]) -> Optional[datetime.date]:
    if not text:
        return None
    for fmt in ("%Y-%m-%dT%H:%M:%S", "%Y-%m-%d"):
        try:
            return datetime.datetime.strptime(text[:19], fmt).date()
        except ValueError:
            continue
    return None


def parse_entry(entry: ET.Element, feed_type: str) -> Optional[dict]:
    """Convierte un elemento <entry> ATOM en un dict listo para la BD."""
    atom_ns = "http://www.w3.org/2005/Atom"

    entry_id = _text(entry, f"{{{atom_ns}}}id")
    if not entry_id:
        return None

    title = _text(entry, f"{{{atom_ns}}}title")
    updated_raw = _text(entry, f"{{{atom_ns}}}updated")
    link_el = entry.find(f"{{{atom_ns}}}link")
    source_url = link_el.get("href") if link_el is not None else None

    # Datos CODICE
    cbc = "urn:dgpe:names:draft:codice:schema:xsd:CommonBasicComponents-2"
    contract_title = None
    for el in entry.iter(f"{{{cbc}}}ContractName"):
        contract_title = el.text
        break

    # CPV
    cpv_code = cpv_desc = None
    for el in entry.iter(f"{{{cbc}}}ItemClassificationCode"):
        cpv_code = el.text
        cpv_desc = el.get("name")
        break

    # Empresa adjudicataria
    awarded_to = None
    for el in entry.iter(f"{{{cbc}}}Name"):
        parent_tag = el.tag
        awarded_to = el.text
        break

    # Tipo de contrato
    contract_type = None
    for el in entry.iter(f"{{{cbc}}}ContractTypeCode"):
        contract_type = el.text
        break

    # Fecha adjudicación
    award_date = None
    for el in entry.iter(f"{{{cbc}}}IssueDate"):
        award_date = _parse_date(el.text)
        break

    amount = _parse_amount(entry)
    published_date = _parse_date(updated_raw)

    return {
        "external_id":     entry_id,
        "title":           contract_title or title or "(Sin título)",
        "amount":          amount,
        "awarded_to":      awarded_to,
        "awarded_date":    award_date,
        "published_date":  published_date,
        "contract_type":   contract_type,
        "cpv_code":        cpv_code,
        "cpv_description": cpv_desc,
        "status":          "awarded" if feed_type == "licitaciones" else "published",
        "source_url":      source_url,
    }

# ─── Procesado de ZIP ─────────────────────────────────────────────────────────

def process_zip(zip_bytes: bytes, feed_type: str) -> List[Dict]:
    """Itera los ficheros .atom en el ZIP y extrae contratos de Ubrique."""
    contracts = []
    with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
        atom_files = [n for n in zf.namelist() if n.endswith(".atom")]
        log.info("  %d ficheros .atom en el ZIP", len(atom_files))

        for atom_name in atom_files:
            with zf.open(atom_name) as f:
                try:
                    tree = ET.parse(f)
                except ET.ParseError as e:
                    log.warning("Error parseando %s: %s", atom_name, e)
                    continue

                root = tree.getroot()
                atom_ns = "http://www.w3.org/2005/Atom"
                for entry in root.findall(f"{{{atom_ns}}}entry"):
                    if _is_ubrique_entry(entry):
                        parsed = parse_entry(entry, feed_type)
                        if parsed:
                            contracts.append(parsed)

    log.info("  %d contratos de Ubrique encontrados", len(contracts))
    return contracts

# ─── Persistencia ─────────────────────────────────────────────────────────────

UPSERT_SQL = """
INSERT INTO contracts (
    external_id, title, amount, awarded_to, awarded_date,
    published_date, contract_type, cpv_code, cpv_description,
    status, source_url, updated_at
) VALUES (
    %(external_id)s, %(title)s, %(amount)s, %(awarded_to)s, %(awarded_date)s,
    %(published_date)s, %(contract_type)s, %(cpv_code)s, %(cpv_description)s,
    %(status)s, %(source_url)s, NOW()
)
ON CONFLICT (external_id) DO UPDATE SET
    title           = EXCLUDED.title,
    amount          = EXCLUDED.amount,
    awarded_to      = EXCLUDED.awarded_to,
    awarded_date    = EXCLUDED.awarded_date,
    published_date  = EXCLUDED.published_date,
    contract_type   = EXCLUDED.contract_type,
    cpv_code        = EXCLUDED.cpv_code,
    cpv_description = EXCLUDED.cpv_description,
    status          = EXCLUDED.status,
    source_url      = EXCLUDED.source_url,
    updated_at      = NOW()
"""


def save_contracts(contracts: List[Dict]) -> int:
    if not contracts:
        return 0
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            psycopg2.extras.execute_batch(cur, UPSERT_SQL, contracts, page_size=100)
        conn.commit()
        return len(contracts)
    finally:
        conn.close()

# ─── Main ─────────────────────────────────────────────────────────────────────

def run(years: Optional[List[int]] = None):
    if years is None:
        years = [datetime.date.today().year]

    total = 0
    for year in years:
        for feed_type, url_tpl in FEEDS.items():
            url = url_tpl.format(year=year)
            try:
                zip_bytes = download_zip(url)
                contracts = process_zip(zip_bytes, feed_type)
                saved = save_contracts(contracts)
                total += saved
                log.info("[%s %d] %d contratos guardados en BD", feed_type, year, saved)
            except requests.HTTPError as e:
                log.warning("HTTP %s para %s — puede que el año no exista aún", e.response.status_code, url)
            except Exception as e:
                log.error("Error procesando %s: %s", url, e, exc_info=True)

    log.info("=== Total: %d contratos upsertados ===", total)
    return total


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Scraper contratos PCSP — Ubrique")
    parser.add_argument("--years", nargs="+", type=int, default=None,
                        help="Años a procesar (por defecto: año actual)")
    parser.add_argument("--backfill", action="store_true",
                        help="Carga histórica: procesa 2018 hasta el año actual")
    args = parser.parse_args()

    if args.backfill:
        current = datetime.date.today().year
        years = list(range(2018, current + 1))
    else:
        years = args.years

    run(years)
