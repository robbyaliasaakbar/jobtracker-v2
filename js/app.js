/* ============================================
   Job Tracker - app.js (OTAK TAMPILAN)
   Tugas: render tabel, search, filter, sort, statistik, form.
   DILARANG pegang localStorage langsung. Wajib lewat store.js:
   getAll(), add(), update(), remove()
   ============================================ */

// 1. Daftar status final 7 (kode -> label + warna badge Tailwind)
const STATUS_LIST = [
  { kode: "baru", label: "Baru Lamar", badge: "bg-slate-100 text-slate-700" },
  { kode: "interview-hr", label: "Interview HR", badge: "bg-sky-100 text-sky-700" },
  { kode: "technical-test", label: "Technical Test", badge: "bg-violet-100 text-violet-700" },
  { kode: "interview-user", label: "Interview User", badge: "bg-orange-100 text-orange-700" },
  { kode: "offering", label: "Offering Letter", badge: "bg-emerald-100 text-emerald-700" },
  { kode: "diterima", label: "Diterima", badge: "bg-green-600 text-white" },
  { kode: "ditolak", label: "Ditolak", badge: "bg-rose-100 text-rose-700" },
];

// Cari label + badge dari kode status
function statusMeta(kode) {
  return STATUS_LIST.find((s) => s.kode === kode) || STATUS_LIST[0];
}

// 2. State sementara (gak disimpan, cuma buat tampilan)
let searchText = "";
let filterStatus = "semua";
let sortMode = "terbaru"; // terbaru | terlama
let editingId = null; // kalau lagi edit, isi id-nya. Kalau tambah baru, null.
let lastAddedId = null; // buat animasi baris baru

// 3. Ambil elemen HTML sekali di awal biar gampang
const el = (id) => document.getElementById(id);
const form = el("form-lamaran");
const inputCompany = el("in-company");
const inputPosition = el("in-position");
const inputDate = el("in-date");
const inputStatus = el("in-status");
const inputPortal = el("in-portal");
const inputLink = el("in-link");
const btnSubmit = el("btn-submit");
const btnBatal = el("btn-batal");
const formTitle = el("form-title");
const tabelBody = el("tabel-body");
const cardsMobile = el("cards-mobile");
const emptyState = el("empty-state");
const searchInput = el("search");
const filterSelect = el("filter-status");
const sortSelect = el("sort-tanggal");

