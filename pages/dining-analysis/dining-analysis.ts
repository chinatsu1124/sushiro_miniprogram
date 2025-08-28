// dining-analysis.ts
import { apiService, Store } from '../../utils/api'

interface AnalysisResult {
  estimatedIssueTime: string
  avgIssueTime: string
  earliestIssueTime: string
  latestIssueTime: string
  dataPoints: number
  bestTimes?: Array<{
    time: string
    waitTime: number
  }>
}

Component({
  data: {
    // 选择器数据
    regions: [] as string[],
    regionIndex: -1,
    selectedRegion: '',
    
    stores: [] as Store[],
    storeNames: [] as string[],
    storeIndex: -1,
    selectedStore: null as Store | null,
    
    diningTime: '',
    
    // 状态
    loading: false,
    hasAnalyzed: false,
    
    // 分析结果
    analysisResult: null as AnalysisResult | null,
    
    // 历史数据
    historyData: [] as any[],
    
    // 消息提示
    message: '',
    messageType: 'success' // success, warning, error
  },

  lifetimes: {
    attached() {
      this.loadAvailableRegions()
    }
  },

  methods: {
    // 加载可用地区
    async loadAvailableRegions() {
      try {
        this.setData({ loading: true })
        
        const response = await apiService.getRegions()
        if (response.success && response.regions) {
          this.setData({
            regions: response.regions,
            regionIndex: response.regions.includes('杭州') ? response.regions.indexOf('杭州') : 0,
            selectedRegion: response.regions.includes('杭州') ? '杭州' : response.regions[0]
          })
          
          // 如果默认选择了杭州，自动加载门店
          if (this.data.selectedRegion === '杭州') {
            await this.loadStoresByRegion('杭州')
          }
        } else {
          this.showMessage('加载地区列表失败', 'error')
        }
      } catch (error: any) {
        this.showMessage(`加载地区列表失败: ${error.message}`, 'error')
      } finally {
        this.setData({ loading: false })
      }
    },

    // 加载门店列表
    async loadStoresByRegion(region: string) {
      try {
        this.setData({ loading: true })
        
        const response = await apiService.getStores(region)
        if (response.success && response.stores) {
          const storeNames = response.stores.map((store: Store) => store.name)
          this.setData({
            stores: response.stores,
            storeNames: storeNames,
            storeIndex: -1,
            selectedStore: null,
            analysisResult: null,
            hasAnalyzed: false
          })
          
          // 如果是杭州地区，默认选择3011门店
          if (region === '杭州') {
            const store3011 = response.stores.find((store: Store) => store.id === 3011)
            if (store3011) {
              const index = response.stores.indexOf(store3011)
              this.setData({
                storeIndex: index,
                selectedStore: store3011
              })
            }
          }
        } else {
          this.showMessage('加载门店列表失败', 'error')
        }
      } catch (error: any) {
        this.showMessage(`加载门店列表失败: ${error.message}`, 'error')
      } finally {
        this.setData({ loading: false })
      }
    },

    // 地区选择
    async onRegionChange(e: any) {
      const index = e.detail.value
      const region = this.data.regions[index]
      this.setData({
        regionIndex: index,
        selectedRegion: region,
        storeIndex: -1,
        selectedStore: null,
        analysisResult: null,
        hasAnalyzed: false
      })
      
      if (region) {
        await this.loadStoresByRegion(region)
      }
    },

    // 门店选择
    onStoreChange(e: any) {
      const index = e.detail.value
      const store = this.data.stores[index]
      this.setData({
        storeIndex: index,
        selectedStore: store,
        analysisResult: null,
        hasAnalyzed: false
      })
    },

    // 就餐时间选择
    onDiningTimeChange(e: any) {
      const time = e.detail.value
      this.setData({
        diningTime: time,
        analysisResult: null,
        hasAnalyzed: false
      })
    },

    // 验证就餐时间
    isTimeInRange(timeString: string): boolean {
      if (!timeString) return false
      
      const [hours, minutes] = timeString.split(':').map(Number)
      const timeMinutes = hours * 60 + minutes
      const startTime = 10 * 60 + 30 // 10:30
      const endTime = 22 * 60 // 22:00
      
      return timeMinutes >= startTime && timeMinutes <= endTime
    },

    // 分析就餐时间
    async analyzeDiningTime() {
      if (!this.data.selectedStore || !this.data.diningTime) {
        this.showMessage('请选择门店和就餐时间', 'warning')
        return
      }

      if (!this.isTimeInRange(this.data.diningTime)) {
        this.showMessage('请选择营业时间内的就餐时间（10:30-22:00）', 'warning')
        return
      }

      try {
        this.setData({ loading: true, hasAnalyzed: true })
        
        // 直接调用API获取原始数据
        const rawResponse = await this.requestRawData(`/api/dining-analysis?store_id=${this.data.selectedStore.id}&dining_time=${this.data.diningTime}`)
        
        if (rawResponse && !rawResponse.error && rawResponse.analysis_data) {
          // 过滤掉低信度数据
          const highConfidenceData = rawResponse.analysis_data.filter((item: any) => 
            item.confidence === 'high'
          )
          
          // 处理历史数据，计算等待时间
          const processedHistoryData = rawResponse.analysis_data.map((item: any) => {
            const waitTime = this.calculateWaitTime(item.dining_time, item.estimated_issue_time)
            const weekdayInfo = this.getWeekdayInfo(item.date)
            return {
              ...item,
              waitTime: waitTime,
              weekday: weekdayInfo.weekday,
              isWeekend: weekdayInfo.isWeekend
            }
          })
          
          // 计算取号时间统计（只使用高信度数据）
          const issueTimeStats = this.calculateIssueTimeStats(highConfidenceData, this.data.diningTime)
          
          this.setData({
            analysisResult: {
              estimatedIssueTime: issueTimeStats.estimatedIssueTime,
              avgIssueTime: issueTimeStats.avgIssueTime,
              earliestIssueTime: issueTimeStats.earliestIssueTime,
              latestIssueTime: issueTimeStats.latestIssueTime,
              dataPoints: highConfidenceData.length,
              bestTimes: []
            },
            historyData: processedHistoryData
          })
          this.showMessage('分析完成', 'success')
        } else {
          this.showMessage(rawResponse.error || '分析失败', 'error')
          this.setData({ analysisResult: null, historyData: [] })
        }
      } catch (error: any) {
        this.showMessage(`分析失败: ${error.message}`, 'error')
        this.setData({ analysisResult: null })
      } finally {
        this.setData({ loading: false })
      }
    },

    // 直接请求原始数据
    requestRawData(url: string): Promise<any> {
      return new Promise((resolve, reject) => {
        wx.request({
          url: `https://sushiro.chinatsu1124.com${url}`,
          method: 'GET',
          header: {
            'content-type': 'application/json'
          },
          success: (res) => {
            if (res.statusCode === 200) {
              resolve(res.data)
            } else {
              reject(new Error(`HTTP ${res.statusCode}`))
            }
          },
          fail: (error) => {
            reject(new Error(error.errMsg || '网络请求失败'))
          }
        })
      })
    },

    // 计算等待时间
    calculateWaitTime(diningTime: string, issueTime: string): number {
      try {
        const [diningHour, diningMin] = diningTime.split(':').map(Number)
        const [issueHour, issueMin] = issueTime.split(':').map(Number)
        
        const diningMinutes = diningHour * 60 + diningMin
        const issueMinutes = issueHour * 60 + issueMin
        
        return Math.max(0, diningMinutes - issueMinutes)
      } catch {
        return 0
      }
    },

    // 计算取号时间统计
    calculateIssueTimeStats(data: any[], diningTime: string) {
      if (!data || data.length === 0) {
        return {
          estimatedIssueTime: '-',
          avgIssueTime: '-',
          earliestIssueTime: '-',
          latestIssueTime: '-'
        }
      }

      const issueTimes = data.map(item => item.estimated_issue_time).filter(time => time)
      
      if (issueTimes.length === 0) {
        return {
          estimatedIssueTime: '-',
          avgIssueTime: '-',
          earliestIssueTime: '-',
          latestIssueTime: '-'
        }
      }

      // 计算平均取号时间
      const totalMinutes = issueTimes.reduce((sum, time) => {
        const [hour, min] = time.split(':').map(Number)
        return sum + hour * 60 + min
      }, 0)
      const avgMinutes = Math.round(totalMinutes / issueTimes.length)
      const avgHour = Math.floor(avgMinutes / 60)
      const avgMin = avgMinutes % 60
      const avgIssueTime = `${String(avgHour).padStart(2, '0')}:${String(avgMin).padStart(2, '0')}`

      // 找到最早和最晚取号时间
      const timeInMinutes = issueTimes.map(time => {
        const [hour, min] = time.split(':').map(Number)
        return { minutes: hour * 60 + min, timeStr: time }
      })
      
      timeInMinutes.sort((a, b) => a.minutes - b.minutes)
      const earliestIssueTime = timeInMinutes[0].timeStr
      const latestIssueTime = timeInMinutes[timeInMinutes.length - 1].timeStr

      // 预计取号时间就是平均时间
      const estimatedIssueTime = avgIssueTime

      return {
        estimatedIssueTime,
        avgIssueTime,
        earliestIssueTime,
        latestIssueTime
      }
    },

    // 获取日期对应的周几信息
    getWeekdayInfo(dateStr: string): { weekday: string; isWeekend: boolean } {
      try {
        const date = new Date(dateStr)
        const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
        const dayIndex = date.getDay()
        const weekday = weekdays[dayIndex]
        const isWeekend = dayIndex === 0 || dayIndex === 6 // 周日=0, 周六=6
        return { weekday, isWeekend }
      } catch {
        return { weekday: '', isWeekend: false }
      }
    },

    // 转发分享
    onShareAppMessage() {
      const { selectedStore, diningTime } = this.data
      let title = '寿司郎就餐分析'
      let path = 'pages/dining-analysis/dining-analysis'
      
      if (selectedStore) {
        title = `${selectedStore.name} - 寿司郎就餐分析`
        if (diningTime) {
          title += ` (${diningTime})`
          path = `pages/dining-analysis/dining-analysis?store_id=${selectedStore.id}&dining_time=${diningTime}`
        }
      }
      
      return {
        title: title,
        path: path,
        imageUrl: '' // 使用默认分享图片
      }
    },

    // 分享到朋友圈
    onShareTimeline() {
      const { selectedStore, diningTime } = this.data
      let title = '寿司郎就餐分析 - 智能预测取号时间'
      
      if (selectedStore) {
        title = `${selectedStore.name} - 寿司郎就餐分析`
      }
      
      return {
        title: title,
        query: '',
        imageUrl: '' // 使用默认分享图片
      }
    },

    // 显示消息
    showMessage(message: string, type: string = 'success') {
      this.setData({
        message: message,
        messageType: type
      })
      
      setTimeout(() => {
        this.setData({
          message: '',
          messageType: 'success'
        })
      }, 3000)
    }
  }
})
