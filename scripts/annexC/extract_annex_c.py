"""Extract FIFA World Cup 26 Regulations Annex C into public/matrix495.json."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

import pdfplumber

ROOT = Path(__file__).resolve().parents[2]
PDF_PATH = Path(__file__).with_name("FWC2026_regulations_EN.pdf")
OUTPUT_PATH = ROOT / "public" / "matrix495.json"
WINNER_COLUMNS = ("A", "B", "D", "E", "G", "I", "K", "L")
ALL_GROUPS = set("ABCDEFGHIJKL")
ROW_PATTERN = re.compile(r"^(\d{1,3})\s+((?:3[A-L]\s+){7}3[A-L])$")


def slot(kind: str, group: str) -> dict[str, str]:
    return {"type": kind, "group": group}


def build_matchups(assignments: dict[str, str]) -> list[dict]:
    return [
        {"matchNumber": 73, "team1": slot("runner-up", "A"), "team2": slot("runner-up", "B")},
        {"matchNumber": 74, "team1": slot("winner", "E"), "team2": slot("third", assignments["E"])},
        {"matchNumber": 75, "team1": slot("winner", "F"), "team2": slot("runner-up", "C")},
        {"matchNumber": 76, "team1": slot("winner", "C"), "team2": slot("runner-up", "F")},
        {"matchNumber": 77, "team1": slot("winner", "I"), "team2": slot("third", assignments["I"])},
        {"matchNumber": 78, "team1": slot("runner-up", "E"), "team2": slot("runner-up", "I")},
        {"matchNumber": 79, "team1": slot("winner", "A"), "team2": slot("third", assignments["A"])},
        {"matchNumber": 80, "team1": slot("winner", "L"), "team2": slot("third", assignments["L"])},
        {"matchNumber": 81, "team1": slot("winner", "D"), "team2": slot("third", assignments["D"])},
        {"matchNumber": 82, "team1": slot("winner", "G"), "team2": slot("third", assignments["G"])},
        {"matchNumber": 83, "team1": slot("runner-up", "K"), "team2": slot("runner-up", "L")},
        {"matchNumber": 84, "team1": slot("winner", "H"), "team2": slot("runner-up", "J")},
        {"matchNumber": 85, "team1": slot("winner", "B"), "team2": slot("third", assignments["B"])},
        {"matchNumber": 86, "team1": slot("winner", "J"), "team2": slot("runner-up", "H")},
        {"matchNumber": 87, "team1": slot("winner", "K"), "team2": slot("third", assignments["K"])},
        {"matchNumber": 88, "team1": slot("runner-up", "D"), "team2": slot("runner-up", "G")},
    ]


def extract_rows() -> list[tuple[int, list[str]]]:
    if not PDF_PATH.exists():
        raise FileNotFoundError(f"Official regulations PDF not found: {PDF_PATH}")

    rows: list[tuple[int, list[str]]] = []
    with pdfplumber.open(PDF_PATH) as document:
        # Printed pages 80-97 are PDF pages 80-97 (zero-based indexes 79-96).
        for page in document.pages[79:97]:
            for raw_line in (page.extract_text() or "").splitlines():
                match = ROW_PATTERN.match(raw_line.strip())
                if not match:
                    continue
                option = int(match.group(1))
                values = [token[1:] for token in match.group(2).split()]
                rows.append((option, values))
    return rows


def validate(rows: list[tuple[int, list[str]]]) -> None:
    options = [option for option, _ in rows]
    if options != list(range(1, 496)):
        raise ValueError("Annex C options must be consecutive from 1 through 495")

    combinations: set[str] = set()
    for option, values in rows:
        if len(values) != 8 or len(set(values)) != 8 or not set(values) <= ALL_GROUPS:
            raise ValueError(f"Option {option} does not contain eight unique group letters")
        assignments = dict(zip(WINNER_COLUMNS, values, strict=True))
        rematches = [winner for winner, third in assignments.items() if winner == third]
        if rematches:
            raise ValueError(f"Option {option} contains same-group rematches: {rematches}")
        key = "".join(sorted(values))
        if key in combinations:
            raise ValueError(f"Duplicate qualifying combination at option {option}: {key}")
        combinations.add(key)

    if len(combinations) != 495:
        raise ValueError("Expected 495 unique combinations")


def main() -> None:
    rows = extract_rows()
    validate(rows)
    scenarios = []
    for option, values in rows:
        assignments = dict(zip(WINNER_COLUMNS, values, strict=True))
        scenarios.append(
            {
                "option": option,
                "groupCombination": "".join(sorted(values)),
                "official": True,
                "matchups": build_matchups(assignments),
            }
        )

    payload = {
        "source": {
            "title": "FIFA World Cup 26 Regulations",
            "annex": "Annex C - Combinations for eight best third-placed teams",
            "pages": "80-97",
            "winnerColumns": [f"1{column}" for column in WINNER_COLUMNS],
        },
        "scenarios": scenarios,
    }
    OUTPUT_PATH.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(f"Extracted and validated {len(scenarios)} official scenarios -> {OUTPUT_PATH}")


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(f"Annex C extraction failed: {error}", file=sys.stderr)
        raise