// Isi default tanggal = hari ini (format yyyy-mm-dd buat input date)
function todayISO() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const t = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${t}`;
}

// Ubah yyyy-mm-dd jadi dd-mm-yyyy biar enak dibaca
function formatTanggal(iso) {
  if (!iso) return "-";
  const p = iso.split("-");
  if (p.length !== 3) return iso;
  return `${p[2]}-${p[1]}-${p[0]}`;
}

// 4. Toast kecil (3 detik, gaya portfolio: hitam / merah aksen)
function toast(pesan, error = false) {
  const box = el("toast-box");
  const div = document.createElement("div");
  div.className =
    "jt-toast pointer-events-auto px-4 py-3 rounded-xl shadow text-sm font-medium text-white " +
    (error ? "bg-accent" : "bg-ink");
  div.textContent = pesan;
  box.appendChild(div);
  setTimeout(() => div.remove(), 3000);
}

// 5. Statistik: Total | Proses | Interview | Offering + Chart konversi
// Aturan funnel (dikunci, jujur): karena kita cuma simpan status TERAKHIR,
// yang dihitung lolos tahap = statusnya sudah lewat tahap itu.
// Ditolak tidak dihitung karena tidak ketahuan ditolak di tahap apa.
const FUNNEL_AWAL = ["interview-hr", "technical-test", "interview-user", "offering", "diterima"];
const FUNNEL_USER = ["interview-user", "offering", "diterima"];
const FUNNEL_OFFERING = ["offering", "diterima"];

function hitungFunnel(list) {
  const total = list.length;
  const awal = list.filter((x) => FUNNEL_AWAL.includes(x.status)).length;
  const user = list.filter((x) => FUNNEL_USER.includes(x.status)).length;
  const offering = list.filter((x) => FUNNEL_OFFERING.includes(x.status)).length;
  const pct = (n) => (total === 0 ? 0 : Math.round((n / total) * 1000) / 10);
  return { total, awal, user, offering, pctAwal: pct(awal), pctUser: pct(user), pctOffering: pct(offering) };
}

let chartKonversi = null; // simpan objek Chart biar bisa diupdate, bukan bikin baru terus

function renderChart(list) {
  const f = hitungFunnel(list);

  // Update 3 kartu persentase + progress bar animasi (lebar berubah halus via CSS)
  el("pct-awal").textContent = f.pctAwal;
  el("bar-awal").style.width = f.pctAwal + "%";
  el("count-awal").textContent = `${f.awal} dari ${f.total} lamaran`;

  el("pct-user").textContent = f.pctUser;
  el("bar-user").style.width = f.pctUser + "%";
  el("count-user").textContent = `${f.user} dari ${f.total} lamaran`;

  el("pct-offering").textContent = f.pctOffering;
  el("bar-offering").style.width = f.pctOffering + "%";
  el("count-offering").textContent = `${f.offering} dari ${f.total} lamaran`;

  const emptyMsg = el("chart-empty");
  const canvas = el("chart-konversi");

  // Kalau belum ada data atau Chart.js gagal load (offline), jangan error
  if (f.total === 0 || typeof Chart === "undefined") {
    if (chartKonversi) { chartKonversi.destroy(); chartKonversi = null; }
    canvas.style.display = f.total === 0 ? "none" : "block";
    emptyMsg.classList.remove("hidden");
    emptyMsg.textContent = f.total === 0
      ? "Tambah minimal 1 lamaran biar garisnya muncul 📈"
      : "Chart.js belum ke-load (butuh internet sekali). Persentase di atas tetap jalan.";
    return;
  }
  emptyMsg.classList.add("hidden");
  canvas.style.display = "block";

  // Tren: urut tanggal paling lama → baru, hitung % kumulatif 1 per 1
  // Contoh: lamaran ke-3 = % dari 3 lamaran pertama. Jadinya garis naik/turun keliatan.
  const urut = [...list].sort((a, b) => a.date.localeCompare(b.date));
  const labels = urut.map((_, i) => `Ke-${i + 1}`);
  const dataAwal = [];
  const dataUser = [];
  const dataOffering = [];
  for (let i = 1; i <= urut.length; i++) {
    const potong = urut.slice(0, i);
    const ff = hitungFunnel(potong);
    dataAwal.push(ff.pctAwal);
    dataUser.push(ff.pctUser);
    dataOffering.push(ff.pctOffering);
  }

  const data = {
    labels,
    datasets: [
      { label: "Interview Awal %", data: dataAwal, borderColor: "#dc2626", backgroundColor: "rgba(220,38,38,0.15)", fill: true, tension: 0.4, pointRadius: 4, pointHoverRadius: 6, pointBackgroundColor: "#dc2626", pointBorderColor: "#dc2626" },
      { label: "Interview User %", data: dataUser, borderColor: "#eab308", backgroundColor: "rgba(234,179,8,0.18)", fill: true, tension: 0.4, pointRadius: 4, pointHoverRadius: 6, pointBackgroundColor: "#eab308", pointBorderColor: "#eab308" },
      { label: "Offering %", data: dataOffering, borderColor: "#059669", backgroundColor: "rgba(5,150,105,0.15)", fill: true, tension: 0.4, pointRadius: 4, pointHoverRadius: 6, pointBackgroundColor: "#059669", pointBorderColor: "#059669" },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 800, easing: "easeOutQuart" }, // animasi garisnya di sini
    scales: { y: { min: 0, max: 100, ticks: { callback: (v) => v + "%" } } },
    plugins: {
      legend: {
        position: "bottom",
        labels: { usePointStyle: true, pointStyle: "circle", padding: 18, boxWidth: 12, boxHeight: 12, font: { size: 13 } },
      },
      tooltip: { callbacks: { label: (c) => ` ${c.dataset.label}: ${c.parsed.y}%` } },
    },
  };

  if (chartKonversi) {
    chartKonversi.data = data;
    chartKonversi.options = options;
    chartKonversi.update();
  } else {
    chartKonversi = new Chart(canvas, { type: "line", data, options });
  }
}

function renderStatistik(list) {
  const interviewKode = ["interview-hr", "technical-test", "interview-user"];
  const total = list.length;
  const selesai = list.filter((x) => x.status === "diterima" || x.status === "ditolak").length;
  const proses = total - selesai;
  const interview = list.filter((x) => interviewKode.includes(x.status)).length;
  const offering = list.filter((x) => x.status === "offering").length;

  el("stat-total").textContent = total;
  el("stat-proses").textContent = proses;
  el("stat-interview").textContent = interview;
  el("stat-offering").textContent = offering;
  renderChart(list); // chart selalu ngikut data terbaru + animasi
}

// 6. Otak sorting: search + filter + sort digabung
function getFiltered() {
  let list = getAll(); // dari store.js

  // a. Search di company + position + portal
  const q = searchText.trim().toLowerCase();
  if (q) {
    list = list.filter((x) =>
      (x.company + " " + x.position + " " + x.portal).toLowerCase().includes(q)
    );
  }

  // b. Filter status
  if (filterStatus !== "semua") {
    list = list.filter((x) => x.status === filterStatus);
  }

  // c. Sort tanggal
  list = [...list].sort((a, b) => {
    if (sortMode === "terlama") return a.date.localeCompare(b.date);
    return b.date.localeCompare(a.date); // terbaru = date gede di atas
  });

  return list;
}

// 7. Render tabel (desktop) + kartu (mobile)
function renderTabel() {
  const list = getFiltered();
  renderStatistik(getAll()); // statistik selalu dari semua data, bukan yang kefilter

  // Kosong?
  if (list.length === 0) {
    tabelBody.innerHTML = "";
    cardsMobile.innerHTML = "";
    emptyState.classList.remove("hidden");
    return;
  }
  emptyState.classList.add("hidden");

  // --- Desktop: baris tabel ---
  tabelBody.innerHTML = list
    .map((x) => {
      const meta = statusMeta(x.status);
      const isNew = x.id === lastAddedId ? " jt-row-new" : "";
      const linkCell = x.link
        ? `<a href="${escapeHtml(x.link)}" target="_blank" rel="noopener" class="text-xs font-semibold text-accent hover:underline">Buka ↗</a>`
        : `<span class="text-neutral-300">-</span>`;
      return `
      <tr class="border-t border-black/5${isNew}">
        <td class="px-3 py-3 font-mono text-xs text-neutral-500">${x.id}</td>
        <td class="px-3 py-3 font-semibold text-ink">${escapeHtml(x.company)}</td>
        <td class="px-3 py-3 text-neutral-700">${escapeHtml(x.position)}</td>
        <td class="px-3 py-3 text-neutral-600 whitespace-nowrap">${formatTanggal(x.date)}</td>
        <td class="px-3 py-3"><span class="jt-badge inline-block text-xs font-semibold px-2.5 py-1 rounded-full ${meta.badge}">${meta.label}</span></td>
        <td class="px-3 py-3 text-neutral-600">${escapeHtml(x.portal)}</td>
        <td class="px-3 py-3">${linkCell}</td>
        <td class="px-3 py-3 whitespace-nowrap">
          <button onclick="mulaiEdit('${x.id}')" class="jt-btn text-xs font-semibold px-3 py-1.5 rounded-lg border border-ink/15 hover:bg-ink hover:text-white">Edit</button>
          <button onclick="hapusData('${x.id}')" class="jt-btn text-xs font-semibold px-3 py-1.5 rounded-lg bg-accent/10 text-accent hover:bg-accent hover:text-white ml-1">Hapus</button>
        </td>
      </tr>`;
    })
    .join("");

  // --- Mobile: kartu gede biar enak di jempol ---
  cardsMobile.innerHTML = list
    .map((x) => {
      const meta = statusMeta(x.status);
      const isNew = x.id === lastAddedId ? " jt-row-new" : "";
      const linkBtn = x.link
        ? `<a href="${escapeHtml(x.link)}" target="_blank" rel="noopener" class="jt-btn block text-center text-sm font-semibold text-accent bg-accent/10 hover:bg-accent hover:text-white rounded-xl px-4 py-3">Buka Postingan ↗</a>`
        : ``;
      return `
      <div class="jt-card jt-lift border border-black/10 rounded-2xl p-4 bg-paper shadow-sm${isNew}">
        <div class="flex items-start justify-between gap-2">
          <div>
            <p class="font-bold text-ink leading-tight">${escapeHtml(x.company)}</p>
            <p class="text-sm text-neutral-600 mt-0.5">${escapeHtml(x.position)}</p>
          </div>
          <span class="jt-badge shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded-full ${meta.badge}">${meta.label}</span>
        </div>
        <p class="text-xs text-neutral-500 mt-2 font-mono">${x.id} • ${formatTanggal(x.date)} • ${escapeHtml(x.portal)}</p>
        <div class="mt-3 space-y-2">
          ${linkBtn}
          <div class="grid grid-cols-2 gap-2">
            <button onclick="mulaiEdit('${x.id}')" class="jt-btn text-sm font-semibold px-4 py-3 rounded-xl border border-ink/15 hover:bg-ink hover:text-white">Edit</button>
            <button onclick="hapusData('${x.id}')" class="jt-btn text-sm font-semibold px-4 py-3 rounded-xl bg-accent/10 text-accent hover:bg-accent hover:text-white">Hapus</button>
          </div>
        </div>
      </div>`;
    })
    .join("");
}

// Biar aman kalau company ada tanda < > "
function escapeHtml(s) {
  return String(s || "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

// 8. Submit form (tambah baru ATAU simpan edit) — tulis ke SERVER via store.js
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const data = {
    company: inputCompany.value,
    position: inputPosition.value,
    date: inputDate.value || todayISO(),
    status: inputStatus.value,
    portal: inputPortal.value,
    link: inputLink.value,
  };

  // Validasi wajib
  if (!data.company.trim() || !data.position.trim() || !data.portal.trim()) {
    toast("Perusahaan, posisi & portal wajib diisi", true);
    return;
  }

  try {
    if (editingId) {
      await update(editingId, data); // dari store.js (server)
      toast(`${editingId} diupdate`);
      editingId = null;
      btnSubmit.textContent = "+ Tambah Lamaran";
      btnBatal.classList.add("hidden");
      formTitle.textContent = "Tambah Lamaran";
    } else {
      const baru = await add(data); // dari store.js (server)
      lastAddedId = baru.id;
      toast(`${baru.id} kesimpen`);
    }
  } catch (err) {
    toast(err.message || "Gagal menyimpan", true);
    return;
  }

  form.reset();
  inputDate.value = todayISO();
  renderTabel();
});

// 9. Batal edit
btnBatal.addEventListener("click", () => {
  editingId = null;
  form.reset();
  inputDate.value = todayISO();
  btnSubmit.textContent = "+ Tambah Lamaran";
  btnBatal.classList.add("hidden");
  formTitle.textContent = "Tambah Lamaran";
});

// 10. Edit: isi form dengan data lama
function mulaiEdit(id) {
  const item = getAll().find((x) => String(x.id) === String(id));
  if (!item) return;
  editingId = id;
  inputCompany.value = item.company;
  inputPosition.value = item.position;
  inputDate.value = item.date;
  inputStatus.value = item.status;
  inputPortal.value = item.portal;
  inputLink.value = item.link || "";
  btnSubmit.textContent = "Simpan Perubahan";
  btnBatal.classList.remove("hidden");
  formTitle.textContent = "Edit " + id;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// 11. Hapus + confirm (hapus di SERVER via store.js)
async function hapusData(id) {
  const item = getAll().find((x) => String(x.id) === String(id));
  const nama = item ? `${item.id} ${item.company}` : id;
  if (!confirm(`Yakin hapus ${nama}?`)) return;
  try {
    await remove(id); // dari store.js (server)
  } catch (err) {
    toast(err.message || "Gagal menghapus", true);
    return;
  }
  toast(`${id} dihapus`);
  if (editingId === id) {
    editingId = null;
    form.reset();
    inputDate.value = todayISO();
    btnSubmit.textContent = "+ Tambah Lamaran";
    btnBatal.classList.add("hidden");
    formTitle.textContent = "Tambah Lamaran";
  }
  renderTabel();
}

// 12. Search / filter / sort: tiap berubah langsung render ulang
searchInput.addEventListener("input", (e) => {
  searchText = e.target.value;
  renderTabel();
});
filterSelect.addEventListener("change", (e) => {
  filterStatus = e.target.value;
  renderTabel();
});
sortSelect.addEventListener("change", (e) => {
  sortMode = e.target.value;
  renderTabel();
});

// 13. Jalan pertama: tarik server dulu (initStore), baru render.
// Kalau server mati: tampilkan arsip lokal + toast (guard juga notice).
inputDate.value = todayISO();
initStore()
  .then(() => renderTabel())
  .catch((err) => {
    renderTabel();
    toast(err.message || "Server tidak terjangkau. Menampilkan data lokal.", true);
  });

// Reveal on scroll ala portfolio (hormat prefers-reduced-motion)
(function initReveal() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    document.querySelectorAll("[data-reveal]").forEach((n) => n.classList.add("revealed"));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => entries.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add("revealed"); io.unobserve(en.target); }
    }),
    { threshold: 0.12 }
  );
  document.querySelectorAll("[data-reveal]").forEach((n, i) => {
    n.style.transitionDelay = Math.min(i % 4, 3) * 60 + "ms";
    io.observe(n);
  });
})();

// Navbar blur pas scroll ala portfolio
(function initNavbar() {
  const nav = document.getElementById("site-navbar");
  if (!nav) return;
  const onScroll = () => nav.classList.toggle("nav-scrolled", window.scrollY > 24);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
})();
