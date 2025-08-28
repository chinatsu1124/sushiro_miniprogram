/// <reference path="../node_modules/miniprogram-api-typings/index.d.ts" />

interface IAppOption {
  globalData: {
    selectedStore?: any
    selectedDate?: string
    selectedRegion?: string
  }
  setSelectedStore?: (store: any, date?: string) => void
  setSelectedRegion?: (region: string) => void
  setSelectedDate?: (date: string) => void
  getGlobalData?: () => any
  initGlobalData?: () => void
}

