import { Node } from '@tiptap/core'

export const LyricsText = Node.create({
  name: 'lyricsText',

  group: 'block',
  content: 'inline*',
  defining: true,

  parseHTML() {
    return [
      {
        tag: 'p[data-type="lyrics-text"]',
      },
    ]
  },

  renderHTML() {
    return ['p', { 'data-type': 'lyrics-text' }, 0]
  },
})
