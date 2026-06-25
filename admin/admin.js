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
  slugInput: document.getElementById("chapter-slug-input"),
  orderInput: document.getElementById("chapter-order-input"),
  typeInput: document.getElementById("chapter-type-input"),
  visibilityInput: document.getElementById("chapter-visibility-input"),
  tocInput: document.getElementById("chapter-toc-input"),
  htmlInput: document.getElementById("chapter-html-input"),
  sourceSaveButton: document.getElementById("save-source-button"),
  saveDraftButton: document.getElementById("save-draft-button"),
  previewChapterButton: document.getElementById("preview-chapter-button"),
  publishChapterButton: document.getElementById("publish-chapter-button"),
  readinessList: document.getElementById("publish-readiness-list"),
  previewStatus: document.getElementById("preview-status"),
  preview: document.getElementById("chapter-preview"),
  blockEditor: document.getElementById("block-editor"),
  versionList: document.getElementById("version-list"),
  refreshVersionsButton: document.getElementById("refresh-versions-button"),
  importStatus: document.getElementById("import-status"),
  importForm: document.getElementById("import-form"),
  importFileInput: document.getElementById("import-file-input"),
  importTitleInput: document.getElementById("import-title-input"),
  importSlugInput: document.getElementById("import-slug-input"),
  importOrderInput: document.getElementById("import-order-input"),
  importDraftList: document.getElementById("import-draft-list"),
  refreshImportsButton: document.getElementById("refresh-imports-button"),
  cueStatus: document.getElementById("cue-status"),
  audioUploadForm: document.getElementById("audio-upload-form"),
  audioTitleInput: document.getElementById("audio-title-input"),
  audioTypeInput: document.getElementById("audio-type-input"),
  audioFileInput: document.getElementById("audio-file-input"),
  audioDurationInput: document.getElementById("audio-duration-input"),
  cueCreateForm: document.getElementById("cue-create-form"),
  cueAssetSelect: document.getElementById("cue-asset-select"),
  cueLayerSelect: document.getElementById("cue-layer-select"),
  cueStartBlockSelect: document.getElementById("cue-start-block-select"),
  cueEndBlockSelect: document.getElementById("cue-end-block-select"),
  cueList: document.getElementById("cue-list"),
  refreshAudioButton: document.getElementById("refresh-audio-button"),
  eventsList: document.getElementById("admin-events-list"),
  refreshEventsButton: document.getElementById("refresh-events-button"),
};

const state = {
  chapters: [],
  selectedChapter: null,
  blocks: [],
  drafts: [],
  versions: [],
  audioStudio: null,
  dirty: false,
};

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function blockText(block) {
  return (block.spans || []).map((span) => span.text || "").join("");
}

function cloneBlocks(blocks) {
  return blocks.map((block) => ({
    ...block,
    spans: (block.spans || []).map((span) => ({ ...span })),
  }));
}

function blockHtml(block) {
  if (block.type === "scene_break") {
    return "<hr>";
  }
  const text = escapeHtml(blockText(block));
  if (block.type === "heading") {
    const level = block.level === 3 ? 3 : 2;
    return `<h${level}>${text}</h${level}>`;
  }
  if (block.type === "blockquote") {
    return `<blockquote>${text}</blockquote>`;
  }
  return `<p>${text}</p>`;
}

function renderPreviewFromBlocks() {
  if (!state.selectedChapter) {
    elements.preview.innerHTML = "<p>Select a chapter.</p>";
    return;
  }
  const html = state.blocks.map(blockHtml).join("\n");
  elements.preview.innerHTML = `<article class="chapter">${html}</article>`;
  elements.previewStatus.textContent = state.dirty ? "Unsaved preview" : "Saved preview";
}

function setDirty(value) {
  state.dirty = value;
  if (!state.selectedChapter) {
    elements.draftStatus.textContent = "Idle";
    return;
  }
  elements.draftStatus.textContent = value
    ? "Unsaved"
    : `${state.selectedChapter.status} · v${state.selectedChapter.version}`;
  renderPublishReadiness();
}

