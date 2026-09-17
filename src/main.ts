import { APP_NAME } from './meta'

const app = document.querySelector<HTMLDivElement>('#app')
if (app) {
  app.innerHTML = `<h1>${APP_NAME}</h1><p>Under construction.</p>`
}
