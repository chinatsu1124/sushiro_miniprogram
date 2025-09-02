// app.ts
import { Store } from './utils/api'

interface GlobalData {
  selectedStore?: Store
  selectedDate?: string
  selectedRegion?: string
}

App<IAppOption>({
  globalData: {
    selectedStore: undefined,
    selectedDate: undefined,
    selectedRegion: undefined
  } as GlobalData,

  onLaunch() {
    // 展示本地存储能力
    const logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)

    // 登录
    wx.login({
      success: res => {
        console.log(res.code)
        // 发送 res.code 到后台换取 openId, sessionKey, unionId
      },
    })

    // 初始化全局数据
    this.initGlobalData()
  },

  // 初始化全局数据
  initGlobalData() {
    try {
      // 从本地存储恢复数据
      const storedStore = wx.getStorageSync('selectedStore')
      const storedDate = wx.getStorageSync('selectedDate')
      const storedRegion = wx.getStorageSync('selectedRegion')

      if (storedStore) {
        this.globalData.selectedStore = storedStore
      }
      if (storedDate) {
        this.globalData.selectedDate = storedDate
      }
      if (storedRegion) {
        this.globalData.selectedRegion = storedRegion
      }
    } catch (error) {
      console.error('初始化全局数据失败:', error)
    }
  },

  // 设置选中的门店
  setSelectedStore(store: Store, date?: string) {
    this.globalData.selectedStore = store
    if (date) {
      this.globalData.selectedDate = date
    }

    // 保存到本地存储
    try {
      wx.setStorageSync('selectedStore', store)
      if (date) {
        wx.setStorageSync('selectedDate', date)
      }
    } catch (error) {
      console.error('保存门店数据失败:', error)
    }
  },

  // 设置选中的地区
  setSelectedRegion(region: string) {
    this.globalData.selectedRegion = region

    // 保存到本地存储
    try {
      wx.setStorageSync('selectedRegion', region)
    } catch (error) {
      console.error('保存地区数据失败:', error)
    }
  },

  // 设置选中的日期
  setSelectedDate(date: string) {
    this.globalData.selectedDate = date

    // 保存到本地存储
    try {
      wx.setStorageSync('selectedDate', date)
    } catch (error) {
      console.error('保存日期数据失败:', error)
    }
  },

  // 获取全局数据
  getGlobalData(): GlobalData {
    return this.globalData
  }
})