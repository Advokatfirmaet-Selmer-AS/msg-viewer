import { messageFragment } from "../components/message";
import { errorFragment } from "../components/error";
import { buildSidebarItem, viewFromMessage, viewFromError } from "../components/sidebar-item";
import type { Message } from "./msg/types/message";
import { parse, parseDir } from "@molotochok/msg-viewer";

interface Entry {
  id: string;
  fileName: string;
  message?: Message;
  error?: string;
}

const entries = new Map<string, Entry>();
let activeId: string | null = null;

const $file = document.getElementById("file") as HTMLInputElement;
const $list = document.getElementById("sidebar-list")!;
const $info = document.getElementById("info")!;
const $msg = document.getElementById("msg")!;

$file.addEventListener("change", async (event) => {
  const target = event.target as HTMLInputElement;
  if (!target.files || target.files.length === 0) return;
  await addFiles(Array.from(target.files));
});

// Reset so the same file can be re-selected
$file.addEventListener("click", (event) => (event.target as HTMLInputElement).value = "");

const $root = document.documentElement;
$root.addEventListener("dragover", (event) => event.preventDefault());
$root.addEventListener("drop", async (event) => {
  event.preventDefault();
  const dropped = Array.from(event.dataTransfer?.files ?? []).filter(f => f.name.endsWith(".msg"));
  if (dropped.length === 0) return;
  await addFiles(dropped);
});

async function addFiles(files: File[]) {
  let firstAddedId: string | null = null;
  for (const file of files) {
    const id = crypto.randomUUID();
    const entry: Entry = { id, fileName: file.name };

    try {
      const buffer = await file.arrayBuffer();
      entry.message = parse(new DataView(buffer));
    } catch (e) {
      console.error(e);
      entry.error = `${e}`;
    }

    entries.set(id, entry);
    appendSidebarRow(entry);
    if (firstAddedId === null) firstAddedId = id;
  }

  updateEmptyState();

  if (activeId === null && firstAddedId !== null) {
    selectEntry(firstAddedId);
  }
}

function appendSidebarRow(entry: Entry) {
  const view = entry.message
    ? viewFromMessage(entry.id, entry.fileName, entry.message)
    : viewFromError(entry.id, entry.fileName);
  const li = buildSidebarItem(view);

  li.addEventListener("click", (e) => {
    if ((e.target as HTMLElement).closest(".sidebar-item-remove")) return;
    selectEntry(entry.id);
  });

  li.querySelector(".sidebar-item-remove")?.addEventListener("click", (e) => {
    e.stopPropagation();
    removeEntry(entry.id);
  });

  $list.appendChild(li);
}

function selectEntry(id: string) {
  const entry = entries.get(id);
  if (!entry) return;
  activeId = id;

  for (const li of $list.querySelectorAll(".sidebar-item")) {
    li.classList.toggle("active", (li as HTMLElement).dataset.id === id);
  }

  renderActive();
}

function renderActive() {
  if (activeId === null) {
    $msg.replaceChildren();
    return;
  }
  const entry = entries.get(activeId);
  if (!entry) {
    $msg.replaceChildren();
    return;
  }

  if (entry.message) {
    renderMessage($msg,
      () => entry.message!,
      (fragment) => $msg.replaceChildren(fragment)
    );
  } else {
    $msg.replaceChildren(errorFragment(`Unable to load "${entry.fileName}". ${entry.error ?? ""}`));
  }
}

function removeEntry(id: string) {
  entries.delete(id);
  $list.querySelector(`[data-id="${CSS.escape(id)}"]`)?.remove();

  if (activeId === id) {
    activeId = null;
    const next = entries.keys().next().value as string | undefined;
    if (next) {
      selectEntry(next);
    } else {
      $msg.replaceChildren();
    }
  }

  updateEmptyState();
}

function updateEmptyState() {
  if (entries.size === 0) {
    $list.classList.add("hidden");
    $info.classList.remove("hidden");
  } else {
    $list.classList.remove("hidden");
    $info.classList.add("hidden");
  }
}

function renderMessage($msg: HTMLElement, getMessage: () => Message, updateDom: (fragment: DocumentFragment) => void) {
  let fragment: DocumentFragment;
  try {
    const message = getMessage();
    fragment = messageFragment(message, dir => {
      renderMessage($msg,
        () => parseDir(message.file, dir),
        (fragment) => {
          for (let i = 0; i < $msg.children.length; i++) {
            const child = $msg.children[i] as HTMLElement;
            child.classList.add("hidden");
          }
          $msg.appendChild(fragment);
        }
      );
    });
  } catch (e) {
    console.error(e);
    fragment = errorFragment(`An error occured during the parsing of the .msg file. Error: ${e}`);
  }

  updateDom(fragment);
}
