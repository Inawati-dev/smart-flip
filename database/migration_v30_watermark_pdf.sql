-- v30 (antrean #157, 10 Okt 2026): setelan watermark pembaca PDF per mata kuliah.
-- Bila hidup, pembaca menumpangkan nama dan NIM pembaca di tiap halaman.
-- Aman dijalankan ulang.

ALTER TABLE courses ADD COLUMN IF NOT EXISTS watermark_pdf BOOLEAN NOT NULL DEFAULT false;

NOTIFY pgrst, 'reload schema';
