import { Editor, Extension, InputRule } from "@tiptap/core"
import StarterKit from "@tiptap/starter-kit"
import { Highlight } from "@tiptap/extension-highlight"
import { TextAlign } from "@tiptap/extension-text-align"
import { TextStyle } from "@tiptap/extension-text-style"
import { Plugin, TextSelection } from "@tiptap/pm/state"
import { Decoration, DecorationSet } from "@tiptap/pm/view"

let editorInstance = null
let toolbarElement = null
let toolbarHandler = null
let paperShellElement = null
let resizeHandler = null
let resizeFrame = null

const FontSize = Extension.create({
  name: "fontSize",
  addGlobalAttributes() {
    return [
      {
        types: ["textStyle"],
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element) => element.style.fontSize || null,
            renderHTML: (attributes) => {
              if (!attributes.fontSize) {
                return {}
              }
              return { style: `font-size: ${attributes.fontSize}` }
            }
          }
        }
      }
    ]
  },
  addCommands() {
    return {
      setFontSize:
        (size) =>
        ({ chain }) =>
          chain().setMark("textStyle", { fontSize: size }).run(),
      unsetFontSize:
        () =>
        ({ chain }) =>
          chain().setMark("textStyle", { fontSize: null }).removeEmptyTextStyle().run()
    }
  }
})

const TabIndent = Extension.create({
  name: "tabIndent",
  addKeyboardShortcuts() {
    return {
      Tab: () => {
        if (this.editor.isActive("listItem")) {
          return false
        }
        return this.editor.commands.insertContent("\t")
      },
      "Shift-Tab": () => {
        if (this.editor.isActive("listItem")) {
          return false
        }
        const { state } = this.editor
        const { from, empty } = state.selection
        if (!empty || from <= 1) {
          return this.editor.commands.command(() => true)
        }
        const beforeChar = state.doc.textBetween(from - 1, from, "\0", "\0")
        if (beforeChar !== "\t") {
          return this.editor.commands.command(() => true)
        }
        return this.editor.commands.command(({ tr }) => {
          tr.delete(from - 1, from)
          return true
        })
      }
    }
  }
})

const DialogueDash = Extension.create({
  name: "dialogueDash",
  addGlobalAttributes() {
    return [
      {
        types: ["paragraph"],
        attributes: {
          dialogueIndent: {
            default: false,
            parseHTML: (element) =>
              element.getAttribute("data-dialogue-indent") === "true",
            renderHTML: (attributes) => {
              if (!attributes.dialogueIndent) {
                return {}
              }
              return {
                "data-dialogue-indent": "true",
                class: "dialogue-indent"
              }
            }
          }
        }
      }
    ]
  },
  addInputRules() {
    return [
      new InputRule({
        find: /^(\s*)--$/,
        handler: ({ state, range, match }) => {
          const { $from } = state.selection
          if (!$from.parent || $from.parent.type.name !== "paragraph") {
            return null
          }
          for (let depth = 0; depth <= $from.depth; depth += 1) {
            const nodeName = $from.node(depth).type.name
            if (nodeName === "heading" || nodeName === "codeBlock" || nodeName === "listItem") {
              return null
            }
          }

          const prefix = match[1] ?? ""
          const insertText = `${prefix}\u2014 `
          let tr = state.tr.insertText(insertText, range.from, range.to)

          const paragraphPos = $from.before()
          tr = tr.setNodeMarkup(paragraphPos, undefined, {
            ...$from.parent.attrs,
            dialogueIndent: true
          })

          const cursorPos = range.from + insertText.length
          tr = tr.setSelection(TextSelection.create(tr.doc, cursorPos))
          return tr
        }
      })
    ]
  }
})

function buildWikiLinkDecorations(doc) {
  const decorations = []
  const regex = /\[\[([^\]]+)\]\]/g

  doc.descendants((node, pos, parent) => {
    if (!node.isText || !node.text) {
      return
    }
    if (parent?.type?.name === "codeBlock") {
      return
    }
    if (node.marks?.some((mark) => mark.type.name === "code")) {
      return
    }
    regex.lastIndex = 0
    let match
    while ((match = regex.exec(node.text)) !== null) {
      const raw = match[1] ?? ""
      const pipeIndex = raw.indexOf("|")
      const titleRaw = pipeIndex === -1 ? raw : raw.slice(0, pipeIndex)
      const title = titleRaw.trim()
      if (!title) {
        continue
      }
      const from = pos + match.index
      const to = from + match[0].length
      decorations.push(
        Decoration.inline(from, to, {
          class: "editor-wiki-link",
          "data-wiki-title": encodeURIComponent(title)
        })
      )
    }
  })

  if (!decorations.length) {
    return DecorationSet.empty
  }
  return DecorationSet.create(doc, decorations)
}

