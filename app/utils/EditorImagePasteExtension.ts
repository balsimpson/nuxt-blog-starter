import { Extension } from '@tiptap/core'
import type { Editor } from '@tiptap/core'
import { Plugin } from '@tiptap/pm/state'

type ImagePasteOptions = {
  onPasteImages: (files: File[], editor: Editor, range: { from: number, to: number }) => void
}

export const EditorImagePaste = Extension.create<ImagePasteOptions>({
  name: 'editorImagePaste',

  addOptions() {
    return {
      onPasteImages: () => {}
    }
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          handlePaste: (_view, event) => {
            const clipboard = event.clipboardData
            if (!clipboard) return false

            const files = Array.from(clipboard.items)
              .filter(item => item.kind === 'file' && item.type.startsWith('image/'))
              .map(item => item.getAsFile())
              .filter((file): file is File => Boolean(file))

            if (files.length === 0) return false

            event.preventDefault()
            const { from, to } = this.editor.state.selection
            this.options.onPasteImages(files, this.editor, { from, to })
            return true
          }
        }
      })
    ]
  }
})
