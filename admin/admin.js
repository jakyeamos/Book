const elements = {
  authPanel: document.getElementById("auth-panel"),
  authStatus: document.getElementById("auth-status"),
  loginForm: document.getElementById("login-form"),
  loginEmail: document.getElementById("login-email"),
  loginPassword: document.getElementById("login-password"),
  workspace: document.getElementById("admin-workspace"),
  chapterCount: document.getElementById("chapter-count"),
  chapterList: document.getElementById("chapter-list"),
  editorTitle: document.getElementById("editor-title"),
  editorSubtitle: document.getElementById("editor-subtitle"),
  draftStatus: document.getElementById("draft-status"),
  titleInput: document.getElementById("chapter-title-input"),
  htmlInput: document.getElementById("chapter-html-input"),
  saveDraftButton: document.getElementById("save-draft-button"),
  previewChapterButton: document.getElementById("preview-chapter-button"),
  publishChapterButton: document.getElementById("publish-chapter-button"),
  previewStatus: document.getElementById("preview-status"),
  preview: document.getElementById("chapter-preview"),
  cueStatus: document.getElementById("cue-status"),
  cueJsonInput: document.getElementById("cue-json-input"),
  blockEditor: document.getElementById("block-editor"),
  audioUploadForm: document.getElementById("audio-upload-form"),
  audioTitleInput: document.getElementById("audio-title-input"),
  audioFileInput: document.getElementById("audio-file-input"),
  audioDurationInput: document.getElementById("audio-duration-input"),
  cueCreateForm: document.getElementById("cue-create-form"),
  cueAssetSelect: document.getElementById("cue-asset-select"),
  cueStartBlockInput: document.getElementById("cue-start-block-input"),
  cueEndBlockInput: document.getElementById("cue-end-block-input"),
  eventsList: document.getElementById("admin-events-list"),
  refreshEventsButton: document.getElementById("refresh-events-button"),
};

const state = {
  manifest: [],
  selectedChapter: null,
  sourceByChapter: new Map(),
  assets: [],
};

function setEditorEnabled(enabled) {
  [
    elements.titleInput,
    elements.htmlInput,
    elements.saveDraftButton,
    elements.previewChapterButton,
    elements.publishChapterButton,
    elements.cueJsonInput,
  ].forEach((element) => {
    element.disabled = !enabled;
  });
}

function parseChapterTitle(markup, fallback) {
  const doc = new DOMParser().parseFromString(markup, "text/html");
  const title = doc.querySelector(".chapter-title")?.textContent?.trim();
  return title ? title.replace(/\.$/, "") : fallback;
}

function updateTitleInMarkup(markup, title) {
  const doc = new DOMParser().parseFromString(markup, "text/html");
  const titleElement = doc.querySelector(".chapter-title");
  const chapterElement = doc.querySelector(".chapter");
  if (!titleElement || !chapterElement) {
    return markup;
  }

  titleElement.innerHTML = `<strong>${title.trim().toUpperCase()}.</strong>`;
  return chapterElement.outerHTML;
}

function updatePreview() {
  const selected = state.selectedChapter;
  if (!selected) {
    return;
  }

  const markup = updateTitleInMarkup(elements.htmlInput.value, elements.titleInput.value);
  elements.preview.innerHTML = markup;
  elements.previewStatus.textContent = "Live preview";
}

function renderBlockEditor(markup) {
  elements.blockEditor.innerHTML = "";
  const doc = new DOMParser().parseFromString(markup, "text/html");
  const blocks = Array.from(doc.querySelectorAll("h2, h3, p, blockquote"));
  blocks.forEach((block, index) => {
    const card = document.createElement("div");
    card.className = "block-card";
    const label = document.createElement("span");
    const blockId = block.getAttribute("data-block-id") || `block-${index + 1}`;
    label.textContent = `${block.tagName.toLowerCase()} · ${blockId}`;
    const textarea = document.createElement("textarea");
    textarea.value = block.textContent.trim();
    textarea.addEventListener("input", () => {
      block.textContent = textarea.value;
      elements.htmlInput.value = doc.body.innerHTML.trim();
      updatePreview();
    });
    card.append(label, textarea);
    elements.blockEditor.appendChild(card);
  });
}

