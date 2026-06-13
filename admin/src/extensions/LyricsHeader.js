import { Node } from '@tiptap/core'

export const LyricsHeader = Node.create({
  name: 'lyricsHeader',

  group: 'block',
  content: 'inline*',
  defining: true,

  parseHTML() {
    return [
      {
        tag: 'p[data-type="lyrics-header"]',
      },
    ]
  },

  renderHTML() {
    return ['p', { 'data-type': 'lyrics-header' }, 0]
  },
})
