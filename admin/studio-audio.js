import { api, fileToBase64, selectOptions } from "./studio-utils.js";

export async function loadAudioStudio({ elements, state, renderCueList }) {
  if (!state.selectedChapter) {
    return;
  }
  state.audioStudio = await api(`/api/admin/audio/studio?chapterId=${encodeURIComponent(state.selectedChapter.id)}`);
  elements.cueStatus.textContent = `${state.audioStudio.cues.length} cues`;
  selectOptions(
    elements.cueAssetSelect,
    state.audioStudio.assets.map((asset) => ({ value: asset.id, label: asset.title })),
    state.audioStudio.assets[0]?.id,
  );
  const blockOptions = state.audioStudio.blocks.map((block) => ({ value: block.id, label: block.label }));
  selectOptions(elements.cueStartBlockSelect, blockOptions, blockOptions[0]?.value);
  selectOptions(elements.cueEndBlockSelect, blockOptions, blockOptions[0]?.value);
  renderCueList();
}

export function renderCueList({ elements, state, loadAudioStudio: reloadAudioStudio, reloadSelectedChapter, loadEvents }) {
  elements.cueList.innerHTML = "";
  const studio = state.audioStudio;
  if (!studio) {
    return;
  }
  if (studio.cues.length === 0) {
    elements.cueList.innerHTML = '<p class="empty-state">No cues for this chapter.</p>';
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
      await Promise.all([reloadAudioStudio(), reloadSelectedChapter(), loadEvents()]);
    });
    const repairButton = document.createElement("button");
    repairButton.type = "button";
    repairButton.textContent = "Repair";
    repairButton.disabled = cue.status !== "broken";
    repairButton.addEventListener("click", async () => {
      await api(`/api/admin/audio/cues/${encodeURIComponent(cue.id)}/repair`, { method: "POST" });
      await Promise.all([reloadAudioStudio(), reloadSelectedChapter(), loadEvents()]);
    });
    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", async () => {
      await api(`/api/admin/audio/cues/${encodeURIComponent(cue.id)}`, { method: "DELETE" });
      await Promise.all([reloadAudioStudio(), reloadSelectedChapter(), loadEvents()]);
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

export function bindAudioForms({ elements, state, loadAudioStudio: reloadAudioStudio, reloadSelectedChapter, loadEvents }) {
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
    await Promise.all([reloadAudioStudio(), loadEvents()]);
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
    await Promise.all([reloadAudioStudio(), reloadSelectedChapter(), loadEvents()]);
  });
}
