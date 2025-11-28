const targetRange = document.getElementById("target-range");
const targetInput = document.getElementById("target-input");
const dropzone = document.getElementById("dropzone");
const fileInput = document.getElementById("file-input");
const results = document.getElementById("results");

const syncTargetInputs = (value) => {
  const sanitized = Math.min(Math.max(Number(value) || 500, 50), 5000);
  targetRange.value = sanitized;
  targetInput.value = sanitized;
  return sanitized;
};

targetRange.addEventListener("input", (e) => syncTargetInputs(e.target.value));
targetInput.addEventListener("input", (e) => syncTargetInputs(e.target.value));

const formatKB = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;

const dataURLToBlob = (dataURL) => {
  const [header, data] = dataURL.split(",");
  const mimeMatch = header.match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : "image/webp";
  const binary = atob(data);
  const array = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    array[i] = binary.charCodeAt(i);
  }
  return new Blob([array], { type: mime });
};

const updateCard = (card, { status, attemptsText, blob, fileName }) => {
  const statusEl = card.querySelector(".status");
  const attemptsEl = card.querySelector(".attempts");
  const buttonsEl = card.querySelector(".action-buttons");
  const pulse = card.querySelector(".pulse-bar");

  if (!statusEl || !attemptsEl || !buttonsEl || !pulse) return;

  statusEl.className = `status ${status}`;
  statusEl.innerHTML =
    status === "running"
      ? `<span class="spinner"></span>Compressing`
      : status === "done"
      ? "Compression ready"
      : "Error";
  attemptsEl.textContent = attemptsText;
  pulse.style.display = status === "running" ? "block" : "none";

  if (blob && fileName) {
    const url = URL.createObjectURL(blob);
    buttonsEl.innerHTML = `
          <a class="button primary" href="${url}" download="${fileName}">Download WebP</a>
          <button class="button" type="button" data-action="reset">Clear</button>
        `;
  } else {
    buttonsEl.innerHTML = `<button class="button" type="button" data-action="reset">Cancel</button>`;
  }
};

const createFileCard = (fileName, targetBytes) => {
  const card = document.createElement("article");
  card.className = "file-card";
  card.innerHTML = `
        <div class="pulse-bar" aria-hidden="true"></div>
        <div class="file-info">
          <strong>${fileName}</strong>
          <div class="attempts">Preparing to compress at 97% quality to ${Math.round(
            targetBytes / 1024
          )} KB…</div>
        </div>
        <div class="actions">
          <span class="status running"><span class="spinner"></span>Compressing</span>
          <div class="action-buttons">
            <button class="button" type="button" data-action="reset">Cancel</button>
          </div>
        </div>
      `;
  results.prepend(card);
  return card;
};

const compressImage = (file) => {
  const targetKB = syncTargetInputs(targetInput.value);
  const targetBytes = targetKB * 1024;
  const card = createFileCard(file.name, targetBytes);

  const img = new Image();
  const reader = new FileReader();

  reader.onload = (event) => {
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);

  img.onload = async () => {
    let scale = 1;
    let attempt = 0;
    let lastSize = file.size;
    let blob = null;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    while (scale > 0.05) {
      attempt += 1;
      const width = Math.max(1, Math.floor(img.naturalWidth * scale));
      const height = Math.max(1, Math.floor(img.naturalHeight * scale));
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);

      const dataUrl = canvas.toDataURL("image/webp", 0.97);
      blob = dataURLToBlob(dataUrl);
      lastSize = blob.size;

      updateCard(card, {
        status: "running",
        attemptsText: `Attempt ${attempt}: ${width}×${height} • ${formatKB(lastSize)} (${Math.round(
          scale * 100
        )}% of original)`
      });

      if (lastSize <= targetBytes) {
        break;
      }
      scale *= 0.9;
      await new Promise((resolve) => setTimeout(resolve, 80));
    }

    if (blob) {
      if (lastSize > targetBytes) {
        updateCard(card, {
          status: "error",
          attemptsText: `Stopped after ${attempt} attempts. Closest size: ${formatKB(lastSize)}.`
        });
      } else {
        const cleanName = file.name.replace(/\.[^.]+$/, "");
        const outName = `${cleanName || "image"}-compressed.webp`;
        updateCard(card, {
          status: "done",
          attemptsText: `Finished in ${attempt} attempts. Final size: ${formatKB(lastSize)} (≤ ${targetKB} KB).`,
          blob,
          fileName: outName
        });
      }
    }
  };

  img.onerror = () => {
    updateCard(card, {
      status: "error",
      attemptsText: "Could not read this image. Please try another file."
    });
  };
};

const handleFiles = (fileList) => {
  const files = Array.from(fileList).filter((file) => file.type.startsWith("image/"));
  if (!files.length) return;
  files.forEach((file) => compressImage(file));
};

dropzone.addEventListener("dragover", (event) => {
  event.preventDefault();
  dropzone.classList.add("dragging");
});

dropzone.addEventListener("dragleave", () => dropzone.classList.remove("dragging"));

dropzone.addEventListener("drop", (event) => {
  event.preventDefault();
  dropzone.classList.remove("dragging");
  handleFiles(event.dataTransfer.files);
});

dropzone.addEventListener("click", () => fileInput.click());
dropzone.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    fileInput.click();
  }
});

fileInput.addEventListener("change", (event) => {
  handleFiles(event.target.files);
  fileInput.value = "";
});

results.addEventListener("click", (event) => {
  const action = event.target.getAttribute("data-action");
  if (action === "reset") {
    const card = event.target.closest(".file-card");
    card?.remove();
  }
});
