"""Inspecciona el raw_xml almacenado en BD para identificar nombres de elementos.

Uso:
    python scripts/inspect_raw_xml.py              # muestra árbol de elementos de 3 muestras
    python scripts/inspect_raw_xml.py --id 42      # inspecciona un contrato concreto
    python scripts/inspect_raw_xml.py --search ContractType  # busca elementos por nombre parcial
    python scripts/inspect_raw_xml.py --stats      # cuenta qué campos son null en BD
"""
import sys
import os
import argparse
from xml.etree import ElementTree as ET
from collections import Counter

sys.stdout.reconfigure(encoding="utf-8")
sys.path.insert(0, os.path.dirname(__file__))
from db import get_conn

# ─────────────────────────────────────────────────────────────────────────────

def get_samples(n: int = 3, only_with_xml: bool = True) -> list[dict]:
    with get_conn() as conn:
        with conn.cursor() as cur:
            where = "WHERE raw_xml IS NOT NULL" if only_with_xml else ""
            cur.execute(f"SELECT id, title, raw_xml FROM contracts {where} LIMIT %s", (n,))
            return cur.fetchall()


def get_by_id(contract_id: int) -> dict | None:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id, title, raw_xml FROM contracts WHERE id = %s", (contract_id,))
            return cur.fetchone()


def db_stats():
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT
                    COUNT(*)            AS total,
                    COUNT(raw_xml)      AS with_xml,
                    COUNT(contract_type) AS with_type,
                    COUNT(cpv_code)     AS with_cpv,
                    COUNT(cpv_description) AS with_cpv_desc,
                    COUNT(awarded_to)   AS with_winner,
                    COUNT(amount)       AS with_amount
                FROM contracts
            """)
            return cur.fetchone()


def tag_local(tag: str) -> str:
    return tag.split("}")[-1] if "}" in tag else tag


def tag_ns(tag: str) -> str:
    if "}" in tag:
        ns = tag.split("}")[0].lstrip("{")
        # shorten known namespaces
        abbrevs = {
            "urn:dgpe:names:draft:codice:schema:xsd:CommonBasicComponents-2": "dgpe:cbc",
            "urn:dgpe:names:draft:codice:schema:xsd:CommonAggregateComponents-2": "dgpe:cac",
            "urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2": "ubl:cbc",
            "urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2": "ubl:cac",
            "http://www.w3.org/2005/Atom": "atom",
        }
        return abbrevs.get(ns, ns[-30:])
    return ""


def print_tree(el: ET.Element, indent: int = 0, max_depth: int = 8, seen: set | None = None):
    if seen is None:
        seen = set()
    local = tag_local(el.tag)
    ns = tag_ns(el.tag)
    prefix = "  " * indent
    attrs = ""
    if el.attrib:
        attrs = " " + " ".join(f'{k.split("}")[-1]}={v!r}' for k, v in el.attrib.items())
    text = (el.text or "").strip()[:60]
    text_display = f' = "{text}"' if text else ""
    key = f"{indent}:{el.tag}"
    if key in seen and indent > 2:
        return
    seen.add(key)
    print(f"{prefix}[{ns}] {local}{attrs}{text_display}")
    if indent < max_depth:
        for child in el:
            print_tree(child, indent + 1, max_depth, seen)


def search_elements(xml_str: str, keyword: str) -> list[tuple[str, str, str]]:
    """Devuelve (ns, local_name, text) para elementos cuyo nombre contenga keyword."""
    root = ET.fromstring(xml_str)
    results = []
    for el in root.iter():
        local = tag_local(el.tag)
        if keyword.lower() in local.lower():
            ns = tag_ns(el.tag)
            text = (el.text or "").strip()[:80]
            attrs = {tag_local(k): v for k, v in el.attrib.items()}
            results.append((ns, local, text, attrs))
    return results


def all_element_names(xml_str: str) -> Counter:
    root = ET.fromstring(xml_str)
    c: Counter = Counter()
    for el in root.iter():
        c[f"[{tag_ns(el.tag)}] {tag_local(el.tag)}"] += 1
    return c


# ─────────────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--id",     type=int,   help="ID de contrato a inspeccionar")
    parser.add_argument("--search", type=str,   help="Busca elementos cuyo nombre contenga este texto")
    parser.add_argument("--stats",  action="store_true", help="Muestra estadísticas de campos null")
    parser.add_argument("--n",      type=int,   default=3, help="Número de muestras (defecto: 3)")
    args = parser.parse_args()

    if args.stats:
        s = db_stats()
        print(f"Total contratos : {s['total']}")
        print(f"Con raw_xml     : {s['with_xml']}")
        print(f"Con contract_type: {s['with_type']}")
        print(f"Con cpv_code    : {s['with_cpv']}")
        print(f"Con cpv_desc    : {s['with_cpv_desc']}")
        print(f"Con awarded_to  : {s['with_winner']}")
        print(f"Con amount      : {s['with_amount']}")
        return

    rows = []
    if args.id:
        row = get_by_id(args.id)
        if not row:
            print(f"Contrato {args.id} no encontrado.")
            return
        rows = [row]
    else:
        rows = get_samples(args.n)
        if not rows:
            print("No hay contratos con raw_xml en BD. Ejecuta el scraper primero.")
            return

    if args.search:
        for row in rows:
            if not row["raw_xml"]:
                continue
            print(f"\n{'─'*60}")
            print(f"ID {row['id']}: {row['title'][:70]}")
            hits = search_elements(row["raw_xml"], args.search)
            if not hits:
                print(f"  (sin resultados para '{args.search}')")
            for ns, local, text, attrs in hits:
                attr_str = f"  attrs={attrs}" if attrs else ""
                print(f"  [{ns}] {local} = {text!r}{attr_str}")
        return

    # Modo árbol completo
    for row in rows:
        if not row["raw_xml"]:
            print(f"ID {row['id']}: sin raw_xml")
            continue
        print(f"\n{'═'*70}")
        print(f"ID {row['id']}: {row['title'][:70]}")
        print("═"*70)
        root = ET.fromstring(row["raw_xml"])
        print_tree(root, max_depth=6)

        # Resumen de nombres únicos
        print(f"\n--- Todos los elementos ({len(all_element_names(row['raw_xml']))} únicos) ---")
        for name, count in sorted(all_element_names(row["raw_xml"]).items()):
            print(f"  {count:3d}x  {name}")


if __name__ == "__main__":
    main()