function renderChapterList() {
  elements.chapterList.innerHTML = "";
  elements.chapterCount.textContent = `${state.manifest.length} chapters`;

  state.manifest.forEach((chapter) => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.chapterId = chapter.id;
    button.setAttribute("aria-current", state.selectedChapter?.id === chapter.id ? "true" : "false");
    button.innerHTML = `
      <span class="chapter-number">${chapter.number}</span>
      <span>${chapter.title}</span>
    `;
    button.addEventListener("click", () => {
      void selectChapter(chapter.id);
    });
    elements.chapterList.appendChild(button);
  });
}

async function loadAssets() {
  state.assets = await api("/api/admin/audio/assets");
  elements.cueAssetSelect.innerHTML = "";
  state.assets.forEach((asset) => {
    const option = document.createElement("option");
    option.value = asset.id;
    option.textContent = asset.title;
    elements.cueAssetSelect.appendChild(option);
  });
}

async function loadEvents() {
  const { events } = await api("/api/admin/analytics/events");
  elements.eventsList.innerHTML = "";
  events.forEach((event) => {
    const item = document.createElement("div");
    item.className = "admin-event";
    item.textContent = `${event.createdAt} · ${event.eventType}`;
    elements.eventsList.appendChild(item);
  });
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...(options.headers || {}),
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error || `Request failed: ${response.status}`);
  }

  return body;
}

async function selectChapter(chapterId) {
  const chapter = state.manifest.find((entry) => entry.id === chapterId || entry.slug === chapterId);
  if (!chapter) {
    return;
  }

  state.selectedChapter = chapter;
  renderChapterList();
  setEditorEnabled(false);
  elements.editorTitle.textContent = chapter.title;
  elements.editorSubtitle.textContent = `Loading ${chapter.slug || chapter.id}...`;
  elements.previewStatus.textContent = "Loading";
  elements.cueStatus.textContent = "Loading";

  try {
    const source = state.sourceByChapter.get(chapter.id) || await api(`/api/admin/chapters/${chapter.id}`);
    state.sourceByChapter.set(chapter.id, source);
    const cues = await api(`/api/admin/audio/cues?chapterId=${encodeURIComponent(chapter.id)}`);

    const title = source.title || parseChapterTitle(source.html, chapter.title);
    const markup = source.html;
    elements.titleInput.value = title;
    elements.htmlInput.value = markup;
    elements.cueJsonInput.value = JSON.stringify(cues, null, 2);
    renderBlockEditor(markup);
    elements.editorSubtitle.textContent = `${source.slug} · ${source.id}`;
    elements.draftStatus.textContent = `${source.status} · v${source.version}`;
    elements.cueStatus.textContent = `${cues.length} stored cues`;
    setEditorEnabled(true);
    updatePreview();
  } catch (error) {
    elements.editorSubtitle.textContent = error?.message || "Unable to load chapter.";
    elements.previewStatus.textContent = "Error";
    elements.preview.innerHTML = `<p>${error?.message || "Unable to load chapter."}</p>`;
  }
}

async function loadChapters() {
  state.manifest = await api("/api/admin/chapters");
  await loadAssets();
  await loadEvents();
  renderChapterList();
  if (state.manifest[0]) {
    await selectChapter(state.manifest[0].id);
  }
}

