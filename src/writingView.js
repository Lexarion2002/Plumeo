import { Editor, Extension, Node } from "@tiptap/core"
import StarterKit from "@tiptap/starter-kit"
import { Plugin, PluginKey } from "prosemirror-state"
import { Decoration, DecorationSet } from "prosemirror-view"
import { Highlight } from "@tiptap/extension-highlight"
import { TextAlign } from "@tiptap/extension-text-align"
import { TextStyle } from "@tiptap/extension-text-style"

let editorInstance = null
let toolbarElement = null
let toolbarHandler = null
let paperShellElement = null
let resizeHandler = null
let resizeFrame = null

const paginationKey = new PluginKey("pagination")
const wordCountKey = new PluginKey("wordCount")

const DocumentNode = Node.create({
  name: "doc",
  topNode: true,
  content: "page+"
})

const PageNode = Node.create({
  name: "page",
  group: "block",
  content: "block+",
  defining: true,
  isolating: true,
  parseHTML() {
    return [{ tag: "div[data-type=\"page\"]" }]
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", { ...HTMLAttributes, "data-type": "page", class: "page-node" }, 0]
  }
})

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

function countWords(text) {
  const trimmed = text.trim()
  if (!trimmed) {
    return 0
  }
  const matches = trimmed.match(/\S+/g)
  return matches ? matches.length : 0
}

const WordCount = Extension.create({
  name: "wordCount",
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: wordCountKey,
        props: {
          decorations(state) {
            const selectionPos = state.selection?.from ?? 0
            const pageType = state.schema.nodes.page
            if (!pageType) {
              return null
            }

            let target = null
            state.doc.descendants((node, pos) => {
              if (node.type === pageType) {
                const start = pos
                const end = pos + node.nodeSize
                if (selectionPos >= start && selectionPos < end) {
                  target = { node, pos }
                  return false
                }
              }
              return true
            })

            if (!target) {
              return null
            }

            const words = countWords(target.node.textContent)
            const label = `${words} mot${words === 1 ? "" : "s"}`
            const widget = document.createElement("div")
            widget.className = "page-word-count"
            widget.textContent = label

            const widgetPos = target.pos + target.node.nodeSize - 1
            const decoration = Decoration.widget(widgetPos, widget, {
              key: "page-word-count",
              side: 1
            })
            return DecorationSet.create(state.doc, [decoration])
          }
        }
      })
    ]
  }
})

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