const WikiLink = Extension.create({
  name: "wikiLink",
  addOptions() {
    return {
      onOpen: null
    }
  },
  addProseMirrorPlugins() {
    const onOpen = this.options.onOpen
    const plugin = new Plugin({
      state: {
        init: (_, { doc }) => buildWikiLinkDecorations(doc),
        apply: (tr, old) => (tr.docChanged ? buildWikiLinkDecorations(tr.doc) : old)
      },
      props: {
        decorations(state) {
          return plugin.getState(state)
        },
        handleClick(_view, _pos, event) {
          if (event.button !== 0) {
            return false
          }
          const target = event.target instanceof HTMLElement ? event.target : null
          const link = target?.closest(".editor-wiki-link")
          if (!link) {
            return false
          }
          const rawTitle = link.dataset.wikiTitle || ""
          const title = rawTitle ? decodeURIComponent(rawTitle) : ""
          if (!title) {
            return false
          }
          if (typeof onOpen === "function") {
            onOpen(title)
          }
          event.preventDefault()
          return true
        }
      }
    })
    return [plugin]
  }
})

function countWords(text) {
  const trimmed = text.trim()
  if (!trimmed) {
    return 0
  }
  const matches = trimmed.match(/\S+/g)
  return matches ? matches.length : 0
}

function updateWordCount() {
  if (!editorInstance) {
    return
  }
  const label = document.querySelector("#editor-word-count")
  if (!label) {
    return
  }
  const words = countWords(editorInstance.state.doc.textContent ?? "")
  label.textContent = `${words} mot${words === 1 ? "" : "s"}`
}

export function getEditorWordCount() {
  if (!editorInstance) {
    return null
  }
  return countWords(editorInstance.state.doc.textContent ?? "")
}

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function textToHtml(text) {
  if (!text) {
    return "<p></p>"
  }

  return text
    .split("\n")
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join("")
}

function isHtml(value) {
  return /<\/?[a-z][\s\S]*>/i.test(value)
}

function stripPageWrappers(html) {
  if (!html.includes("data-type=\"page\"")) {
    return html
  }
  const container = document.createElement("div")
  container.innerHTML = html
  const pages = Array.from(container.querySelectorAll("div[data-type=\"page\"]"))
  for (const page of pages) {
    const parent = page.parentNode
    if (!parent) {
      continue
    }
    while (page.firstChild) {
      parent.insertBefore(page.firstChild, page)
    }
    parent.removeChild(page)
  }
  return container.innerHTML
}

function normalizeContent(content) {
  if (!content) {
    return "<p></p>"
  }
  const html = isHtml(content) ? content : textToHtml(content)
  return stripPageWrappers(html)
}

function updateToolbarState() {
  if (!editorInstance || !toolbarElement) {
    return
  }

  const buttons = toolbarElement.querySelectorAll("[data-command]")
  const fontSizeSelect = toolbarElement.querySelector("[data-command=\"font-size\"]")
  for (const button of buttons) {
    const command = button.dataset.command
    let isActive = false

    if (command === "bold") {
      isActive = editorInstance.isActive("bold")
    } else if (command === "italic") {
      isActive = editorInstance.isActive("italic")
    } else if (command === "heading-1") {
      isActive = editorInstance.isActive("heading", { level: 1 })
    } else if (command === "heading-2") {
      isActive = editorInstance.isActive("heading", { level: 2 })
    } else if (command === "align-left") {
      isActive = editorInstance.isActive({ textAlign: "left" })
    } else if (command === "align-center") {
      isActive = editorInstance.isActive({ textAlign: "center" })
    } else if (command === "align-right") {
      isActive = editorInstance.isActive({ textAlign: "right" })
    } else if (command === "align-justify") {
      isActive = editorInstance.isActive({ textAlign: "justify" })
    } else if (command === "bullet-list") {
      isActive = editorInstance.isActive("bulletList")
    } else if (command === "ordered-list") {
      isActive = editorInstance.isActive("orderedList")
    } else if (command === "highlight") {
      isActive = editorInstance.isActive("highlight")
    } else if (command && command.startsWith("font-")) {
      const size = `${command.replace("font-", "")}px`
      isActive = editorInstance.isActive("textStyle", { fontSize: size })
    }

    if (command === "align-left" && !isActive) {
      const paraAlign = editorInstance.getAttributes("paragraph").textAlign
      const headingAlign = editorInstance.getAttributes("heading").textAlign
      if (!paraAlign && !headingAlign) {
        isActive = true
      }
    }

    button.classList.toggle("is-active", isActive)

    if (command === "undo") {
      button.disabled = !editorInstance.can().undo()
    }
    if (command === "redo") {
      button.disabled = !editorInstance.can().redo()
    }
  }

  if (fontSizeSelect) {
    if (document.activeElement === fontSizeSelect) {
      return
    }
    const activeSize = editorInstance.getAttributes("textStyle").fontSize || ""
    fontSizeSelect.value = activeSize ? activeSize.replace("px", "") : "16"
  }
}