function assertCanLeaveEditor() {
  return !state.dirty || window.confirm("Discard unsaved chapter edits?");
}

function setEditorEnabled(enabled) {
  [
    elements.titleInput,
    elements.slugInput,
    elements.orderInput,
    elements.typeInput,
    elements.visibilityInput,
    elements.tocInput,
    elements.htmlInput,
    elements.sourceSaveButton,
    elements.saveDraftButton,
    elements.previewChapterButton,
  ].forEach((element) => {
    element.disabled = !enabled;
  });
}

function selectOptions(select, options, selectedValue) {
  select.innerHTML = "";
  options.forEach((option) => {
    const item = document.createElement("option");
    item.value = option.value;
    item.textContent = option.label;
    item.selected = option.value === selectedValue;
    select.appendChild(item);
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

async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function renderChapterList() {
  elements.chapterList.innerHTML = "";
  elements.chapterCount.textContent = `${state.chapters.length} chapters`;
  state.chapters.forEach((chapter) => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.chapterId = chapter.id;
    button.setAttribute("aria-current", state.selectedChapter?.id === chapter.id ? "true" : "false");
    button.innerHTML = `
      <span class="chapter-number">${chapter.number}</span>
      <span class="chapter-list-title">${escapeHtml(chapter.title)}</span>
      <span class="chapter-list-status">${chapter.status}</span>
    `;
    button.addEventListener("click", () => {
      void selectChapter(chapter.id);
    });
    elements.chapterList.appendChild(button);
  });
}

function renderPublishReadiness() {
  const readiness = state.selectedChapter?.publishReadiness;
  elements.readinessList.innerHTML = "";
  const issues = readiness?.blockingIssues || [];
  const warnings = readiness?.warnings || [];
  const items = issues.length || warnings.length
    ? [
      ...issues.map((message) => ({ message, kind: "blocking" })),
      ...warnings.map((message) => ({ message, kind: "warning" })),
    ]
    : [{ message: "Ready", kind: "ready" }];
  items.forEach((item) => {
    const row = document.createElement("span");
    row.className = `readiness-item ${item.kind}`;
    row.textContent = item.message;
    elements.readinessList.appendChild(row);
  });
  elements.publishChapterButton.disabled = !state.selectedChapter || state.dirty || !readiness?.canPublish;
}

function serializeBlocks() {
  return {
    schemaVersion: state.selectedChapter?.normalizedDocument?.schemaVersion || 1,
    blocks: state.blocks.map((block, index) => {
      const id = block.id || `blk_${state.selectedChapter.id}_${index + 1}`;
      if (block.type === "scene_break") {
        return { id, type: "scene_break", spans: [] };
      }
      const span = block.spans?.[0];
      return {
        id,
        type: block.type,
        level: block.type === "heading" ? Number(block.level || 2) : undefined,
        spans: [{
          id: span?.id || `${id}_spn_1`,
          text: blockText(block),
          marks: span?.marks,
        }],
      };
    }),
  };
}

function renderBlockEditor() {
  elements.blockEditor.innerHTML = "";
  if (!state.selectedChapter) {
    return;
  }
  state.blocks.forEach((block, index) => {
    const card = document.createElement("article");
    card.className = "block-card";

    const typeSelect = document.createElement("select");
    selectOptions(typeSelect, [
      { value: "heading", label: "Heading" },
      { value: "paragraph", label: "Paragraph" },
      { value: "blockquote", label: "Quote" },
      { value: "scene_break", label: "Break" },
    ], block.type);
    typeSelect.addEventListener("change", () => {
      state.blocks[index].type = typeSelect.value;
      if (typeSelect.value === "heading" && !state.blocks[index].level) {
        state.blocks[index].level = 2;
      }
      setDirty(true);
      renderBlockEditor();
      renderPreviewFromBlocks();
    });

    const label = document.createElement("span");
    label.className = "block-id";
    label.textContent = block.id || `Block ${index + 1}`;

    const textarea = document.createElement("textarea");
    textarea.value = blockText(block);
    textarea.disabled = block.type === "scene_break";
    textarea.addEventListener("input", () => {
      const current = state.blocks[index];
      const span = current.spans?.[0] || { id: `${current.id}_spn_1`, text: "" };
      current.spans = [{ ...span, text: textarea.value }];
      setDirty(true);
      renderPreviewFromBlocks();
    });

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.textContent = "Remove";
    removeButton.addEventListener("click", () => {
      state.blocks.splice(index, 1);
      setDirty(true);
      renderBlockEditor();
      renderPreviewFromBlocks();
    });

    card.append(typeSelect, label, textarea, removeButton);
    elements.blockEditor.appendChild(card);
  });

  const addRow = document.createElement("div");
  addRow.className = "block-add-row";
  ["paragraph", "heading", "blockquote", "scene_break"].forEach((type) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = `Add ${type.replace("_", " ")}`;
    button.addEventListener("click", () => {
      const id = `blk_${state.selectedChapter.id}_${Date.now()}`;
      state.blocks.push({
        id,
        type,
        level: type === "heading" ? 2 : undefined,
        spans: type === "scene_break" ? [] : [{ id: `${id}_spn_1`, text: "" }],
      });
      setDirty(true);
      renderBlockEditor();
      renderPreviewFromBlocks();
    });
    addRow.appendChild(button);
  });
  elements.blockEditor.appendChild(addRow);
}

function applyChapterToEditor(chapter) {
  state.selectedChapter = chapter;
  state.blocks = cloneBlocks(chapter.normalizedDocument?.blocks || []);
  elements.editorTitle.textContent = chapter.title;
  elements.editorSubtitle.textContent = `${chapter.slug} · ${chapter.id}`;
  elements.titleInput.value = chapter.title;
  elements.slugInput.value = chapter.slug;
  elements.orderInput.value = String(chapter.number);
  elements.typeInput.value = chapter.type || "standard";
  elements.visibilityInput.value = chapter.visibility?.mode || "public";
  elements.tocInput.checked = chapter.visibility?.includeInToc !== false;
  elements.htmlInput.value = chapter.html || "";
  setEditorEnabled(true);
  setDirty(false);
  renderBlockEditor();
  renderPreviewFromBlocks();
}

async function loadChapters() {
  state.chapters = await api("/api/admin/chapters");
  renderChapterList();
  if (!state.selectedChapter && state.chapters[0]) {
    await selectChapter(state.chapters[0].id);
  }
}

async function selectChapter(chapterId) {
  if (!assertCanLeaveEditor()) {
    return;
  }
  setEditorEnabled(false);
  elements.editorSubtitle.textContent = "Loading...";
  const chapter = await api(`/api/admin/chapters/${encodeURIComponent(chapterId)}`);
  applyChapterToEditor(chapter);
  renderChapterList();
  await Promise.all([loadVersions(), loadAudioStudio(), loadEvents()]);
}

async function saveChapterDraft() {
  if (!state.selectedChapter) {
    return;
  }
  const chapter = await api(`/api/admin/chapters/${encodeURIComponent(state.selectedChapter.id)}`, {
    method: "PUT",
    body: JSON.stringify({
      title: elements.titleInput.value.trim(),
      slug: elements.slugInput.value.trim(),
      orderIndex: Number(elements.orderInput.value || state.selectedChapter.number),
      type: elements.typeInput.value,
      visibility: {
        mode: elements.visibilityInput.value,
        includeInToc: elements.tocInput.checked,
      },
      normalizedDocument: serializeBlocks(),
    }),
  });
  const index = state.chapters.findIndex((item) => item.id === chapter.id);
  if (index >= 0) {
    state.chapters[index] = chapter;
  }
  applyChapterToEditor(chapter);
  renderChapterList();
  await Promise.all([loadVersions(), loadAudioStudio(), loadEvents()]);
}

async function saveSource() {
  if (!state.selectedChapter) {
    return;
  }
  const chapter = await api(`/api/admin/chapters/${encodeURIComponent(state.selectedChapter.id)}`, {
    method: "PUT",
    body: JSON.stringify({
      title: elements.titleInput.value.trim(),
      html: elements.htmlInput.value,
    }),
  });
  applyChapterToEditor(chapter);
  renderChapterList();
  await Promise.all([loadVersions(), loadAudioStudio(), loadEvents()]);
}

async function markPreview() {
  await saveChapterDraft();
  if (!state.selectedChapter) {
    return;
  }
  const chapter = await api(`/api/admin/chapters/${encodeURIComponent(state.selectedChapter.id)}/preview`, { method: "POST" });
  applyChapterToEditor(chapter);
}

async function publishChapter() {
  if (!state.selectedChapter || state.dirty) {
    return;
  }
  const chapter = await api(`/api/admin/chapters/${encodeURIComponent(state.selectedChapter.id)}/publish`, { method: "POST" });
  applyChapterToEditor(chapter);
  await Promise.all([loadChapters(), loadVersions(), loadEvents()]);
}

async function loadVersions() {
  if (!state.selectedChapter) {
    elements.versionList.innerHTML = "";
    return;
  }
  const { versions } = await api(`/api/admin/chapters/${encodeURIComponent(state.selectedChapter.id)}/versions`);
  state.versions = versions;
  elements.versionList.innerHTML = "";
  versions.slice().reverse().forEach((version) => {
    const row = document.createElement("div");
    row.className = "version-row";
    const label = document.createElement("span");
    label.textContent = `${version.id} · ${version.status}`;
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "Rollback";
    button.disabled = !version.rollbackEligible;
    button.addEventListener("click", async () => {
      if (!state.selectedChapter || !window.confirm(`Rollback to ${version.id}?`)) {
        return;
      }
      const chapter = await api(`/api/admin/chapters/${encodeURIComponent(state.selectedChapter.id)}/rollback`, {
        method: "POST",
        body: JSON.stringify({ versionId: version.id }),
      });
      applyChapterToEditor(chapter);
      await Promise.all([loadVersions(), loadEvents()]);
    });
    row.append(label, button);
    elements.versionList.appendChild(row);
  });
}

async function loadImports() {
  const { drafts } = await api("/api/admin/import/drafts");
  state.drafts = drafts;
  elements.importDraftList.innerHTML = "";
  drafts.forEach((draft) => {
    const card = document.createElement("article");
    card.className = `draft-card ${draft.status}`;
    const title = document.createElement("input");
    title.value = draft.metadata.title;
    const slug = document.createElement("input");
    slug.value = draft.metadata.slug;
    const order = document.createElement("input");
    order.type = "number";
    order.value = String(draft.metadata.orderIndex);
    const status = document.createElement("span");
    status.className = "status-pill";
    status.textContent = draft.status;
    const saveButton = document.createElement("button");
    saveButton.type = "button";
    saveButton.textContent = "Save";
    saveButton.disabled = draft.status !== "staged";
    saveButton.addEventListener("click", async () => {
      await api(`/api/admin/import/drafts/${encodeURIComponent(draft.id)}/metadata`, {
        method: "PUT",
        body: JSON.stringify({
          title: title.value,
          slug: slug.value,
          orderIndex: Number(order.value || 0),
        }),
      });
      await loadImports();
    });
    const approveButton = document.createElement("button");
    approveButton.type = "button";
    approveButton.textContent = "Approve";
    approveButton.disabled = draft.status !== "staged" || draft.validationErrors.length > 0;
    approveButton.addEventListener("click", async () => {
      await api(`/api/admin/import/drafts/${encodeURIComponent(draft.id)}/approve`, { method: "POST" });
      await Promise.all([loadImports(), loadChapters(), loadEvents()]);
    });
    const rejectButton = document.createElement("button");
    rejectButton.type = "button";
    rejectButton.textContent = "Reject";
    rejectButton.disabled = draft.status !== "staged";
    rejectButton.addEventListener("click", async () => {
      await api(`/api/admin/import/drafts/${encodeURIComponent(draft.id)}/reject`, {
        method: "POST",
        body: JSON.stringify({ reason: "Rejected from Author Studio" }),
      });
      await loadImports();
    });
    card.append(status, title, slug, order, saveButton, approveButton, rejectButton);
    if (draft.validationErrors.length > 0) {
      const errors = document.createElement("p");
      errors.className = "validation-errors";
      errors.textContent = draft.validationErrors.join(" · ");
      card.appendChild(errors);
    }
    elements.importDraftList.appendChild(card);
  });
}

async function loadAudioStudio() {
  if (!state.selectedChapter) {
    return;
  }
  state.audioStudio = await api(`/api/admin/audio/studio?chapterId=${encodeURIComponent(state.selectedChapter.id)}`);
  elements.cueStatus.textContent = `${state.audioStudio.cues.length} cues`;
  selectOptions(elements.cueAssetSelect, state.audioStudio.assets.map((asset) => ({ value: asset.id, label: asset.title })), state.audioStudio.assets[0]?.id);
  const blockOptions = state.audioStudio.blocks.map((block) => ({ value: block.id, label: block.label }));
  selectOptions(elements.cueStartBlockSelect, blockOptions, blockOptions[0]?.value);
  selectOptions(elements.cueEndBlockSelect, blockOptions, blockOptions[0]?.value);
  renderCueList();
}

function renderCueList() {
  elements.cueList.innerHTML = "";
  const studio = state.audioStudio;
  if (!studio) {
    return;
  }
  const assetOptions = studio.assets.map((asset) => ({ value: asset.id, label: asset.title }));
  const blockOptions = studio.blocks.map((block) => ({ value: block.id, label: block.label }));
  studio.cues.forEach((cue) => {
    const card = document.createElement("article");
    card.className = `cue-card ${cue.status}`;
    const status = document.createElement("span");
    status.className = "status-pill";
    status.textContent = `${cue.layer} · ${cue.status}`;
    const asset = document.createElement("select");
    selectOptions(asset, assetOptions, cue.assetId);
    const layer = document.createElement("select");
    selectOptions(layer, [
      { value: "music", label: "Music" },
      { value: "ambient", label: "Ambient" },
    ], cue.layer);
    const start = document.createElement("select");
    selectOptions(start, blockOptions, cue.startBlockId);
    const end = document.createElement("select");
    selectOptions(end, blockOptions, cue.endBlockId);
    const volume = document.createElement("input");
    volume.type = "number";
    volume.min = "0";
    volume.max = "1";
    volume.step = "0.01";
    volume.value = String(cue.volume);
    const updateButton = document.createElement("button");
    updateButton.type = "button";
    updateButton.textContent = "Update";
    updateButton.addEventListener("click", async () => {
      await api(`/api/admin/audio/cues/${encodeURIComponent(cue.id)}`, {
        method: "PUT",
        body: JSON.stringify({
          assetId: asset.value,
          layer: layer.value,
          startBlockId: start.value,
          endBlockId: end.value,
          volume: Number(volume.value),
        }),
      });
      await Promise.all([loadAudioStudio(), reloadSelectedChapter(), loadEvents()]);
    });
    const repairButton = document.createElement("button");
    repairButton.type = "button";
    repairButton.textContent = "Repair";
    repairButton.disabled = cue.status !== "broken";
    repairButton.addEventListener("click", async () => {
      await api(`/api/admin/audio/cues/${encodeURIComponent(cue.id)}/repair`, { method: "POST" });
      await Promise.all([loadAudioStudio(), reloadSelectedChapter(), loadEvents()]);
    });
    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", async () => {
      await fetch(`/api/admin/audio/cues/${encodeURIComponent(cue.id)}`, { method: "DELETE" });
      await Promise.all([loadAudioStudio(), reloadSelectedChapter(), loadEvents()]);
    });
    card.append(status, asset, layer, start, end, volume, updateButton, repairButton, deleteButton);
    if (cue.validationIssues.length > 0) {
      const issue = document.createElement("p");
      issue.className = "validation-errors";
      issue.textContent = cue.validationIssues.join(" · ");
      card.appendChild(issue);
    }
    elements.cueList.appendChild(card);
  });
}