function normalizeContent(content) {
  if (!content) {
    return "<p></p>"
  }
  const html = isHtml(content) ? content : textToHtml(content)
  if (html.includes("data-type=\"page\"")) {
    return html
  }
  return `<div data-type="page">${html}</div>`
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

function parsePx(value) {
  const parsed = Number.parseFloat(value)
  return Number.isNaN(parsed) ? 0 : parsed
}

const Pagination = Extension.create({
  name: "pagination",
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: paginationKey,
        view(view) {
          let pending = null
          let lastWidth = view.dom.clientWidth
          let isPaginating = false

          const getPageMetrics = () => {
            const shellStyles = paperShellElement
              ? window.getComputedStyle(paperShellElement)
              : null
            const pageHeight =
              parsePx(shellStyles?.getPropertyValue("--page-height")) || 1160
            const pagePadding =
              parsePx(shellStyles?.getPropertyValue("--page-padding")) || 48
            const footerSpace =
              parsePx(shellStyles?.getPropertyValue("--page-footer-space")) || 0
            return { pageHeight, padding: pagePadding, footerSpace }
          }

          const splitPageAt = (state, pos) => {
            const resolved = state.doc.resolve(pos)
            let pageDepth = null
            for (let depth = resolved.depth; depth > 0; depth -= 1) {
              if (resolved.node(depth).type === state.schema.nodes.page) {
                pageDepth = depth
                break
              }
            }
            if (!pageDepth) {
              return null
            }
            const depthToSplit = resolved.depth - pageDepth + 1
            return state.tr.split(pos, depthToSplit)
          }

          const isPageEmpty = (node) => {
            if (!node || node.type.name !== "page") {
              return false
            }
            return node.textContent.trim() === "" && node.childCount <= 1
          }

          const paginate = () => {
            if (isPaginating) {
              return
            }
            isPaginating = true

            const { state } = view
            const pageType = state.schema.nodes.page
            if (!pageType || !paperShellElement) {
              isPaginating = false
              return
            }

            const pageDoms = Array.from(view.dom.querySelectorAll(".page-node"))
            const pageNodes = []
            state.doc.descendants((node, pos) => {
              if (node.type === pageType) {
                pageNodes.push({ node, pos })
              }
            })

            if (pageNodes.length === 0 || pageDoms.length === 0) {
              isPaginating = false
              return
            }

            const selectionPos = state.selection?.from ?? 0
            let targetIndex = pageNodes.length - 1
            for (let i = 0; i < pageNodes.length; i += 1) {
              const start = pageNodes[i].pos
              const end = start + pageNodes[i].node.nodeSize
              if (selectionPos >= start && selectionPos < end) {
                targetIndex = i
                break
              }
            }

            const pageDom = pageDoms[targetIndex]
            const pageInfo = pageNodes[targetIndex]
            if (!pageDom || !pageInfo) {
              isPaginating = false
              return
            }

            const { pageHeight, padding, footerSpace } = getPageMetrics()
            const limit = pageHeight - padding - footerSpace

            if (pageDom.scrollHeight > pageHeight + 1) {
              const pageRect = pageDom.getBoundingClientRect()
              const pageStart = pageInfo.pos + 1
              const pageEnd = pageInfo.pos + pageInfo.node.content.size
              const coords = view.posAtCoords({
                left: pageRect.left + padding + 8,
                top: pageRect.top + limit - 4
              })
              const splitPos = coords?.pos ?? null

              if (splitPos && splitPos > pageStart + 1 && splitPos < pageEnd - 1) {
                const tr = splitPageAt(state, splitPos)
                if (tr) {
                  view.dispatch(tr)
                  isPaginating = false
                  return paginate()
                }
              }
            }

            const lastPage = pageNodes[pageNodes.length - 1]?.node
            if (pageNodes.length > 1 && isPageEmpty(lastPage)) {
              const lastPos = pageNodes[pageNodes.length - 1].pos
              const tr = state.tr.delete(lastPos, lastPos + lastPage.nodeSize)
              view.dispatch(tr)
            }

            isPaginating = false
          }

          const schedule = (immediate = false) => {
            if (pending) {
              return
            }

            const delay = immediate ? 0 : 200
            pending = window.setTimeout(() => {
              pending = null
              paginate()
            }, delay)
          }

          paginate()

          return {
            update(view, prevState) {
              const width = view.dom.clientWidth
              const docChanged = !view.state.doc.eq(prevState.doc)
              const widthChanged = width !== lastWidth
              const forced = view.state.tr.getMeta(paginationKey)

              if (docChanged || widthChanged || forced) {
                lastWidth = width
                schedule(widthChanged || forced)
              }
            },
            destroy() {
              if (pending) {
                clearTimeout(pending)
                pending = null
              }
            }
          }
        }
      })
    ]
  }
})

function updatePaperMetrics() {
  if (!paperShellElement) {
    return
  }

  const available = paperShellElement.clientWidth
  if (!available) {
    return
  }

  const width = Math.min(980, Math.max(640, available))
  const height = Math.round(width * 1.414)
  const padding = Math.round(Math.min(56, Math.max(32, width * 0.06)))
  const footerSpace = Math.round(Math.max(20, padding * 0.6))

  paperShellElement.style.setProperty("--page-width", `${width}px`)
  paperShellElement.style.setProperty("--page-height", `${height}px`)
  paperShellElement.style.setProperty("--page-padding", `${padding}px`)
  paperShellElement.style.setProperty("--page-footer-space", `${footerSpace}px`)
}

function schedulePaperMetrics() {
  if (resizeFrame) {
    return
  }

  resizeFrame = window.requestAnimationFrame(() => {
    resizeFrame = null
    updatePaperMetrics()
    if (editorInstance) {
      editorInstance.view.dispatch(
        editorInstance.view.state.tr.setMeta(paginationKey, true)
      )
    }
  })
}

export function mountWritingView({ content = "", onUpdate } = {}) {
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

  editorInstance = new Editor({
    element: editorElement,
    extensions: [
      DocumentNode,
      PageNode,
      Pagination,
      WordCount,
      StarterKit.configure({ document: false, gapcursor: false }),
      TextAlign.configure({ types: ["paragraph", "heading"] }),
      Highlight,
      TextStyle,
      FontSize
    ],
    content: normalizeContent(content),
    onUpdate({ editor }) {
      if (onUpdate) {
        onUpdate(editor.getHTML())
      }
      updateToolbarState()
    },
    onSelectionUpdate: updateToolbarState,
    onTransaction: updateToolbarState
  })

  updateToolbarState()
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
