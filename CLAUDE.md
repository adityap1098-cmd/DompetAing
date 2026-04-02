# CLAUDE.md — Permanent Rules for DompetAing

## RULE 1: Never overwrite VALID_SCHEMES
JANGAN PERNAH overwrite VALID_SCHEMES saat edit file settings/preferences route.
Selalu APPEND, jangan replace array.

## RULE 2: Read before edit
Sebelum edit file apapun, baca dulu isi file yang ada. Jangan tulis ulang dari nol.

## RULE 3: Verify existing features after edit
Setiap selesai edit, verifikasi bahwa fitur yang SUDAH JALAN sebelumnya masih jalan.
Khususnya: template warna, theme, feature gate.

## RULE 4: VALID_SCHEMES must always contain ALL of these
```
sage_green, ocean_blue, royal_purple, sunset_orange,
teal_green, hot_pink, navy_blue, steel_gray,
gold, rose_gold, midnight_blue, emerald,
burgundy, charcoal,
islamic_gold, ocean_wave, forest_nature,
sakura_pink, geometric_dark, batik_heritage
```

## RULE 5: Dashboard empty states WAJIB selalu ada
Dashboard empty states WAJIB selalu ada untuk:
- **Aset Saya**: Jika belum ada akun → icon 🏦 + "Belum ada aset" + tombol "+ Tambah Aset"
- **Budget Bulan Ini**: Jika belum ada budget → empty state + link buat budget
- **Hutang & Piutang**: Jika belum ada hutang → empty state
- **Transaksi Terbaru**: Jika belum ada transaksi → empty state

JANGAN PERNAH hapus empty state saat edit Dashboard.tsx.
Setiap section di Dashboard HARUS punya 3 state: loading, empty, dan data.
