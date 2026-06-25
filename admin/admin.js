import { api, cloneBlocks, escapeHtml } from "./studio-utils.js";
import {
  renderBlockEditor as renderBlockEditorView,
  renderChapterValidation,
  renderPreviewFromBlocks as renderPreviewFromBlocksView,
  serializeBlocks as serializeBlocksView,
} from "./studio-blocks.js";
import { bindImportForm, loadImports as loadImportsView } from "./studio-imports.js";
import {
  bindAudioForms,
  loadAudioStudio as loadAudioStudioView,
  renderCueList as renderCueListView,
} from "./studio-audio.js";
import { bindPublishDialog, openPublishDialog } from "./studio-publish.js";

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
  saveStatus: document.getElementById("save-status"),
  titleInput: document.getElementById("chapter-title-input"),
  slugInput: document.getElementById("chapter-slug-input"),
  orderInput: document.getElementById("chapter-order-input"),
  typeInput: document.getElementById("chapter-type-input"),
  visibilityInput: document.getElementById("chapter-visibility-input"),
  tocInput: document.getElementById("chapter-toc-input"),
  themeAccentInput: document.getElementById("chapter-theme-accent-input"),
  themeBackgroundInput: document.getElementById("chapter-theme-background-input"),
  htmlInput: document.getElementById("chapter-html-input"),
  sourceSaveButton: document.getElementById("save-source-button"),
  saveDraftButton: document.getElementById("save-draft-button"),
  previewChapterButton: document.getElementById("preview-chapter-button"),
  publishChapterButton: document.getElementById("publish-chapter-button"),
  publishDialog: document.getElementById("publish-dialog"),
  publishDialogStatus: document.getElementById("publish-dialog-status"),
  publishSummaryList: document.getElementById("publish-summary-list"),
  publishVisibilityInput: document.getElementById("publish-visibility-input"),
  publishCancelButton: document.getElementById("publish-cancel-button"),
  publishConfirmButton: document.getElementById("publish-confirm-button"),
  readinessList: document.getElementById("publish-readiness-list"),
  validationList: document.getElementById("chapter-validation-list"),
  previewModeInput: document.getElementById("preview-mode-input"),
  previewRuntime: document.getElementById("preview-runtime"),
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
  readinessStatus: document.getElementById("deploy-readiness-status"),
  readinessList: document.getElementById("deploy-readiness-list"),
  refreshReadinessButton: document.getElementById("refresh-readiness-button"),
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

function renderPreviewFromBlocks() {
  renderPreviewFromBlocksView({ elements, state });
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
  elements.saveStatus.textContent = value ? "Unsaved changes" : "Saved";
  renderChapterValidation({ elements, state });
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
    elements.themeAccentInput,
    elements.themeBackgroundInput,
    elements.htmlInput,
    elements.sourceSaveButton,
    elements.saveDraftButton,
    elements.previewChapterButton,
  ].forEach((element) => {
    element.disabled = !enabled;
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
  return serializeBlocksView({ state });
}

function renderBlockEditor() {
  renderBlockEditorView({ elements, state, setDirty, renderPreview: renderPreviewFromBlocks });
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
  elements.themeAccentInput.value = chapter.theme?.accentColor || "";
  elements.themeBackgroundInput.value = chapter.theme?.backgroundTint || "";
  elements.htmlInput.value = chapter.html || "";
  elements.saveStatus.textContent = "Saved";
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
  elements.saveStatus.textContent = "Saving...";
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
      theme: {
        accentColor: elements.themeAccentInput.value.trim() || undefined,
        backgroundTint: elements.themeBackgroundInput.value.trim() || undefined,
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
  elements.saveStatus.textContent = "Saved";
  await Promise.all([loadVersions(), loadAudioStudio(), loadEvents()]);
}

async function saveSource() {
  if (!state.selectedChapter) {
    return;
  }
  elements.saveStatus.textContent = "Saving source...";
  const chapter = await api(`/api/admin/chapters/${encodeURIComponent(state.selectedChapter.id)}`, {
    method: "PUT",
    body: JSON.stringify({
      title: elements.titleInput.value.trim(),
      html: elements.htmlInput.value,
    }),
  });
  applyChapterToEditor(chapter);
  renderChapterList();
  elements.saveStatus.textContent = "Saved";
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

async function updateVisibilityForPublish(mode) {
  if (!state.selectedChapter || mode === state.selectedChapter.visibility?.mode) {
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
        mode,
        includeInToc: elements.tocInput.checked,
      },
      theme: {
        accentColor: elements.themeAccentInput.value.trim() || undefined,
        backgroundTint: elements.themeBackgroundInput.value.trim() || undefined,
      },
      normalizedDocument: serializeBlocks(),
    }),
  });
  const index = state.chapters.findIndex((item) => item.id === chapter.id);
  if (index >= 0) {
    state.chapters[index] = chapter;
  }
  applyChapterToEditor(chapter);
}

