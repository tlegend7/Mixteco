"""Import measured samples from the audited, normalized XLSX using Python's stdlib."""
from argparse import ArgumentParser
from collections import defaultdict
from datetime import datetime, timedelta
from pathlib import Path
from zipfile import ZipFile
from xml.etree import ElementTree as ET
import hashlib
import json
import math
import re

ROOT = Path(__file__).resolve().parents[1]
NS = {"s": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
TREATMENTS = {"Color Rojo": "rojo", "Color Azul": "azul", "Color Verde": "verde", "Sin Saran": "control"}
FIELDS = {"leaves": "E", "height": "F", "diameter": "G", "flowers": "H", "fruits": "I"}


def convert(source):
    normalization = json.loads((ROOT / "docs/data-normalization.json").read_text(encoding="utf-8"))
    digest = hashlib.sha256(source.read_bytes()).hexdigest()
    if digest != normalization["normalizedSha256"]:
        raise ValueError("El Excel no coincide con la copia normalizada auditada. Revise la procedencia antes de importar.")
    observations, groups = [], defaultdict(list)
    with ZipFile(source) as archive:
        strings = []
        if "xl/sharedStrings.xml" in archive.namelist():
            strings = ["".join(n.itertext()) for n in ET.fromstring(archive.read("xl/sharedStrings.xml"))]
        # Progresión contains estimates; only Hoja1 contains the measured samples.
        sheet = ET.fromstring(archive.read("xl/worksheets/sheet1.xml"))
        for row in sheet.findall(".//s:sheetData/s:row", NS):
            cells = {}
            for cell in row.findall("s:c", NS):
                if cell.find("s:f", NS) is not None:
                    raise ValueError("Fórmula inesperada en Hoja1: " + cell.get("r"))
                value = cell.find("s:v", NS)
                kind = cell.get("t")
                if kind == "inlineStr":
                    text = "".join(cell.find("s:is", NS).itertext())
                elif value is None:
                    continue
                elif kind == "s":
                    text = strings[int(value.text)]
                elif kind in (None, "n"):
                    text = float(value.text)
                else:
                    raise ValueError("Tipo de celda no válido: " + cell.get("r"))
                cells[re.sub(r"\d", "", cell.get("r"))] = text
            sample = re.fullmatch(r"Muestra\s+(\d+)", str(cells.get("A", "")).strip())
            if not sample:
                continue
            week_match = re.fullmatch(r"Semana\s+(\d+)", str(cells.get("B", "")).strip())
            if not week_match:
                raise ValueError("Muestra sin semana: " + row.get("r"))
            week = int(week_match[1])
            date = datetime(1899, 12, 30) + timedelta(days=cells["C"])
            if week < 1 or date != datetime(2026, 8, 20) + timedelta(weeks=week-1):
                raise ValueError("Fecha incoherente en C" + row.get("r"))
            treatment = TREATMENTS[cells["D"].strip()]
            record = {"week": week, "date": date.date().isoformat(), "treatment": treatment,
                      "sample": int(sample[1]), "sourceRow": int(row.get("r")), "missing": {}}
            for field, column in FIELDS.items():
                value = cells.get(column)
                if value is None or isinstance(value, str) and not value.strip():
                    record[field] = None
                    record["missing"][field] = "blank"
                elif isinstance(value, str) and value.strip().upper() == "N/A":
                    record[field] = None
                    record["missing"][field] = "N/A"
                elif not isinstance(value, (int, float)) or not math.isfinite(value) or value < 0:
                    raise ValueError("Medida no válida en " + column + row.get("r"))
                else:
                    if field in ("leaves", "flowers", "fruits") and not float(value).is_integer():
                        raise ValueError("Conteo no entero en " + column + row.get("r"))
                    record[field] = int(value) if float(value).is_integer() else value
            observations.append(record)
            groups[week, treatment].append(record)
    weeks = sorted({r["week"] for r in observations})
    if not weeks or weeks != list(range(1, len(weeks)+1)) or len(groups) != len(weeks)*4:
        raise ValueError("Faltan semanas o tratamientos.")
    records = []
    for week in weeks:
        for treatment in TREATMENTS.values():
            samples = groups[week, treatment]
            if sorted(r["sample"] for r in samples) != list(range(1, 9)):
                raise ValueError("Muestras duplicadas o incompletas.")
            record = {"week": week, "date": samples[0]["date"], "treatment": treatment,
                      "plants": sum(any(r[f] is not None for f in FIELDS) for r in samples),
                      "sampleSlots": len(samples), "sampleCounts": {},
                      "sourceRows": [r["sourceRow"] for r in samples]}
            for field in FIELDS:
                values = [r[field] for r in samples if r[field] is not None]
                record[field] = sum(values)/len(values) if values else None
                record["sampleCounts"][field] = len(values)
            records.append(record)
    return {
        "source": source.name, "sheet": "Hoja1", "sha256": digest,
        "aggregation": "Muestras independientes por tratamiento y semana. Media de valores numéricos disponibles con n por variable; vacíos y N/A no son cero. Se excluyen las estimaciones de Progresión.",
        "units": {"height": "cm", "diameter": "mm", "leaves": "hojas/planta", "flowers": "flores/planta", "fruits": "frutos/planta"},
        "normalization": normalization,
        "weeks": [{"week": w, "date": next(r["date"] for r in records if r["week"] == w)} for w in weeks],
        "records": records, "observations": observations,
    }


if __name__ == "__main__":
    parser = ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path, help="Ruta al Excel normalizado auditado")
    parser.add_argument("--check", action="store_true", help="Comparar sin sobrescribir el JSON")
    args = parser.parse_args()
    content = json.dumps(convert(args.source), ensure_ascii=False, indent=2, allow_nan=False) + "\n"
    target = ROOT / "public/data/biometria.json"
    if args.check:
        if target.read_text(encoding="utf-8") != content:
            raise ValueError("El JSON difiere del Excel.")
        print("JSON comprobado contra el Excel normalizado; valores y procedencia coinciden.")
    else:
        target.write_text(content, encoding="utf-8")
        print("Importacion completa; fuente original intacta.")
