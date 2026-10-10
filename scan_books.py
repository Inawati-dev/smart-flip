"""
scan_books.py
Scan folder books/ untuk semua PDF, update config.json otomatis.
Dijalankan oleh GitHub Actions — tidak perlu dijalankan manual.
"""

import json
import os
from pathlib import Path

BOOKS_FOLDER = "books"
CONFIG_FILE  = "config.json"

def scan():
    folder = Path(BOOKS_FOLDER)
    if not folder.exists():
        print(f"Folder '{BOOKS_FOLDER}/' tidak ditemukan.")
        return

    # Cari semua PDF, urutkan alphabetical
    pdfs = sorted(
        f.name for f in folder.iterdir()
        if f.suffix.lower() == ".pdf" and f.is_file()
    )

    print(f"Ditemukan {len(pdfs)} PDF: {pdfs}")

    # Baca config.json yang sudah ada
    config_path = Path(CONFIG_FILE)
    if config_path.exists():
        with open(config_path, encoding="utf-8") as f:
            config = json.load(f)
    else:
        config = {}

    # Daftar sama = jangan tulis ulang. Dulu lastScanned selalu berubah, jadi
    # tiap jalan menghasilkan commit (1.352 dari 1.623 commit per 10 Okt 2026).
    if config.get("booksFolder") == BOOKS_FOLDER and config.get("pdfs") == pdfs:
        print("Daftar buku tidak berubah, config.json dibiarkan.")
        return

    # Update daftar buku
    config["booksFolder"] = BOOKS_FOLDER
    config["pdfs"]        = pdfs
    config["lastScanned"] = __import__("datetime").datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")

    with open(config_path, "w", encoding="utf-8") as f:
        json.dump(config, f, indent=2, ensure_ascii=False)

    print(f"config.json diperbarui dengan {len(pdfs)} buku.")

if __name__ == "__main__":
    scan()
