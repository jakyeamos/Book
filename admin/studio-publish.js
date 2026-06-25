function setText(parent, label, value) {
  const row = document.createElement("li");
  const name = document.createElement("strong");
  name.textContent = label;
  const detail = document.createElement("span");
  detail.textContent = value;
  row.append(name, detail);
  parent.appendChild(row);
}

function renderSummary({ elements, state }) {
  const chapter = state.selectedChapter;
  elements.publishSummaryList.innerHTML = "";
  if (!chapter) {
    return;
  }
  const readiness = chapter.publishReadiness;
  setText(elements.publishSummaryList, "Title", chapter.title || "Missing title");
  setText(elements.publishSummaryList, "Slug", chapter.slug || "Missing slug");
  setText(elements.publishSummaryList, "Visibility", chapter.visibility?.mode || "public");
  setText(elements.publishSummaryList, "Last saved", state.dirty ? "Unsaved changes" : `${chapter.status} v${chapter.version}`);
  setText(elements.publishSummaryList, "Cues", readiness?.blockingIssues?.length ? `${readiness.blockingIssues.length} blocking issue(s)` : "No blocking issues");
  elements.publishVisibilityInput.value = chapter.visibility?.mode || "public";
  elements.publishDialogStatus.textContent = readiness?.canPublish
    ? "Confirm Publish when this is the version readers should see."
    : "Resolve blocking issues before publishing.";
  elements.publishConfirmButton.disabled = !readiness?.canPublish || state.dirty;
}

export function openPublishDialog({ elements, state }) {
  renderSummary({ elements, state });
  if (typeof elements.publishDialog.showModal === "function") {
    elements.publishDialog.showModal();
    return;
  }
  elements.publishDialog.classList.remove("hidden");
}

export function closePublishDialog(elements) {
  if (typeof elements.publishDialog.close === "function") {
    elements.publishDialog.close();
    return;
  }
  elements.publishDialog.classList.add("hidden");
}

export function bindPublishDialog({ elements, state, onConfirm }) {
  elements.publishCancelButton.addEventListener("click", () => closePublishDialog(elements));
  elements.publishConfirmButton.textContent = "Confirm Publish";
  elements.publishConfirmButton.addEventListener("click", async () => {
    elements.publishDialogStatus.textContent = "Publishing...";
    elements.publishConfirmButton.disabled = true;
    try {
      await onConfirm(elements.publishVisibilityInput.value);
      closePublishDialog(elements);
    } catch (error) {
      elements.publishDialogStatus.textContent = error?.message || "Publish failed";
      renderSummary({ elements, state });
    }
  });
}
