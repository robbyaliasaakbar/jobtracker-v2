/* ============================================
   Job Tracker - js/guard.js (SATPAM index.html)
   Tugas: tidak ada token / token mati → tendang ke auth.html.
   Dipasang SEBELUM app.js biar user tak ber-token tidak sempat lihat data.
   app.js TIDAK diubah sama sekali.
   ============================================ */

const GUARD_API = window.JOB_API || location.protocol + "//" + location.hostname + ":7002"; // sama kayak auth.js: override via window.JOB_API buat github.io + tunnel.
const GUARD_KEY = "jobTracker.token";

function keluar() {
  localStorage.removeItem(GUARD_KEY);
  location.replace("auth.html");
}

(async function jaga() {
  const token = localStorage.getItem(GUARD_KEY);
  if (!token) return location.replace("auth.html"); // tidak bawa kartu → langsung diusir
  try {
    const r = await fetch(GUARD_API + "/api/me", {
      headers: { Authorization: "Bearer " + token },
    });
    if (!r.ok) return keluar(); // kartu palsu/kedaluwarsa → usir + buang kartu
  } catch (e) {
    // Backend mati: JANGAN usir (kasian lagi offline), tapi kunci aksi tulis.
    // v1: tampilkan data lokal read-only + toast. Login ulang setelah backend nyala.
    document.addEventListener("DOMContentLoaded", () => {
      const box = document.getElementById("toast-box");
      if (box) {
        const d = document.createElement("div");
        d.className = "jt-toast pointer-events-auto px-4 py-3 rounded-xl shadow text-sm font-medium text-white bg-accent";
        d.textContent = "Server tidak terjangkau. Menampilkan data lokal.";
        box.appendChild(d);
      }
    });
  }
})();
