import { blockHtml, blockText, selectOptions } from "./studio-utils.js";

function ensureTextSpan(block) {
  if (block.type === "scene_break") {
    block.spans = [];
    return;
  }
  if (!block.spans?.length) {
    block.spans = [{ id: `${block.id}_spn_1`, text: "" }];
  }
}

function duplicateBlock(block, chapterId) {
  const id = `blk_${chapterId}_${Date.now()}`;
  if (block.type === "scene_break") {
    return { ...block, id, spans: [] };
  }
  return {
    ...block,
    id,
    spans: (block.spans || [{ text: "" }]).map((span, index) => ({
      ...span,
      id: `${id}_spn_${index + 1}`,
    })),
  };
}

export function renderPreviewFromBlocks({ elements, state }) {
  if (!state.selectedChapter) {
    elements.preview.innerHTML = "<p>Select a chapter.</p>";
    return;
  }
  const html = state.blocks.map(blockHtml).join("\n");
  elements.preview.innerHTML = `<article class="chapter">${html}</article>`;
  elements.previewStatus.textContent = state.dirty ? "Unsaved preview" : "Saved preview";
}

export function serializeBlocks({ state }) {
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

export function validateChapterDraft({ elements, state }) {
  if (!state.selectedChapter) {
    return [];
  }
  const issues = [];
  if (!elements.titleInput.value.trim()) {
    issues.push("Title is required.");
  }
  if (!/^[a-z0-9-]+$/.test(elements.slugInput.value.trim())) {
    issues.push("Slug must use lowercase letters, numbers, and hyphens.");
  }
  if (state.blocks.length === 0) {
    issues.push("Add at least one chapter block.");
  }
  return issues;
}

export function renderChapterValidation({ elements, state }) {
  const issues = validateChapterDraft({ elements, state });
  elements.validationList.innerHTML = "";
  issues.forEach((message) => {
    const item = document.createElement("span");
    item.className = "validation-chip";
    item.textContent = message;
    elements.validationList.appendChild(item);
  });
  elements.saveDraftButton.disabled = !state.selectedChapter || issues.length > 0;
  elements.previewChapterButton.disabled = !state.selectedChapter || issues.length > 0;
  return issues;
}

export function renderBlockEditor({ elements, state, setDirty, renderPreview }) {
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
      ensureTextSpan(state.blocks[index]);
      setDirty(true);
      renderBlockEditor({ elements, state, setDirty, renderPreview });
      renderPreview();
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
      renderPreview();
    });

    const actions = document.createElement("div");
    actions.className = "block-actions";

    const moveUpButton = document.createElement("button");
    moveUpButton.type = "button";
    moveUpButton.textContent = "Move up";
    moveUpButton.disabled = index === 0;
    moveUpButton.addEventListener("click", () => {
      [state.blocks[index - 1], state.blocks[index]] = [state.blocks[index], state.blocks[index - 1]];
      setDirty(true);
      renderBlockEditor({ elements, state, setDirty, renderPreview });
      renderPreview();
    });

    const moveDownButton = document.createElement("button");
    moveDownButton.type = "button";
    moveDownButton.textContent = "Move down";
    moveDownButton.disabled = index === state.blocks.length - 1;
    moveDownButton.addEventListener("click", () => {
      [state.blocks[index], state.blocks[index + 1]] = [state.blocks[index + 1], state.blocks[index]];
      setDirty(true);
      renderBlockEditor({ elements, state, setDirty, renderPreview });
      renderPreview();
    });

    const duplicateButton = document.createElement("button");
    duplicateButton.type = "button";
    duplicateButton.textContent = "Duplicate";
    duplicateButton.addEventListener("click", () => {
      state.blocks.splice(index + 1, 0, duplicateBlock(block, state.selectedChapter.id));
      setDirty(true);
      renderBlockEditor({ elements, state, setDirty, renderPreview });
      renderPreview();
    });

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.textContent = "Remove";
    removeButton.addEventListener("click", () => {
      state.blocks.splice(index, 1);
      setDirty(true);
      renderBlockEditor({ elements, state, setDirty, renderPreview });
      renderPreview();
    });

    actions.append(moveUpButton, moveDownButton, duplicateButton, removeButton);
    card.append(typeSelect, label, textarea, actions);
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
      renderBlockEditor({ elements, state, setDirty, renderPreview });
      renderPreview();
    });
    addRow.appendChild(button);
  });
  elements.blockEditor.appendChild(addRow);
}
