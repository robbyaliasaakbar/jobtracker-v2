/* ============================================
   Job Tracker - store.js (OTAK DATABASE, ONLINE)
   Dulu: localStorage per device. Sekarang: server via API.
   app.js TETAP manggil getAll/add/update/remove yang sama.
   Bedanya: getAll baca cache (sync), tulis (add/update/remove)
   async ke server lalu update cache. ID dari server (angka).
   Migrasi 1x: data lokal lama di-upload ke server biar ga ilang.
   ============================================ */

const DB_KEY = "jobTracker.lamaran.v1"; // sisa arsip lokal (dibaca 1x pas migrasi)
const MIGRATED_KEY = "jobTracker.migrated.v1"; // tanda migrasi 1x per browser
const TOKEN_KEY = "jobTracker.token"; // sama kayak auth.js + guard.js

const STORE_API = window.JOB_API || location.protocol + "//" + location.hostname + ":7002";

let cache = []; // sumber baca app.js. Diisi initStore() pas halaman dibuka.

// Telepon server. Token ikut otomatis. Gagal → throw Error netral (tanpa bocor :7002).
async function api(path, method, data) {
  const token = localStorage.getItem(TOKEN_KEY) || "";
  let res;
  try {
    res = await fetch(STORE_API + path, {
      method: method || "GET",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
      body: data ? JSON.stringify(data) : undefined,
    });
  } catch (e) {
    throw new Error("Server tidak terjangkau. Coba lagi nanti.");
  }
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.error || ("Gagal (kode " + res.status + ")"));
  return j;
}

// Baca arsip lokal lama (format lamaran-001). Cuma dipakai migrasi 1x.
function loadLokal() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch (e) {
    return [];
  }
}

// 0. Wajib dipanggil 1x pas halaman dibuka, SEBELUM render pertama.
// Urutan: tarik server → migrasi lokal (kalau belum) → tarik ulang.
async function initStore() {
  try {
    const j = await api("/api/lamaran", "GET");
    cache = j.data || [];
  } catch (e) {
    cache = loadLokal(); // backend mati: mode baca lokal (guard sudah toast)
    throw e;
  }
  if (!localStorage.getItem(MIGRATED_KEY)) {
    const lokal = loadLokal();
    const ada = new Set(cache.map((x) => (x.company + "|" + x.position + "|" + x.date).toLowerCase()));
    for (const item of lokal) {
      const kunci = ((item.company || "") + "|" + (item.position || "") + "|" + (item.date || "")).toLowerCase();
      if (ada.has(kunci)) continue; // sudah ada di server (misal migrasi dari HP)
      try {
        await api("/api/lamaran", "POST", item);
      } catch (e) { /* 1 gagal jangan gugurin sisanya */ }
    }
    localStorage.setItem(MIGRATED_KEY, "1");
    const ulang = await api("/api/lamaran", "GET").catch(() => null);
    if (ulang) cache = ulang.data || cache;
  }
  return cache;
}

// 1. Ambil semua lamaran (dari cache, sync — app.js ga berubah).
function getAll() {
  return cache;
}

// 2. Tambah 1 lamaran. data = {company, position, date, status, portal, link}
async function add(data) {
  const item = await api("/api/lamaran", "POST", data);
  cache.push(item);
  return item;
}

// 3. Edit 1 lamaran berdasar id
async function update(id, dataBaru) {
  const item = await api("/api/lamaran/" + encodeURIComponent(id), "PUT", dataBaru);
  const i = cache.findIndex((x) => String(x.id) === String(id));
  if (i !== -1) cache[i] = item;
  return item;
}

// 4. Hapus 1 berdasar id
async function remove(id) {
  await api("/api/lamaran/" + encodeURIComponent(id), "DELETE");
  cache = cache.filter((x) => String(x.id) !== String(id));
  return cache;
}

// 5. Hapus semua (buat testing / reset) — hapus 1-1 via API
async function clear() {
  const ids = cache.map((x) => x.id);
  for (const id of ids) {
    try { await remove(id); } catch (e) { /* lanjut */ }
  }
  return cache;
}
