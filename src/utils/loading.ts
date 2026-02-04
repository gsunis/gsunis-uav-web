import '@/styles/loading.less'

export const NextLoading = {
  start: () => {
    const bodys: Element = document.body
    const div = <HTMLElement>document.createElement('div')
    div.setAttribute('class', 'loading-next')
    const htmls = `
    <div class="app-loading">
        <div class="app-loading-container">
          <div class="app-loading-dots">
            <span class="dot dot-spin"><i></i><i></i><i></i><i></i></span>
          </div>
          <div class="app-loading-title">${import.meta.env.VITE_APP_TITLE}</div>
        </div>
      </div>`
    div.innerHTML = htmls
    bodys.insertBefore(div, bodys.childNodes[0])
    window.nextLoading = true
  },
  finish: () => {
    nextTick(() => {
      window.nextLoading = false
      const el = <HTMLElement>document.querySelector('.loading-next')
      el?.parentNode?.removeChild(el)
    })
  }
}