async function publishChapter(mode = state.selectedChapter?.visibility?.mode) {
  if (!state.selectedChapter || state.dirty) {
    return;
  }
  await updateVisibilityForPublish(mode);
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
  if (versions.length === 0) {
    elements.versionList.innerHTML = '<p class="empty-state">No versions yet.</p>';
    return;
  }
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
  await loadImportsView({ elements, state, loadChapters, loadEvents });
}

async function loadAudioStudio() {
  await loadAudioStudioView({ elements, state, renderCueList });
}

function renderCueList() {
  renderCueListView({ elements, state, loadAudioStudio, reloadSelectedChapter, loadEvents });
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

async function loadDeployReadiness() {
  const readiness = await api("/api/deploy/readiness");
  elements.readinessStatus.textContent = readiness.ok
    ? `Ready · ${readiness.mode}`
    : `Blocked · ${readiness.mode}`;
  elements.readinessList.innerHTML = "";
  Object.entries(readiness.checks || {}).forEach(([key, value]) => {
    const row = document.createElement("div");
    row.className = "readiness-row";
    const label = document.createElement("span");
    label.textContent = key;
    const status = document.createElement("span");
    status.className = `status-pill ${value ? "ready" : "blocking"}`;
    status.textContent = value ? "pass" : "fail";
    row.append(label, status);
    elements.readinessList.appendChild(row);
  });
}

async function bootAdmin() {
  setEditorEnabled(false);
  try {
    await api("/api/auth/session");
    elements.authStatus.textContent = "Signed in";
    elements.authPanel.classList.add("hidden");
    elements.workspace.classList.remove("hidden");
    await Promise.all([loadChapters(), loadImports(), loadEvents(), loadDeployReadiness()]);
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
  elements.themeAccentInput,
  elements.themeBackgroundInput,
].forEach((element) => {
  element.addEventListener("input", () => setDirty(true));
  element.addEventListener("change", () => setDirty(true));
});
elements.htmlInput.addEventListener("input", () => setDirty(true));
elements.previewModeInput.addEventListener("change", renderPreviewFromBlocks);
elements.saveDraftButton.addEventListener("click", () => void saveChapterDraft());
elements.sourceSaveButton.addEventListener("click", () => void saveSource());
elements.previewChapterButton.addEventListener("click", () => void markPreview());
elements.publishChapterButton.addEventListener("click", () => openPublishDialog({ elements, state }));
elements.refreshVersionsButton.addEventListener("click", () => void loadVersions());
elements.refreshImportsButton.addEventListener("click", () => void loadImports());
elements.refreshAudioButton.addEventListener("click", () => void loadAudioStudio());
elements.refreshReadinessButton.addEventListener("click", () => void loadDeployReadiness());
elements.refreshEventsButton.addEventListener("click", () => void loadEvents());

bindImportForm({ elements, state, loadImports });
bindAudioForms({ elements, state, loadAudioStudio, reloadSelectedChapter, loadEvents });
bindPublishDialog({ elements, state, onConfirm: publishChapter });

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
