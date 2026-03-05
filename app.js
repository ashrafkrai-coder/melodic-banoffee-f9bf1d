$(document).ready(function() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function() {
      navigator.serviceWorker.register("/service-worker.js").catch(function(err) {
        console.error("Gagal daftar service worker:", err);
      });
    });
  }

  const SCRIPT_URL = "https://script.google.com/macros/s/AKfycby4w2GYtoSmL1-aWZ4QU3cfy4yps_g707AARWWYQyKquMtpR9UgkhrCrWAsjbw2y6mH/exec";
  const SHEET_ID = "1qg1D0lhokOzR3sfecmQK83tdsxJq6HAPwYtP8K6DpH4";
  const SHEET_NAME = "log_imbas";

  const statusLine = document.getElementById("statusLine");
  const recordCount = document.getElementById("recordCount");
  const filterTarikh = document.getElementById("filterTarikh");
  const widgetTotal = document.getElementById("widgetTotal");
  const widgetSimpan = document.getElementById("widgetSimpan");
  const widgetAmbil = document.getElementById("widgetAmbil");
  const widgetPercent = document.getElementById("widgetPercent");
  const widgetPercentBar = document.getElementById("widgetPercentBar");
  const refreshInfo = document.getElementById("refreshInfo");
  const debugLine = document.getElementById("debugLine");
  const todayPill = document.getElementById("todayPill");
  const chartEmptyState = document.getElementById("chartEmptyState");
  const statusDonutEmptyState = document.getElementById("statusDonutEmptyState");
  const trendHarianEmptyState = document.getElementById("trendHarianEmptyState");
  const toggleManualPanel = document.getElementById("toggleManualPanel");
  const manualPanelBody = document.getElementById("manualPanelBody");
  const manualKelas = document.getElementById("manualKelas");
  const manualNama = document.getElementById("manualNama");
  const manualPassword = document.getElementById("manualPassword");
  const btnSimpanManual = document.getElementById("btnSimpanManual");
  const manualStatus = document.getElementById("manualStatus");
  const GURU_PASSWORD = "myFon1234";
  let kelasSimpanChart = null;
  let statusDonutChart = null;
  let trendHarianChart = null;
  let hasLoadedDataOnce = false;
  let namaByKelasMap = new Map();
  let latestAllRows = [];

  var table = $("#jadualStatistik").DataTable({
    dom: "Bfrtip",
    autoWidth: false,
    columnDefs: [
      { targets: 0, width: "38%" }
    ],
    buttons: [
      { extend: "pdf", text: "📄 Muat Turun (PDF)", className: "btn btn-sm" },
      { extend: "print", text: "🖨️ Cetak", className: "btn btn-sm" }
    ],
    language: {
      search: "Carian pantas:",
      lengthMenu: "Papar _MENU_ rekod",
      info: "Memaparkan _START_ hingga _END_ daripada _TOTAL_ rekod",
      infoEmpty: "Tiada rekod",
      emptyTable: "Tiada data untuk dipaparkan"
    }
  });

  function isSimpanRecord(row) {
    const status = String(row[5] || "").toUpperCase().trim();
    const masaAmbil = String(row[4] || "").trim();
    const isSimpanText = status.includes("DISIMPAN") || status.includes("SIMPAN");
    const isAmbilText = status.includes("DIAMBIL") || status.includes("AMBIL");
    const isBelumAmbil = masaAmbil === "" || masaAmbil === "-";
    return isSimpanText || (!isAmbilText && isBelumAmbil);
  }

  function isAmbilRecord(row) {
    const status = String(row[5] || "").toUpperCase().trim();
    const masaAmbil = String(row[4] || "").trim();
    return status.includes("DIAMBIL") || status.includes("AMBIL") || (masaAmbil !== "" && masaAmbil !== "-");
  }

  function setLoadingState(isLoading) {
    if (!statusLine) return;
    if (isLoading) {
      statusLine.textContent = "Sedang tarik data live hari ini...";
    }
  }

  function renderKelasSimpanChart(rows) {
    if (typeof Chart === "undefined") {
      if (chartEmptyState) chartEmptyState.textContent = "Carta tidak tersedia.";
      return;
    }

    const simpanRows = rows.filter(isSimpanRecord);
    const countByKelas = {};

    simpanRows.forEach(function(row) {
      const kelas = String(row[1] || "-").trim() || "-";
      countByKelas[kelas] = (countByKelas[kelas] || 0) + 1;
    });

    const labels = Object.keys(countByKelas).sort(function(a, b) {
      return a.localeCompare(b, "ms");
    });
    const values = labels.map(function(k) { return countByKelas[k]; });

    if (kelasSimpanChart) {
      kelasSimpanChart.destroy();
      kelasSimpanChart = null;
    }

    if (!labels.length) {
      if (chartEmptyState) chartEmptyState.textContent = "Tiada data simpan untuk carta.";
      return;
    }

    if (chartEmptyState) chartEmptyState.textContent = "";
    const ctx = document.getElementById("kelasSimpanChart");
    kelasSimpanChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [{
          label: "Bil Murid Simpan Telefon",
          data: values,
          borderWidth: 1,
          borderRadius: 10,
          maxBarThickness: 56,
          categoryPercentage: 0.72,
          barPercentage: 0.9,
          backgroundColor: "rgba(171, 122, 255, 0.75)",
          borderColor: "rgba(224, 199, 255, 0.95)"
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: { color: "#e7ddff" }
          }
        },
        scales: {
          x: {
            ticks: { color: "#d5c6fb" },
            grid: { color: "rgba(174, 145, 240, 0.15)" }
          },
          y: {
            beginAtZero: true,
            ticks: { precision: 0, color: "#d5c6fb" },
            grid: { color: "rgba(174, 145, 240, 0.15)" }
          }
        }
      }
    });
  }

  function updateWidgets(rows) {
    recordCount.textContent = `${rows.length} rekod`;
    widgetTotal.textContent = String(rows.length);

    const simpanCount = rows.filter(isSimpanRecord).length;
    const ambilCount = rows.filter(isAmbilRecord).length;
    const percent = rows.length ? Math.round((ambilCount / rows.length) * 100) : 0;

    widgetSimpan.textContent = String(simpanCount);
    widgetAmbil.textContent = String(ambilCount);
    widgetPercent.textContent = `${percent}%`;
    widgetPercentBar.style.width = `${percent}%`;
  }

  function resetWidgets() {
    recordCount.textContent = "0 rekod";
    widgetTotal.textContent = "0";
    widgetSimpan.textContent = "0";
    widgetAmbil.textContent = "0";
    widgetPercent.textContent = "0%";
    widgetPercentBar.style.width = "0%";
    if (kelasSimpanChart) {
      kelasSimpanChart.destroy();
      kelasSimpanChart = null;
    }
    if (statusDonutChart) {
      statusDonutChart.destroy();
      statusDonutChart = null;
    }
    if (trendHarianChart) {
      trendHarianChart.destroy();
      trendHarianChart = null;
    }
    if (chartEmptyState) chartEmptyState.textContent = "Tiada data simpan untuk carta.";
    if (statusDonutEmptyState) statusDonutEmptyState.textContent = "Tiada data untuk carta donut.";
    if (trendHarianEmptyState) trendHarianEmptyState.textContent = "Tiada data trend untuk 7 hari terakhir.";
  }

  function nowText() {
    return new Date().toLocaleTimeString("ms-MY", {
      timeZone: "Asia/Kuala_Lumpur",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
  }

  function getKualaLumpurParts(dateObj) {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Kuala_Lumpur",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(dateObj);

    const map = {};
    parts.forEach(function(p) {
      if (p.type === "year" || p.type === "month" || p.type === "day") {
        map[p.type] = p.value;
      }
    });
    return map;
  }

  function getTodayFilterValue() {
    const p = getKualaLumpurParts(new Date());
    return `${p.year}-${p.month}-${p.day}`;
  }

  function ensureTarikhFilterDefault() {
    if (!filterTarikh) return;
    if (!filterTarikh.value) {
      filterTarikh.value = getTodayFilterValue();
    }
  }

  function updateTodayPill() {
    const dateStr = getTodayFilterValue();
    if (!todayPill) return;
    const now = new Date();
    const dateText = now.toLocaleDateString("ms-MY", {
      timeZone: "Asia/Kuala_Lumpur",
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric"
    });
    const timeText = now.toLocaleTimeString("ms-MY", {
      timeZone: "Asia/Kuala_Lumpur",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
    const valueEl = todayPill.querySelector(".today-value");
    if (valueEl) {
      valueEl.textContent = `${dateText} | ${timeText}`;
    }
  }

  function normalizeDateToInputFormat(value) {
    if (!value) return "";
    const text = String(value).trim();
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(text)) {
      const parts = text.split("/");
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(text)) {
      const parts = text.split("/");
      const day = String(parts[0]).padStart(2, "0");
      const month = String(parts[1]).padStart(2, "0");
      return `${parts[2]}-${month}-${day}`;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
      return text;
    }
    if (/^\d{4}-\d{2}-\d{2}T/.test(text)) {
      return text.slice(0, 10);
    }
    return "";
  }

  function to12HourFormat(value) {
    if (!value) return "-";
    const text = String(value).trim();
    if (/(AM|PM)/i.test(text)) return text.toUpperCase();
    const m = text.match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return text;
    let hour = parseInt(m[1], 10);
    const minute = m[2];
    const suffix = hour >= 12 ? "PM" : "AM";
    hour = hour % 12;
    if (hour === 0) hour = 12;
    return `${String(hour).padStart(2, "0")}:${minute} ${suffix}`;
  }

  function applyFilters(rows, tarikh, kelas) {
    return rows.filter(function(row) {
      const rowKelas = String(row[1] || "").trim();
      const rowTarikh = normalizeDateToInputFormat(row[2]);
      const passKelas = !kelas || rowKelas === kelas;
      const passTarikh = !tarikh || rowTarikh === tarikh;
      return passKelas && passTarikh;
    });
  }

  function populateKelasOptions(rows, selectedKelas) {
    const select = document.getElementById("filterKelas");
    const kelasSet = new Set();

    rows.forEach(function(row) {
      const value = String(row[1] || "").trim();
      if (value) kelasSet.add(value);
    });

    const kelasList = Array.from(kelasSet).sort(function(a, b) {
      return a.localeCompare(b, "ms");
    });

    select.innerHTML = '<option value="">Semua Kelas</option>';
    if (!kelasList.length) {
      const emptyOpt = document.createElement("option");
      emptyOpt.value = "";
      emptyOpt.textContent = "Tiada kelas ditemui";
      emptyOpt.disabled = true;
      select.appendChild(emptyOpt);
      select.value = "";
      return;
    }

    kelasList.forEach(function(k) {
      const opt = document.createElement("option");
      opt.value = k;
      opt.textContent = k;
      select.appendChild(opt);
    });

    if (selectedKelas && kelasSet.has(selectedKelas)) {
      select.value = selectedKelas;
    } else {
      select.value = "";
    }
  }

  function buildNamaByKelas(rows) {
    const map = new Map();
    rows.forEach(function(row) {
      const nama = String(row[0] || "").trim();
      const kelas = String(row[1] || "").trim();
      if (!nama || nama === "-") return;
      const effectiveKelas = (!kelas || kelas === "-") ? "Tidak Diketahui" : kelas;
      if (!map.has("Semua")) map.set("Semua", new Set());
      map.get("Semua").add(nama);
      if (!map.has(effectiveKelas)) map.set(effectiveKelas, new Set());
      map.get(effectiveKelas).add(nama);
    });
    return map;
  }

  function populateManualKelasOptions(map) {
    if (!manualKelas) return;
    const previous = manualKelas.value;
    const kelasList = Array.from(map.keys()).filter(function(k) { return k !== "Semua"; }).sort(function(a, b) {
      return a.localeCompare(b, "ms");
    });

    manualKelas.innerHTML = '<option value="">Pilih kelas</option>';
    kelasList.forEach(function(kelas) {
      const opt = document.createElement("option");
      opt.value = kelas;
      opt.textContent = kelas;
      manualKelas.appendChild(opt);
    });

    if (previous && map.has(previous)) {
      manualKelas.value = previous;
    } else {
      manualKelas.value = "";
    }
  }

  function populateManualNamaOptions(kelas) {
    if (!manualNama) return;
    const key = kelas && namaByKelasMap.has(kelas) ? kelas : "Semua";
    const baseNames = namaByKelasMap.has(key)
      ? Array.from(namaByKelasMap.get(key))
      : [];
    const selectedTarikh = (filterTarikh && filterTarikh.value) ? filterTarikh.value : getTodayFilterValue();
    const scannedSet = new Set();

    latestAllRows.forEach(function(row) {
      const rowNama = String(row[0] || "").trim();
      const rowKelas = String(row[1] || "").trim();
      const rowTarikh = normalizeDateToInputFormat(row[2]);
      if (!rowNama || rowNama === "-") return;
      if (kelas && rowKelas !== kelas) return;
      if (selectedTarikh && rowTarikh !== selectedTarikh) return;
      scannedSet.add(rowNama);
    });

    const names = baseNames
      .filter(function(nama) { return !scannedSet.has(nama); })
      .sort(function(a, b) { return a.localeCompare(b, "ms"); });

    manualNama.innerHTML = '<option value="">Pilih nama murid</option>';
    names.forEach(function(nama) {
      const opt = document.createElement("option");
      opt.value = nama;
      opt.textContent = nama;
      manualNama.appendChild(opt);
    });
    if (!names.length) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "Tiada nama ditemui";
      opt.disabled = true;
      manualNama.appendChild(opt);
    }
    manualNama.disabled = !names.length;
    manualNama.value = "";
  }

  function getObjectValueByAliases(item, aliases) {
    if (!item || typeof item !== "object") return "";
    const keys = Object.keys(item);
    for (let i = 0; i < aliases.length; i += 1) {
      const alias = aliases[i];
      if (Object.prototype.hasOwnProperty.call(item, alias)) return item[alias];
      const normalizedAlias = alias.toLowerCase().replace(/[\s_]/g, "");
      const foundKey = keys.find(function(k) {
        return k.toLowerCase().replace(/[\s_]/g, "") === normalizedAlias;
      });
      if (foundKey) return item[foundKey];
    }
    return "";
  }

  function getCurrentKualaLumpurDateTime() {
    const now = new Date();
    const dParts = getKualaLumpurParts(now);
    const tParts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Kuala_Lumpur",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).formatToParts(now);
    const timeMap = {};
    tParts.forEach(function(p) {
      if (p.type === "hour" || p.type === "minute") timeMap[p.type] = p.value;
    });
    return {
      tarikh: `${dParts.year}-${dParts.month}-${dParts.day}`,
      masaSimpan: `${timeMap.hour}:${timeMap.minute}`
    };
  }

  async function simpanManualGagalScan() {
    if (!manualKelas || !manualNama || !manualPassword || !manualStatus || !btnSimpanManual) return;

    const kelas = manualKelas.value.trim();
    const nama = manualNama.value.trim();
    const password = manualPassword.value;

    if (!kelas) {
      manualStatus.textContent = "Sila pilih kelas dahulu.";
      return;
    }
    if (!nama) {
      manualStatus.textContent = "Sila pilih nama murid dahulu.";
      return;
    }
    if (password !== GURU_PASSWORD) {
      manualStatus.textContent = "Password guru tidak tepat.";
      return;
    }

    const current = getCurrentKualaLumpurDateTime();
    const params = new URLSearchParams();
    params.append("action", "writeData");
    params.append("sheetId", SHEET_ID);
    params.append("sheetName", SHEET_NAME);
    params.append("nama", nama);
    params.append("kelas", kelas);
    params.append("tarikh", current.tarikh);
    params.append("masaSimpan", current.masaSimpan);
    params.append("masaAmbil", "");
    params.append("status", "DISIMPAN (MANUAL)");

    manualStatus.textContent = "Menyimpan rekod manual...";
    btnSimpanManual.disabled = true;

    try {
      const response = await fetch(SCRIPT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
          "Accept": "application/json"
        },
        body: params.toString()
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      let payload = null;
      try {
        payload = await response.json();
      } catch (e) {
        payload = null;
      }

      if (payload && payload.error) {
        throw new Error(payload.error);
      }

      manualPassword.value = "";
      manualStatus.textContent = `Rekod manual berjaya disimpan untuk ${nama} (${kelas}).`;
      await window.muatData({ silent: true });
    } catch (error) {
      manualStatus.textContent = `Gagal simpan rekod manual: ${error.message}`;
      console.error("Ralat simpan manual:", error);
    } finally {
      btnSimpanManual.disabled = false;
    }
  }

  window.muatData = async function(options) {
    const opts = options || {};
    const silent = !!opts.silent;

    ensureTarikhFilterDefault();
    const tarikh = filterTarikh ? filterTarikh.value : getTodayFilterValue();
    const kelas = $("#filterKelas").val();

    const params = new URLSearchParams();
    params.append("action", "readData");
    params.append("sheetId", SHEET_ID);
    params.append("sheetName", SHEET_NAME);

    const url = params.toString() ? `${SCRIPT_URL}?${params.toString()}` : SCRIPT_URL;

    setLoadingState(true);

    try {
      const response = await fetch(url, {
        headers: { "Accept": "application/json" }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        const textBody = await response.text();
        const hint = textBody.includes("<html") ? "URL memulangkan HTML, bukan JSON API." : "Respons bukan JSON.";
        throw new Error(hint);
      }

      const payload = await response.json();
      if (payload && payload.error) {
        throw new Error(payload.error);
      }

      const data = Array.isArray(payload) ? payload : (Array.isArray(payload.data) ? payload.data : []);
      const allRows = data.map(function(item) {
        const objNama = getObjectValueByAliases(item, ["nama", "namaMurid", "nama murid", "Nama Murid", "studentName"]);
        const objKelas = getObjectValueByAliases(item, ["kelas", "Kelas", "class"]);
        const objTarikh = getObjectValueByAliases(item, ["tarikh", "Tarikh", "date"]);
        const objMasaSimpan = getObjectValueByAliases(item, ["masaSimpan", "masa_simpan", "masa simpan", "Masa Simpan"]);
        const objMasaAmbil = getObjectValueByAliases(item, ["masaAmbil", "masa_ambil", "masa ambil", "Masa Ambil"]);
        const objStatus = getObjectValueByAliases(item, ["status", "Status"]);
        return [
          String(Array.isArray(item) ? (item[0] || "-") : (objNama || "-")).trim() || "-",
          String(Array.isArray(item) ? (item[1] || "-") : (objKelas || "-")).trim() || "-",
          String(Array.isArray(item) ? (item[2] || "-") : (objTarikh || "-")).trim() || "-",
          to12HourFormat(String(Array.isArray(item) ? (item[3] || "-") : (objMasaSimpan || "-")).trim() || "-"),
          to12HourFormat(String(Array.isArray(item) ? (item[4] || "-") : (objMasaAmbil || "-")).trim() || "-"),
          String(Array.isArray(item) ? (item[5] || "-") : (objStatus || "-")).trim() || "-"
        ];
      }).filter(function(r) {
        return r.some(function(cell) {
          const v = String(cell || "").trim();
          return v !== "" && v !== "-";
        });
      });
      latestAllRows = allRows;

      populateKelasOptions(allRows, kelas);
      namaByKelasMap = buildNamaByKelas(allRows);
      populateManualKelasOptions(namaByKelasMap);
      populateManualNamaOptions(manualKelas ? manualKelas.value : "");
      const effectiveTarikh = tarikh || "";
      const filteredRows = applyFilters(allRows, effectiveTarikh, kelas);
      const uniqueKelasCount = new Set(allRows.map(function(r) { return String(r[1] || "").trim(); }).filter(Boolean)).size;

      table.clear().rows.add(filteredRows).draw();
      updateWidgets(filteredRows);
      renderKelasSimpanChart(filteredRows);
      renderStatusDonutChart(filteredRows);
      renderTrendHarianChart(allRows, kelas);
      const tarikhText = effectiveTarikh ? ` untuk tarikh ${effectiveTarikh}` : "";
      statusLine.textContent = `Data berjaya dimuat${tarikhText}: ${filteredRows.length}/${allRows.length} rekod.`;
      refreshInfo.textContent = `Auto-refresh: setiap 10 saat. Kemaskini terakhir: ${nowText()}.`;
      debugLine.textContent = "";
      hasLoadedDataOnce = true;
    } catch (error) {
      statusLine.textContent = `Ralat: ${error.message}`;
      debugLine.textContent = "";
      if (!hasLoadedDataOnce) {
        resetWidgets();
      }
      if (!silent) {
        alert(`Gagal memuat data: ${error.message}`);
      }
      console.error("Ralat muatData:", error);
    } finally {
      setLoadingState(false);
    }
  };

  setInterval(function() {
    window.muatData({ silent: true });
  }, 10000);

  document.getElementById("filterKelas").addEventListener("change", function() {
    window.muatData({ silent: true });
  });

  if (filterTarikh) {
    filterTarikh.addEventListener("change", function() {
      window.muatData({ silent: true });
    });
  }

  function renderStatusDonutChart(rows) {
    if (typeof Chart === "undefined") {
      if (statusDonutEmptyState) statusDonutEmptyState.textContent = "Carta tidak tersedia.";
      return;
    }

    if (statusDonutChart) {
      statusDonutChart.destroy();
      statusDonutChart = null;
    }

    if (!rows.length) {
      if (statusDonutEmptyState) statusDonutEmptyState.textContent = "Tiada data untuk carta donut.";
      return;
    }

    const simpanCount = rows.filter(isSimpanRecord).length;
    const ambilCount = rows.filter(isAmbilRecord).length;
    const ctx = document.getElementById("statusDonutChart");
    if (statusDonutEmptyState) statusDonutEmptyState.textContent = "";
    statusDonutChart = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: ["Disimpan", "Diambil"],
        datasets: [{
          data: [simpanCount, ambilCount],
          backgroundColor: [
            "rgba(171, 122, 255, 0.82)",
            "rgba(109, 224, 178, 0.85)"
          ],
          borderColor: "rgba(16, 10, 32, 0.7)",
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom",
            labels: { color: "#e7ddff" }
          }
        }
      }
    });
  }

  function shiftDateString(dateStr, delta) {
    const m = String(dateStr || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return "";
    const base = new Date(Date.UTC(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10)));
    base.setUTCDate(base.getUTCDate() + delta);
    return base.toISOString().slice(0, 10);
  }

  function shortMsDateLabel(dateStr) {
    const m = String(dateStr || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return dateStr || "-";
    return `${m[3]}/${m[2]}`;
  }

  function renderTrendHarianChart(allRows, kelas) {
    if (typeof Chart === "undefined") {
      if (trendHarianEmptyState) trendHarianEmptyState.textContent = "Carta tidak tersedia.";
      return;
    }

    if (trendHarianChart) {
      trendHarianChart.destroy();
      trendHarianChart = null;
    }

    const rowsByKelas = (kelas || "")
      ? allRows.filter(function(row) { return String(row[1] || "").trim() === kelas; })
      : allRows;

    const countByDate = {};
    rowsByKelas.forEach(function(row) {
      const d = normalizeDateToInputFormat(row[2]);
      if (!d) return;
      countByDate[d] = (countByDate[d] || 0) + 1;
    });

    const today = getTodayFilterValue();
    const dates = [];
    for (let i = 6; i >= 0; i -= 1) {
      dates.push(shiftDateString(today, -i));
    }
    const labels = dates.map(shortMsDateLabel);
    const values = dates.map(function(d) { return countByDate[d] || 0; });

    if (!values.some(function(v) { return v > 0; })) {
      if (trendHarianEmptyState) trendHarianEmptyState.textContent = "Tiada data trend untuk 7 hari terakhir.";
      return;
    }

    const ctx = document.getElementById("trendHarianChart");
    if (trendHarianEmptyState) trendHarianEmptyState.textContent = "";
    trendHarianChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: labels,
        datasets: [{
          label: "Bil Rekod",
          data: values,
          fill: true,
          tension: 0.35,
          borderWidth: 2,
          pointRadius: 3,
          borderColor: "rgba(196, 161, 255, 1)",
          backgroundColor: "rgba(155, 107, 255, 0.22)",
          pointBackgroundColor: "rgba(255, 238, 175, 0.95)"
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: { color: "#e7ddff" }
          }
        },
        scales: {
          x: {
            ticks: { color: "#d5c6fb" },
            grid: { color: "rgba(174, 145, 240, 0.15)" }
          },
          y: {
            beginAtZero: true,
            ticks: { precision: 0, color: "#d5c6fb" },
            grid: { color: "rgba(174, 145, 240, 0.15)" }
          }
        }
      }
    });
  }

  if (manualKelas) {
    manualKelas.addEventListener("change", function() {
      populateManualNamaOptions(manualKelas.value);
    });
  }

  if (btnSimpanManual) {
    btnSimpanManual.addEventListener("click", simpanManualGagalScan);
  }

  if (toggleManualPanel && manualPanelBody) {
    toggleManualPanel.addEventListener("click", function() {
      const isHidden = manualPanelBody.classList.contains("d-none");
      if (isHidden) {
        manualPanelBody.classList.remove("d-none");
        toggleManualPanel.textContent = "Sembunyikan Menu Manual";
      } else {
        manualPanelBody.classList.add("d-none");
        toggleManualPanel.textContent = "Buka Menu Manual";
      }
    });
  }

  ensureTarikhFilterDefault();
  updateTodayPill();
  setInterval(updateTodayPill, 1000);
  window.muatData({ silent: true });
});
