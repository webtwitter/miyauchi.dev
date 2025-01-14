import { Parameters } from '@storybook/addons'
import { action } from '@storybook/addon-actions'

window.___navigate = (pathname) => {
  action('NavigateTo:')(pathname)
}

const parameters: Parameters = {
  actions: { argTypesRegex: '^on[A-Z].*' },
  controls: {
    matchers: {
      color: /(background|color)$/i,
      date: /Date$/
    }
  },
  darkMode: {
    stylePreview: true
  }
}

import '@/assets/global.scss'
import '@/assets/prose.scss'

export { parameters }
