# Surat ke GitHub Support: hapus commit lama yang memuat berkas peka

Dibuat 10 Okt 2026 untuk antrean #125. Belum dikirim. Kirim lewat https://support.github.com/request (pilih "Remove data from a repository I own or control"), dari akun pemilik repo. Teks di bawah sengaja berbahasa Inggris karena itu bahasa formulirnya.

Yang perlu diisi sendiri sebelum mengirim: nama dan surel kontak di bagian akhir.

---

**Subject:** Request to purge unreachable commits and cached views containing a sensitive file

Hello,

I own the repositories below. A private invoice PDF and several copyrighted PDFs were committed by mistake and have now been removed from the full history of every branch with a history rewrite and force push on 10 October 2026. GitHub Pages has also been disabled on both repositories.

Repositories:

- `Inawati-dev/smart-flip`
- `JIAkbar/smart-flipbook`

The old commits are no longer reachable from any branch or tag, but they can still be opened directly by SHA, and the files can still be read through those SHAs. Examples of old branch tips that are now unreachable:

- `Inawati-dev/smart-flip`: `af70f8f1016ef75a12494c7b4b269bf783fcc1d0` (old `main`), `f3dbd56` (old `legacy/main-vanilla-html`)
- `JIAkbar/smart-flipbook`: `f4271fd` (old `main`)

The sensitive file was at this path in the old history:

- `books/FAKTUR FV 8 JUNI 2026.pdf`

Could you please:

1. Run garbage collection on both repositories so the unreachable commits and their objects are removed.
2. Remove any cached views of those commits and of the file above.
3. Confirm there are no pull request references or forks still holding the old objects. Both repositories show zero forks and zero pull requests on my side.

Thank you.

Name:
Contact email:
