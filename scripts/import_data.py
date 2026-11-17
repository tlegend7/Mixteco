"""Convert the source XLSX without third-party packages or changing measurements."""
from pathlib import Path
from zipfile import ZipFile
from xml.etree import ElementTree as ET
from datetime import datetime
import hashlib
import json
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
NS = {"s": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
SOURCE = ROOT / "Base de datos biometría chile jalapeño.xlsx"
TREATMENTS = {"rojo": "rojo", "azul": "azul", "verde": "verde", "sin sarán": "control"}
FIELDS = ["plants", "leaves", "flowers", "fruits", "height", "diameter"]


def convert():
    with ZipFile(SOURCE) as archive:
        strings = []
        if "xl/sharedStrings.xml" in archive.namelist():
            strings = ["".join(n.itertext()) for n in ET.fromstring(archive.read("xl/sharedStrings.xml"))]
        sheet = ET.fromstring(archive.read("xl/worksheets/sheet1.xml"))
        records, weeks = [], []
        week, date = None, None
        for row in sheet.findall(".//s:sheetData/s:row", NS):
            cells = {}
            for cell in row.findall("s:c", NS):
                if cell.find("s:f", NS) is not None:
                    raise ValueError("Se requiere revisar las fórmulas antes de importar.")
                value = cell.find("s:v", NS)
                if cell.get("t") == "inlineStr":
                    text = "".join(cell.find("s:is", NS).itertext())
                elif value is None:
                    continue
                elif cell.get("t") == "s":
                    text = strings[int(value.text)]
                else:
                    text = value.text
                cells[re.sub(r"\d", "", cell.get("r"))] = text
            if "A" in cells:
                match = re.search(r"SEM-(\d+)\s+(\d{1,2}/\d{1,2}/\d{4})", cells["A"])
                if match:
                    week = int(match[1])
                    date = datetime.strptime(match[2], "%d/%m/%Y").date().isoformat()
                    weeks.append({"week": week, "date": date})
            if "C" not in cells or cells["C"].strip().lower() not in TREATMENTS:
                continue
            if week is None:
                raise ValueError("Medición sin semana.")
            values = [float(cells[col]) for col in ["B", "D", "E", "F", "G", "H"]]
            if not all(v >= 0 for v in values) or not values[0].is_integer() or values[0] < 1:
                raise ValueError("Valor no válido en la fila " + row.get("r"))
            values[0] = int(values[0])
            records.append({
                "week": week, "date": date, "treatment": TREATMENTS[cells["C"].strip().lower()],
                **dict(zip(FIELDS, values)),
                "sourceRow": int(row.get("r")),
            })
    assert len(records) == 40 and len(weeks) == 10
    assert len({(r["week"], r["treatment"]) for r in records}) == 40
    assert [r["plants"] for r in records if r["treatment"] == "control"] == [8]*8 + [6, 5]
    assert weeks[0]["date"] == "2026-08-20" and weeks[-1]["date"] == "2026-10-22"
    return {
        "source": SOURCE.name, "sheet": "Hoja1",
        "sha256": hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
        "aggregation": "Promedios por tratamiento y fecha; no son datos individuales.",
        "units": {"height": "cm", "diameter": "mm", "leaves": "hojas/planta", "flowers": "flores/planta", "fruits": "frutos/planta"},
        "weeks": weeks, "records": records,
    }


if __name__ == "__main__":
    content = json.dumps(convert(), ensure_ascii=False, indent=2) + "\n"
    target = ROOT / "public/data/biometria.json"
    if "--check" in sys.argv:
        assert target.read_text(encoding="utf-8") == content, "El JSON difiere del Excel."
        print("40 registros comprobados contra el Excel. Valores y procedencia coinciden.")
    else:
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(content, encoding="utf-8")
        print("Importados 40 registros y 10 semanas; fuente original intacta.")
