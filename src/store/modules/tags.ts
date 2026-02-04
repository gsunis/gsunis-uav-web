import { defineStore } from 'pinia'
import { stringify, parse } from 'zipson'
import router from '@/router/index'

export const useTagsStore = defineStore('tags', {
  state: () => ({
    tagsCaches: [] as string[],
    tagsValue: '',
    tagsList: [] as any[]
  }),
  getters: {
    getTagsLists: (state) => state.tagsList
  },
  actions: {
    async RESET_TAGS_STATE() {
      this.$reset()
    },
    async addTags(tabItem: any) {
      if (this.tagsList.every((item: any) => item.path !== tabItem.path)) {
        const tagInfo = {
          name: tabItem.meta.title,
          code: tabItem.name,
          path: tabItem.path,
          close: tabItem.meta.close,
          keepAlive: tabItem.meta.keepAlive
        }
        this.tagsList.push(tagInfo)
      }
      this.tagsValue = tabItem.path
      router.push(tabItem.path)
    },
    async closeTags(tagPath: string) {
      let tagsMenuValue = this.tagsValue
      const tagsMenuList = this.tagsList
      if (tagsMenuValue === tagPath) {
        tagsMenuList.forEach((item, index) => {
          if (item.path !== tagPath) return
          const nextTab = tagsMenuList[index + 1] || tagsMenuList[index - 1]
          if (!nextTab) return
          tagsMenuValue = nextTab.path
          router.push(nextTab.path)
        })
      }
      this.tagsValue = tagsMenuValue
      this.tagsList = tagsMenuList.filter((item) => item.path !== tagPath)
    },
    async closeOtherTags(val: string) {
      this.tagsList = this.tagsList.filter((item) => {
        return item.path === val || item.path === '/Dashboard/Index'
      })
    },
    async closeAllTags() {
      this.tagsList = this.tagsList.filter((item) => {
        return item.path === '/Dashboard/Index'
      })
    },
    async delCachedView(view: any) {
      const index = this.tagsCaches.indexOf(view.code)
      index > -1 && this.tagsCaches.splice(index, 1)
    },
    async addCachedView(view: any) {
      if (this.tagsCaches.includes(view.name)) return
      if (view.keepAlive) this.tagsCaches.push(view.code)
    },
    async goHome() {
      router.push('/Dashboard/Index')
      this.tagsValue = '/Dashboard/Index'
    }
  },
  persist: {
    serializer: {
      deserialize: parse,
      serialize: stringify
    },
    storage: sessionStorage,
    paths: ['tagsCaches', 'tagsList']
  }
})