function handleToolbarClick(event) {
  if (
    event.target instanceof HTMLSelectElement ||
    event.target instanceof HTMLOptionElement
  ) {
    return
  }

  const button = event.target.closest("[data-command]")
  if (!button || !editorInstance) {
    return
  }

  if (button instanceof HTMLSelectElement) {
    return
  }

  const command = button.dataset.command
  const chain = editorInstance.chain().focus()

  if (command === "bold") {
    chain.toggleBold().run()
  } else if (command === "italic") {
    chain.toggleItalic().run()
  } else if (command === "heading-1") {
    chain.toggleHeading({ level: 1 }).run()
  } else if (command === "heading-2") {
    chain.toggleHeading({ level: 2 }).run()
  } else if (command === "align-left") {
    chain.setTextAlign("left").run()
  } else if (command === "align-center") {
    chain.setTextAlign("center").run()
  } else if (command === "align-right") {
    chain.setTextAlign("right").run()
  } else if (command === "align-justify") {
    chain.setTextAlign("justify").run()
  } else if (command === "bullet-list") {
    chain.toggleBulletList().run()
  } else if (command === "ordered-list") {
    chain.toggleOrderedList().run()
  } else if (command === "highlight") {
    if (editorInstance.isActive("highlight")) {
      chain.unsetHighlight().run()
    } else {
      chain.toggleHighlight({ color: "var(--token-highlight)" }).run()
    }
  } else if (command && command.startsWith("font-")) {
    const size = `${command.replace("font-", "")}px`
    chain.setFontSize(size).run()
  } else if (command === "undo") {
    chain.undo().run()
  } else if (command === "redo") {
    chain.redo().run()
  }

  updateToolbarState()
}

function handleToolbarChange(event) {
  const target = event.target
  if (!editorInstance || !(target instanceof HTMLSelectElement)) {
    return
  }

  if (target.dataset.command !== "font-size") {
    return
  }

  const size = target.value
  const chain = editorInstance.chain().focus()
  if (!size) {
    chain.unsetFontSize().run()
    updateToolbarState()
    return
  }

  const sizePx = `${size}px`
  chain.setFontSize(sizePx).run()

  updateToolbarState()
}

function updatePaperMetrics() {
  if (!paperShellElement) {
    return
  }

  const available = paperShellElement.clientWidth
  if (!available) {
    return
  }

  const width = Math.min(980, Math.max(640, available))
  const padding = Math.round(Math.min(56, Math.max(32, width * 0.06)))

  paperShellElement.style.setProperty("--page-width", `${width}px`)
  paperShellElement.style.setProperty("--page-padding", `${padding}px`)
}

function schedulePaperMetrics() {
  if (resizeFrame) {
    return
  }

  resizeFrame = window.requestAnimationFrame(() => {
    resizeFrame = null
    updatePaperMetrics()
  })
}

export function mountWritingView({ content = "", onUpdate, onWikiLinkClick } = {}) {
  const editorElement = document.querySelector("#chapter-editor")
  const toolbar = document.querySelector("#editor-toolbar")
  const paperShell = document.querySelector(".paper-shell")

  if (!editorElement || !toolbar || !paperShell) {
    unmountWritingView()
    return
  }

  if (editorInstance) {
    editorInstance.destroy()
    editorInstance = null
  }

  toolbarElement = toolbar
  toolbarHandler = handleToolbarClick
  toolbarElement.addEventListener("click", toolbarHandler)
  toolbarElement.addEventListener("change", handleToolbarChange)
  paperShellElement = paperShell
  resizeHandler = schedulePaperMetrics
  window.addEventListener("resize", resizeHandler)
  schedulePaperMetrics()

  const extensions = [
    StarterKit.configure({ gapcursor: false }),
    TextAlign.configure({ types: ["paragraph", "heading"] }),
    Highlight,
    TextStyle,
    FontSize,
    TabIndent,
    DialogueDash
  ]

  if (typeof onWikiLinkClick === "function") {
    extensions.push(WikiLink.configure({ onOpen: onWikiLinkClick }))
  }

  editorInstance = new Editor({
    element: editorElement,
    extensions,
    content: normalizeContent(content),
    onUpdate({ editor }) {
      if (onUpdate) {
        onUpdate(editor.getHTML())
      }
      updateToolbarState()
      updateWordCount()
    },
    onSelectionUpdate: updateToolbarState,
    onTransaction: updateToolbarState
  })

  updateToolbarState()
  updateWordCount()
}

export function unmountWritingView() {
  if (toolbarElement && toolbarHandler) {
    toolbarElement.removeEventListener("click", toolbarHandler)
    toolbarElement.removeEventListener("change", handleToolbarChange)
  }

  toolbarElement = null
  toolbarHandler = null
  paperShellElement = null

  if (resizeHandler) {
    window.removeEventListener("resize", resizeHandler)
    resizeHandler = null
  }

  if (resizeFrame) {
    window.cancelAnimationFrame(resizeFrame)
    resizeFrame = null
  }

  if (editorInstance) {
    editorInstance.destroy()
    editorInstance = null
  }
}