async function saveChapterDraft() {
  if (!state.selectedChapter) {
    return;
  }

  const markup = updateTitleInMarkup(elements.htmlInput.value, elements.titleInput.value);
  const chapter = await api(`/api/admin/chapters/${state.selectedChapter.id}`, {
    method: "PUT",
    body: JSON.stringify({
    title: elements.titleInput.value.trim(),
    markup,
      html: markup,
    }),
  });
  state.sourceByChapter.set(chapter.id, chapter);
  elements.htmlInput.value = chapter.html;
  elements.draftStatus.textContent = `${chapter.status} · v${chapter.version}`;
  updatePreview();
}

async function markPreview() {
  if (!state.selectedChapter) {
    return;
  }

  await saveChapterDraft();
  const chapter = await api(`/api/admin/chapters/${state.selectedChapter.id}/preview`, { method: "POST" });
  state.sourceByChapter.set(chapter.id, chapter);
  elements.draftStatus.textContent = `${chapter.status} · v${chapter.version}`;
}

async function publishChapter() {
  if (!state.selectedChapter) {
    return;
  }

  await saveChapterDraft();
  const chapter = await api(`/api/admin/chapters/${state.selectedChapter.id}/publish`, { method: "POST" });
  state.sourceByChapter.set(chapter.id, chapter);
  elements.draftStatus.textContent = `${chapter.status} · v${chapter.version}`;
  await loadChapters();
}

async function bootAdmin() {
  setEditorEnabled(false);
  try {
    await api("/api/auth/session");
    elements.authStatus.textContent = "Signed in";
    elements.loginForm.classList.add("hidden");
    elements.workspace.classList.remove("hidden");
    await loadChapters();
  } catch (_error) {
    elements.authStatus.textContent = "Sign in required";
    elements.workspace.classList.add("hidden");
  }
}

elements.loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  elements.authStatus.textContent = "Signing in...";
  try {
    await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: elements.loginEmail.value,
        password: elements.loginPassword.value,
      }),
    });
    await bootAdmin();
  } catch (error) {
    elements.authStatus.textContent = error?.message || "Login failed";
  }
});
elements.audioUploadForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const file = elements.audioFileInput.files?.[0];
  if (!file) {
    elements.cueStatus.textContent = "Choose an MP3 file first";
    return;
  }
  const contentBase64 = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  await api("/api/admin/audio/assets", {
    method: "POST",
    body: JSON.stringify({
      fileName: file.name,
      title: elements.audioTitleInput.value || file.name,
      type: "music",
      contentBase64,
      durationSeconds: Number(elements.audioDurationInput.value || 1),
    }),
  });
  elements.cueStatus.textContent = "Audio uploaded";
  await loadAssets();
  await loadEvents();
});
elements.cueCreateForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!state.selectedChapter) {
    return;
  }
  await api("/api/admin/audio/cues", {
    method: "POST",
    body: JSON.stringify({
      chapterId: state.selectedChapter.id,
      assetId: elements.cueAssetSelect.value,
      layer: "music",
      startBlockId: elements.cueStartBlockInput.value,
      endBlockId: elements.cueEndBlockInput.value,
    }),
  });
  elements.cueStatus.textContent = "Cue created";
  state.sourceByChapter.delete(state.selectedChapter.id);
  await selectChapter(state.selectedChapter.id);
  await loadEvents();
});
elements.refreshEventsButton.addEventListener("click", () => void loadEvents());
elements.titleInput.addEventListener("input", updatePreview);
elements.htmlInput.addEventListener("input", () => {
  updatePreview();
  renderBlockEditor(elements.htmlInput.value);
});
elements.saveDraftButton.addEventListener("click", () => void saveChapterDraft());
elements.previewChapterButton.addEventListener("click", () => void markPreview());
elements.publishChapterButton.addEventListener("click", () => void publishChapter());

bootAdmin().catch((error) => {
  elements.chapterCount.textContent = "Failed";
  elements.editorSubtitle.textContent = error?.message || "Admin failed to load.";
  elements.preview.innerHTML = `<p>${error?.message || "Admin failed to load."}</p>`;
});
