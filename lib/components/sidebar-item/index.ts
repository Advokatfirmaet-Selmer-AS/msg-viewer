import type { Message } from "../../scripts/msg/types/message";
import { createFragmentFromTemplate } from "../../scripts/utils/html-template-util";
import template from "./index.html" with { type: "text" };

export interface SidebarItemView {
  id: string;
  subject: string;
  sender: string;
  hasAttachment: boolean;
  isError: boolean;
}

export function buildSidebarItem(view: SidebarItemView): HTMLLIElement {
  const fragment = createFragmentFromTemplate(template, {});
  const li = fragment.firstElementChild as HTMLLIElement;
  li.dataset.id = view.id;
  if (view.isError) li.classList.add("sidebar-item-error");

  (li.querySelector(".sidebar-item-subject") as HTMLElement).textContent = view.subject;
  (li.querySelector(".sidebar-item-sender") as HTMLElement).textContent = view.sender;
  if (view.hasAttachment) {
    li.querySelector(".sidebar-item-attach")!.classList.remove("hidden");
  }
  return li;
}

export function viewFromMessage(id: string, fileName: string, message: Message): SidebarItemView {
  const subject = message.content.subject?.trim() || fileName || "(no subject)";
  const sender = message.content.senderName?.trim()
    || message.content.senderEmail?.trim()
    || "(unknown sender)";
  return {
    id,
    subject,
    sender,
    hasAttachment: message.attachments?.some(a => a.content) ?? false,
    isError: false,
  };
}

export function viewFromError(id: string, fileName: string): SidebarItemView {
  return {
    id,
    subject: fileName,
    sender: "Unable to load",
    hasAttachment: false,
    isError: true,
  };
}
