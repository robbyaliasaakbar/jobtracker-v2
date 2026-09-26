/* ============================================
   Job Tracker - js/auth.js (PINTU DEPAN)
   Tugas: ngomong ke backend :7002, simpan token, pindah halaman.
   Token = kartu akses. Disimpan di localStorage key jobTracker.token.
   ============================================ */

const API_URL = window.JOB_API || location.protocol + "//" + location.hostname + ":7002"; // github.io: isi window.JOB_API = URL tunnel backend (misal https://api-xxx.trycloudflare.com). Lokal: kosongin, ikut host browser.
const TOKEN_KEY = "jobTracker.token";

const el = (id) => document.getElementById(id);
const msgBox = el("auth-msg");
const JUDUL = {
  login: ["Masuk", ""],
  daftar: ["Daftar", "Daftar, verifikasi email, selesai."],
  otp: ["Verifikasi OTP", "Masukkan 6 digit dari email kamu."],
  lupa: ["Lupa Password", "OTP reset dikirim kalau email terdaftar."],
  reset: ["Password Baru", "Masukkan OTP dan password baru kamu."],
};

// Ganti mode form yang tampil. 1 terlihat, 4 disembunyiin.
const MODE_FORM = { login: "form-login", daftar: "form-daftar", otp: "form-otp", lupa: "form-lupa", reset: "form-reset" };
function goto(mode) {
  Object.values(MODE_FORM).forEach((id) => el(id).classList.add("hidden"));
  el(MODE_FORM[mode]).classList.remove("hidden");
  el("auth-title").textContent = JUDUL[mode][0];
  el("auth-sub").textContent = JUDUL[mode][1];
  pesan("", false, true);
}

// Kotak pesan hijau/merah di atas form.
function pesan(teks, error = false, sembunyi = false) {
  if (sembunyi || !teks) { msgBox.classList.add("hidden"); return; }
  msgBox.classList.remove("hidden");
  msgBox.className = "mt-4 px-4 py-3 rounded-xl text-sm font-medium " +
    (error ? "bg-accent/10 text-accent" : "bg-emerald-50 text-emerald-700");
  msgBox.textContent = teks;
}

// POST JSON helper: balikin {ok, status, data}.
// Backend mati / tidak terjangkau → ok:false + pesan jelas (tidak diam seperti kemarin).
async function post(path, obj) {
  let r;
  try {
    r = await fetch(API_URL + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(obj),
    });
  } catch (e) {
    return { ok: false, status: 0, data: { error: "Server tidak terjangkau. Coba lagi nanti." } };
  }
  return { ok: r.ok, status: r.status, data: await r.json().catch(() => ({})) };
}

function masuk(token, email) {
  localStorage.setItem(TOKEN_KEY, token);
  location.replace("index.html"); // replace biar tombol back tidak balik ke auth
}

document.querySelectorAll("[data-goto]").forEach((b) =>
  b.addEventListener("click", () => goto(b.dataset.goto)));

// Show/hide password: 1 pola buat semua tombol mata (data-lihat="id-input").
// Klik → type password <-> text + emoji ganti 👁 <-> 🙈. Murni tampilan, password tidak ke mana-mana.
document.querySelectorAll("[data-lihat]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const input = el(btn.dataset.lihat);
    const lagiTutup = input.type === "password";
    input.type = lagiTutup ? "text" : "password";
    btn.textContent = lagiTutup ? "🙈" : "👁";
  });
});

// LOGIN
el("form-login").addEventListener("submit", async (e) => {
  e.preventDefault();
  const r = await post("/api/login", { email: el("li-email").value, password: el("li-pass").value });
  if (!r.ok) return pesan(r.data.error || "Gagal masuk", true);
  masuk(r.data.token, r.data.user.email);
});

// DAFTAR → lempar ke mode OTP
el("form-daftar").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = el("df-email").value;
  // Cek match di browser dulu biar instan. Server tetap ngecek ulang (wajib).
  if (el("df-pass").value !== el("df-pass2").value) {
    return pesan("Konfirmasi password tidak sama", true);
  }
  const r = await post("/api/register", {
    email,
    password: el("df-pass").value,
    password_konfirmasi: el("df-pass2").value,
    nama: el("df-nama").value,
    telepon: el("df-telp").value,
  });
  if (!r.ok) return pesan(r.data.error || r.data.message || "Gagal daftar", r.status >= 400);
  el("otp-email").textContent = email;
  el("otp-cek").textContent = r.data.cek || "(cek email kamu)"; // petunjuk dari backend, ngikutin mode kirim
  el("form-otp").dataset.email = email;
  pesan(r.data.message);
  goto("otp");
});

// VERIFIKASI OTP → langsung masuk
el("form-otp").addEventListener("submit", async (e) => {
  e.preventDefault();
  const r = await post("/api/verify", { email: el("form-otp").dataset.email || "", kode: el("otp-kode").value });
  if (!r.ok) return pesan(r.data.error || "Verifikasi gagal", true);
  masuk(r.data.token, r.data.user.email);
});

// LUPA → lempar ke mode RESET
el("form-lupa").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = el("lp-email").value;
  const r = await post("/api/forgot", { email });
  if (!r.ok) return pesan(r.data.error || "Gagal", true);
  el("reset-email").textContent = email;
  el("form-reset").dataset.email = email;
  pesan(r.data.message);
  goto("reset");
});

// RESET → balik ke login
el("form-reset").addEventListener("submit", async (e) => {
  e.preventDefault();
  const r = await post("/api/reset", {
    email: el("form-reset").dataset.email || "",
    kode: el("rs-kode").value,
    password_baru: el("rs-baru").value,
  });
  if (!r.ok) return pesan(r.data.error || "Reset gagal", true);
  pesan(r.data.message + " Silakan masuk.");
  goto("login");
});
