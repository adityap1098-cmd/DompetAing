import { Link } from "react-router-dom";

export function PrivacyPolicyPage() {
  return (
    <div className="min-h-dvh bg-[#F7F6F3] dark:bg-[#111210]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#F7F6F3]/95 dark:bg-[#111210]/95 backdrop-blur-sm border-b border-[rgba(0,0,0,0.06)] dark:border-[rgba(255,255,255,0.06)]">
        <div className="max-w-2xl mx-auto px-5 py-3 flex items-center justify-between">
          <Link
            to="/login"
            className="text-[12px] font-semibold text-accent-500 dark:text-accent-dark"
          >
            ← Kembali
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-lg">👛</span>
            <span className="text-[14px] font-bold text-[#1A1917] dark:text-[#F0EEE9]">
              DompetAing
            </span>
          </div>
          <div className="w-16" />
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-5 py-8 pb-20">
        <h1 className="text-[24px] font-extrabold text-[#1A1917] dark:text-[#F0EEE9] mb-1">
          Kebijakan Privasi
        </h1>
        <p className="text-[12px] text-[#9E9B98] dark:text-[#4A4948] mb-8">
          Terakhir diperbarui: 1 April 2026
        </p>

        <div className="space-y-6">
          {/* 1. Pendahuluan */}
          <Section title="1. Pendahuluan">
            <p>
              DompetAing adalah aplikasi pencatatan keuangan pribadi yang
              dikembangkan oleh <strong>UsahaSukses</strong>. Kebijakan privasi ini
              menjelaskan bagaimana kami mengumpulkan, menggunakan, dan melindungi
              data pribadi Anda saat menggunakan layanan kami.
            </p>
            <p>
              Dengan menggunakan DompetAing, Anda menyetujui pengumpulan dan
              penggunaan data sesuai kebijakan ini. Jika Anda tidak setuju, mohon
              untuk tidak menggunakan layanan kami.
            </p>
          </Section>

          {/* 2. Data yang Dikumpulkan */}
          <Section title="2. Data yang Dikumpulkan">
            <h4>a. Data Akun Google (Wajib)</h4>
            <p>
              Saat Anda login dengan Google, kami menerima nama, alamat email, dan
              foto profil dari akun Google Anda. Data ini digunakan untuk membuat
              dan mengidentifikasi akun DompetAing Anda.
            </p>

            <h4>b. Data Keuangan (Dibuat oleh Anda)</h4>
            <p>
              Semua data keuangan yang Anda masukkan ke DompetAing — termasuk
              akun/rekening, transaksi, kategori, budget, hutang/piutang, dan
              transaksi berulang — disimpan di server kami dan hanya dapat diakses
              oleh Anda.
            </p>

            <h4>c. Data Gmail (Opsional)</h4>
            <p>
              Fitur Gmail Sync memerlukan izin tambahan untuk membaca email
              notifikasi dari bank dan marketplace Anda. Fitur ini sepenuhnya
              opsional — Anda bisa menggunakan DompetAing tanpa menghubungkan
              Gmail.
            </p>
            <p>
              Saat diaktifkan, kami hanya membaca email dari pengirim yang
              dikenali (bank, dompet digital, dan marketplace) untuk mengekstrak
              informasi transaksi. Kami <strong>tidak</strong> menyimpan isi
              lengkap email — hanya nominal, deskripsi, dan tanggal transaksi
              yang disimpan.
            </p>
          </Section>

          {/* 3. Cara Penggunaan Data */}
          <Section title="3. Cara Penggunaan Data">
            <p>Data Anda digunakan semata-mata untuk:</p>
            <ul>
              <li>Menyediakan layanan pencatatan keuangan pribadi</li>
              <li>Menampilkan laporan dan analisis keuangan Anda</li>
              <li>Mengirim notifikasi terkait budget dan hutang (jika diaktifkan)</li>
              <li>Memproses pembayaran langganan Premium</li>
            </ul>
            <div className="bg-accent-500/5 dark:bg-accent-dark/10 border border-accent-500/20 dark:border-accent-dark/20 rounded-[12px] p-4 mt-3">
              <p className="text-[12px] font-semibold text-accent-500 dark:text-accent-dark mb-1">
                🛡️ Komitmen Kami
              </p>
              <p className="text-[12px] text-[#6B6864] dark:text-[#9E9B96]">
                Kami <strong>tidak menjual</strong>, <strong>tidak
                membagikan</strong>, dan <strong>tidak menggunakan</strong> data
                keuangan Anda untuk keperluan iklan, profiling, atau tujuan
                komersial lainnya. Data Anda adalah milik Anda.
              </p>
            </div>
          </Section>

          {/* 4. Keamanan Data */}
          <Section title="4. Keamanan Data">
            <p>
              Kami menerapkan standar keamanan untuk melindungi data Anda:
            </p>
            <ul>
              <li>
                <strong>HTTPS/TLS</strong> — Semua komunikasi antara aplikasi
                dan server terenkripsi
              </li>
              <li>
                <strong>Enkripsi database</strong> — Data disimpan di server
                dengan akses terbatas
              </li>
              <li>
                <strong>bcrypt hashing</strong> — PIN keamanan di-hash dengan
                bcrypt sebelum disimpan (tidak pernah disimpan dalam bentuk
                plain text)
              </li>
              <li>
                <strong>HTTP-only cookies</strong> — Session token disimpan
                sebagai secure HTTP-only cookie, tidak dapat diakses oleh
                JavaScript
              </li>
              <li>
                <strong>OAuth 2.0</strong> — Kami tidak pernah melihat atau
                menyimpan password Google Anda
              </li>
            </ul>
          </Section>

          {/* 5. Izin Google */}
          <Section title="5. Izin Google (OAuth Scopes)">
            <p>DompetAing meminta izin Google berikut:</p>
            <div className="space-y-2 mt-2">
              <ScopeItem
                scope="email"
                desc="Melihat alamat email Anda — untuk identifikasi akun"
                required
              />
              <ScopeItem
                scope="profile"
                desc="Melihat nama dan foto profil — untuk personalisasi"
                required
              />
              <ScopeItem
                scope="gmail.readonly"
                desc="Membaca email (read-only) — untuk fitur Gmail Sync. Kami TIDAK dapat mengirim, menghapus, atau memodifikasi email Anda."
              />
            </div>
            <p className="mt-3">
              Izin <code>gmail.readonly</code> hanya diminta saat Anda secara
              eksplisit mengaktifkan fitur Gmail Sync. Anda dapat mencabut izin
              ini kapan saja melalui{" "}
              <a
                href="https://myaccount.google.com/permissions"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent-500 dark:text-accent-dark underline"
              >
                Google Account Permissions
              </a>
              .
            </p>
          </Section>

          {/* 6. Hak Pengguna */}
          <Section title="6. Hak Anda">
            <p>Sebagai pengguna DompetAing, Anda berhak untuk:</p>
            <ul>
              <li>
                <strong>Mengakses data</strong> — Lihat semua data keuangan Anda
                melalui aplikasi
              </li>
              <li>
                <strong>Mengekspor data</strong> — Export seluruh transaksi ke
                format CSV, Excel, atau PDF
              </li>
              <li>
                <strong>Menghapus akun</strong> — Minta penghapusan akun dan
                seluruh data terkait dengan menghubungi tim support kami
              </li>
              <li>
                <strong>Mencabut izin Gmail</strong> — Putuskan koneksi Gmail
                kapan saja melalui halaman pengaturan Gmail Sync
              </li>
              <li>
                <strong>Mencabut izin Google</strong> — Cabut semua akses
                DompetAing melalui{" "}
                <a
                  href="https://myaccount.google.com/permissions"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent-500 dark:text-accent-dark underline"
                >
                  Google Account Permissions
                </a>
              </li>
            </ul>
          </Section>

          {/* 7. Pembayaran */}
          <Section title="7. Pembayaran">
            <p>
              Pembayaran langganan Premium diproses melalui{" "}
              <strong>Midtrans</strong>, penyedia payment gateway yang terdaftar
              dan diawasi oleh Bank Indonesia. DompetAing tidak menyimpan
              informasi kartu kredit, rekening bank, atau data pembayaran
              sensitif lainnya.
            </p>
            <p>
              Data yang kami simpan terkait pembayaran hanya berupa: ID order,
              status pembayaran, jumlah, metode pembayaran (nama saja, bukan
              detail), dan tanggal transaksi.
            </p>
          </Section>

          {/* 8. Perubahan Kebijakan */}
          <Section title="8. Perubahan Kebijakan">
            <p>
              Kami dapat memperbarui kebijakan privasi ini dari waktu ke waktu.
              Perubahan signifikan akan diberitahukan melalui notifikasi di
              dalam aplikasi. Kami menyarankan Anda untuk meninjau halaman ini
              secara berkala.
            </p>
          </Section>

          {/* 9. Kontak */}
          <Section title="9. Kontak">
            <p>
              Jika Anda memiliki pertanyaan tentang kebijakan privasi ini atau
              ingin menggunakan hak-hak Anda, silakan hubungi kami:
            </p>
            <div className="bg-white dark:bg-[#1C1D1A] rounded-[14px] border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)] p-4 mt-3">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className="text-[14px]">🏢</span>
                  <span className="text-[12px] text-[#1A1917] dark:text-[#F0EEE9] font-semibold">
                    UsahaSukses
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[14px]">📧</span>
                  <a
                    href="mailto:support@usahasukses.net"
                    className="text-[12px] text-accent-500 dark:text-accent-dark font-medium"
                  >
                    support@usahasukses.net
                  </a>
                </div>
              </div>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}

// ── Reusable section component ──

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-[#1C1D1A] rounded-[14px] border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)] p-5">
      <h3 className="text-[14px] font-bold text-[#1A1917] dark:text-[#F0EEE9] mb-3">
        {title}
      </h3>
      <div className="space-y-2 text-[12px] text-[#6B6864] dark:text-[#9E9B96] leading-relaxed [&_h4]:text-[12px] [&_h4]:font-bold [&_h4]:text-[#1A1917] [&_h4]:dark:text-[#F0EEE9] [&_h4]:mt-3 [&_h4]:mb-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_strong]:text-[#1A1917] [&_strong]:dark:text-[#F0EEE9] [&_code]:bg-[#F0EEE9] [&_code]:dark:bg-[#242522] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-[11px] [&_code]:font-mono">
        {children}
      </div>
    </div>
  );
}

// ── OAuth scope display ──

function ScopeItem({
  scope,
  desc,
  required,
}: {
  scope: string;
  desc: string;
  required?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 bg-[#F7F6F3] dark:bg-[#111210] rounded-[10px] px-3 py-2.5">
      <code className="text-[11px] font-mono text-accent-500 dark:text-accent-dark shrink-0 mt-px">
        {scope}
      </code>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-[#6B6864] dark:text-[#9E9B96]">{desc}</p>
        {required ? (
          <span className="inline-block mt-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
            Wajib
          </span>
        ) : (
          <span className="inline-block mt-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
            Opsional
          </span>
        )}
      </div>
    </div>
  );
}
