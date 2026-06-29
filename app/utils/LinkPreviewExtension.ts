import { Node, mergeAttributes, type NodeViewRenderer } from '@tiptap/core'
import { Plugin, TextSelection } from '@tiptap/pm/state'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import EditorLinkPreview from '~/components/EditorLinkPreview.vue'

export type LinkPreviewOptions = {
  HTMLAttributes: Record<string, unknown>
}

export type LinkPreviewAttrs = {
  url: string
  title: string
  description: string
  image: string
  siteName: string
  favicon: string
}

const loneUrlPattern = /^\s*(https?:\/\/[^\s]+)\s*$/

const metaAttrs: Array<{ key: keyof LinkPreviewAttrs, dataAttr: string }> = [
  { key: 'url', dataAttr: 'data-href' },
  { key: 'title', dataAttr: 'data-title' },
  { key: 'description', dataAttr: 'data-description' },
  { key: 'image', dataAttr: 'data-image' },
  { key: 'siteName', dataAttr: 'data-site' },
  { key: 'favicon', dataAttr: 'data-favicon' }
]

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export const LinkPreview: Node<LinkPreviewOptions, any> = Node.create<LinkPreviewOptions>({
  name: 'linkPreview',
  group: 'block',
  atom: true,
  draggable: false,
  selectable: true,

  addOptions() {
    return {
      HTMLAttributes: {}
    }
  },

  addAttributes() {
    return {
      url: { default: '' },
      title: { default: '' },
      description: { default: '' },
      image: { default: '' },
      siteName: { default: '' },
      favicon: { default: '' }
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-link-preview]',
        getAttrs: element => {
          const el = element as HTMLElement
          const attrs: Record<string, string> = {}
          for (const { key, dataAttr } of metaAttrs) {
            attrs[key] = el.getAttribute(dataAttr) || ''
          }
          return attrs
        }
      }
    ]
  },

  renderHTML({ HTMLAttributes }) {
    const attrs = mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
      'data-link-preview': ''
    })
    return ['div', attrs]
  },

  renderMarkdown(node) {
    const attrs = (node.attrs ?? {}) as LinkPreviewAttrs
    const parts = ['data-link-preview']
    for (const { key, dataAttr } of metaAttrs) {
      const value = (attrs[key] as string) ?? ''
      if (value) parts.push(`${dataAttr}="${escapeAttr(value)}"`)
    }
    return `\n<div ${parts.join(' ')}></div>\n`
  },

  addNodeView(): NodeViewRenderer {
    return VueNodeViewRenderer(EditorLinkPreview)
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          handlePaste: (view, event) => {
            const clipboard = event.clipboardData
            if (!clipboard) return false

            const text = clipboard.getData('text/plain') ?? ''
            const match = text.match(loneUrlPattern)
            if (!match) return false

            const { state, dispatch } = view
            const { from, empty } = state.selection
            if (!empty) return false

            const $from = state.doc.resolve(from)
            const parent = $from.parent
            if (parent.type.name !== 'paragraph' || parent.content.size !== 0) {
              return false
            }

            event.preventDefault()

            const start = $from.before($from.depth)
            const end = $from.after($from.depth)
            const linkPreviewType = state.schema.nodes.linkPreview
            const paragraphType = state.schema.nodes.paragraph
            if (!linkPreviewType || !paragraphType) return false

            const linkNode = linkPreviewType.create({ url: match[1] })
            const trailingParagraph = paragraphType.create()

            const tr = state.tr.replaceWith(start, end, [linkNode, trailingParagraph])
            const cursor = start + linkNode.nodeSize + 1
            tr.setSelection(TextSelection.create(tr.doc, cursor))
            dispatch(tr.scrollIntoView())
            return true
          }
        }
      })
    ]
  }
})
