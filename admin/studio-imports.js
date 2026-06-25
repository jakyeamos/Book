import { api, fileToBase64 } from "./studio-utils.js";

export async function loadImports({ elements, state, loadChapters, loadEvents }) {
  const { drafts } = await api("/api/admin/import/drafts");
  state.drafts = drafts;
  elements.importDraftList.innerHTML = "";
  if (drafts.length === 0) {
    elements.importDraftList.innerHTML = '<p class="empty-state">No imports staged.</p>';
    return;
  }
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
      await loadImports({ elements, state, loadChapters, loadEvents });
    });
    const approveButton = document.createElement("button");
    approveButton.type = "button";
    approveButton.textContent = "Approve";
    approveButton.disabled = draft.status !== "staged" || draft.validationErrors.length > 0;
    approveButton.addEventListener("click", async () => {
      await api(`/api/admin/import/drafts/${encodeURIComponent(draft.id)}/approve`, { method: "POST" });
      await Promise.all([loadImports({ elements, state, loadChapters, loadEvents }), loadChapters(), loadEvents()]);
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
      await loadImports({ elements, state, loadChapters, loadEvents });
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

export function bindImportForm({ elements, state, loadImports: reloadImports }) {
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
    await reloadImports();
  });
}