async function reloadSelectedChapter() {
  if (!state.selectedChapter) {
    return;
  }
  const chapter = await api(`/api/admin/chapters/${encodeURIComponent(state.selectedChapter.id)}`);
  applyChapterToEditor(chapter);
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

async function bootAdmin() {
  setEditorEnabled(false);
  try {
    await api("/api/auth/session");
    elements.authStatus.textContent = "Signed in";
    elements.authPanel.classList.add("hidden");
    elements.workspace.classList.remove("hidden");
    await Promise.all([loadChapters(), loadImports(), loadEvents()]);
  } catch (_error) {
    elements.authStatus.textContent = "Sign in required";
    elements.workspace.classList.add("hidden");
    elements.authPanel.classList.remove("hidden");
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

[
  elements.titleInput,
  elements.slugInput,
  elements.orderInput,
  elements.typeInput,
  elements.visibilityInput,
  elements.tocInput,
].forEach((element) => {
  element.addEventListener("input", () => setDirty(true));
  element.addEventListener("change", () => setDirty(true));
});
elements.htmlInput.addEventListener("input", () => setDirty(true));
elements.saveDraftButton.addEventListener("click", () => void saveChapterDraft());
elements.sourceSaveButton.addEventListener("click", () => void saveSource());
elements.previewChapterButton.addEventListener("click", () => void markPreview());
elements.publishChapterButton.addEventListener("click", () => void publishChapter());
elements.refreshVersionsButton.addEventListener("click", () => void loadVersions());
elements.refreshImportsButton.addEventListener("click", () => void loadImports());
elements.refreshAudioButton.addEventListener("click", () => void loadAudioStudio());
elements.refreshEventsButton.addEventListener("click", () => void loadEvents());

elements.importForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const file = elements.importFileInput.files?.[0];
  if (!file) {
    elements.importStatus.textContent = "Choose a DOCX";
    return;
  }
  elements.importStatus.textContent = "Importing...";
  await api("/api/admin/import/docx", {
    method: "POST",
    body: JSON.stringify({
      fileName: file.name,
      contentBase64: await fileToBase64(file),
      metadata: {
        title: elements.importTitleInput.value || undefined,
        slug: elements.importSlugInput.value || undefined,
        orderIndex: Number(elements.importOrderInput.value || state.chapters.length + 1),
      },
    }),
  });
  elements.importStatus.textContent = "Imported";
  elements.importForm.reset();
  await loadImports();
});

elements.audioUploadForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const file = elements.audioFileInput.files?.[0];
  if (!file) {
    elements.cueStatus.textContent = "Choose an MP3";
    return;
  }
  await api("/api/admin/audio/assets", {
    method: "POST",
    body: JSON.stringify({
      fileName: file.name,
      title: elements.audioTitleInput.value || file.name,
      type: elements.audioTypeInput.value,
      contentBase64: await fileToBase64(file),
      durationSeconds: Number(elements.audioDurationInput.value || 1),
    }),
  });
  elements.audioUploadForm.reset();
  await Promise.all([loadAudioStudio(), loadEvents()]);
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
      layer: elements.cueLayerSelect.value,
      startBlockId: elements.cueStartBlockSelect.value,
      endBlockId: elements.cueEndBlockSelect.value,
    }),
  });
  await Promise.all([loadAudioStudio(), reloadSelectedChapter(), loadEvents()]);
});

window.addEventListener("beforeunload", (event) => {
  if (!state.dirty) {
    return;
  }
  event.preventDefault();
  event.returnValue = "";
});

bootAdmin().catch((error) => {
  elements.authStatus.textContent = error?.message || "Admin failed to load";
});
