// index.ts
import { apiService, Store, Utils } from '../../utils/api'
import { DebugUtils } from '../../utils/debug'

// 获取应用实例
const app = getApp<IAppOption>()

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
    
    availableDates: [] as string[],
    dateIndex: -1,
    selectedDate: '',
    
    // 状态
    loading: false,
    hasData: false,
    
    // 统计数据
    stats: {
      currentQueueCount: '-',
      currentWaitTime: '-',
      avgCalls: '-',
      maxCalls: '-',
      avgNewTickets: '-',
      maxNewTickets: '-'
    } as any,
    
    // 消息提示
    message: '',
    messageType: 'success', // success, warning, error
    
    // 分享参数
    shareStoreId: null as number | null,
    shareDate: null as string | null
  },

  lifetimes: {
    attached() {
      this.initializeApp()
      this.handleShareParameters()
    }
  },

  methods: {
    // 初始化应用
    async initializeApp() {
      try {
        // 加载地区列表
        await this.loadAvailableRegions()
        
        // 设置默认地区为杭州
        this.setDefaultToHangzhou()
      } catch (error) {
        console.error('应用初始化失败:', error)
        // 如果初始化失败，确保至少显示杭州
        this.setDefaultToHangzhou()
      }
    },

    // 设置默认为杭州
    setDefaultToHangzhou() {
      if (this.data.regions.includes('杭州')) {
        const hangzhouIndex = this.data.regions.indexOf('杭州')
        this.setData({
          regionIndex: hangzhouIndex,
          selectedRegion: '杭州'
        })
        
        // 保存到全局数据
        app.setSelectedRegion('杭州')
        
        // 自动加载杭州的门店
        this.loadStoresByRegion('杭州')
        
        console.log('设置默认城市：杭州')
      }
    },

    // 加载可用地区
    async loadAvailableRegions() {
      try {
        this.setData({ loading: true })
        
        // 首先检查网络状态
        const networkStatus = await DebugUtils.checkNetworkStatus()
        console.log('Network Status:', networkStatus)
        
        if (!networkStatus.isConnected) {
          this.showMessage('网络连接不可用，请检查网络设置', 'error')
          return
        }
        
        const response = await apiService.getRegions()
        console.log('Regions API Response:', response)
        
        if (response.success && response.regions && response.regions.length > 0) {
          this.setData({
            regions: response.regions,
            regionIndex: -1,  // 初始化时不选择任何地区
            selectedRegion: ''
          })
          
          console.log('Successfully loaded regions:', response.regions)
        } else {
          const errorMsg = response.message || '服务器返回数据格式错误'
          this.showMessage(`加载地区列表失败: ${errorMsg}`, 'error')
          
          // 显示详细调试信息
          DebugUtils.showDetailedError(response, '地区列表API')
        }
      } catch (error: any) {
        console.error('Load regions error:', error)
        this.showMessage(`加载地区列表失败: ${error.message || '网络请求异常'}`, 'error')
        
        // 显示详细调试信息
        DebugUtils.showDetailedError(error, '地区列表请求')
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
            availableDates: [],
            selectedDate: '',
            hasData: false
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
              await this.loadAvailableDates(store3011.id)
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

    // 加载可用日期
    async loadAvailableDates(storeId: number) {
      try {
        this.setData({ loading: true })
        
        const response = await apiService.getDates(storeId)
        if (response.success && response.dates) {
          this.setData({
            availableDates: response.dates,
            dateIndex: response.dates.length > 0 ? 0 : -1,
            selectedDate: response.dates.length > 0 ? response.dates[0] : '',
            hasData: false
          })
          
          // 保存到全局数据
          if (this.data.selectedDate && this.data.selectedStore) {
            app.setSelectedStore(this.data.selectedStore, this.data.selectedDate)
          }
        } else {
          this.showMessage('加载可用日期失败', 'error')
        }
      } catch (error: any) {
        this.showMessage(`加载可用日期失败: ${error.message}`, 'error')
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
        availableDates: [],
        selectedDate: '',
        hasData: false
      })
      
      if (region) {
        await this.loadStoresByRegion(region)
      }
    },

    // 门店选择
    async onStoreChange(e: any) {
      const index = e.detail.value
      const store = this.data.stores[index]
      this.setData({
        storeIndex: index,
        selectedStore: store,
        availableDates: [],
        selectedDate: '',
        hasData: false
      })
      
      if (store) {
        await this.loadAvailableDates(store.id)
      }
    },

    // 日期选择
    onDateChange(e: any) {
      const index = e.detail.value
      const date = this.data.availableDates[index]
      this.setData({
        dateIndex: index,
        selectedDate: date,
        hasData: false
      })
    },

    // 设置今天
    setToday() {
      const today = Utils.getToday()
      if (this.data.availableDates.includes(today)) {
        const index = this.data.availableDates.indexOf(today)
        this.setData({
          dateIndex: index,
          selectedDate: today
        })
        
        // 保存到全局数据
        app.setSelectedDate(today)
      } else {
        this.showMessage('今天暂无数据', 'warning')
      }
    },

    // 设置昨天
    setYesterday() {
      const yesterday = Utils.getYesterday()
      if (this.data.availableDates.includes(yesterday)) {
        const index = this.data.availableDates.indexOf(yesterday)
        this.setData({
          dateIndex: index,
          selectedDate: yesterday
        })
        
        // 保存到全局数据
        app.setSelectedDate(yesterday)
      } else {
        this.showMessage('昨天暂无数据', 'warning')
      }
    },

    // 加载数据
    async loadData() {
      if (!this.data.selectedStore || !this.data.selectedDate) {
        this.showMessage('请选择门店和日期', 'warning')
        return
      }

      try {
        this.setData({ loading: true })
        
        const response = await apiService.getStats(this.data.selectedStore.id, this.data.selectedDate)
        if (response.success && response.data) {
          // 适配新的API数据格式
          const data = response.data
          const realTime = data.real_time || {}
          const stats = data.stats || {}
          
          this.setData({
            stats: {
              currentQueueCount: realTime.current_queue_count || '-',
              currentWaitTime: realTime.current_wait_time || '-',
              avgCalls: stats.avg_calls?.toFixed(1) || '-',
              maxCalls: stats.max_calls || '-',
              avgNewTickets: stats.avg_new_tickets?.toFixed(1) || '-',
              maxNewTickets: stats.max_new_tickets || '-'
            },
            hasData: true
          })
          
          // 保存到全局数据
          app.setSelectedStore(this.data.selectedStore, this.data.selectedDate)
          
          this.showMessage('数据更新成功', 'success')
        } else {
          // 根据错误类型显示不同的提示信息
          const errorObj = { message: response.message || '数据加载失败' }
          this.handleDataError(errorObj)
        }
      } catch (error: any) {
        this.handleDataError(error)
      } finally {
        this.setData({ loading: false })
      }
    },

    // 处理数据加载错误
    handleDataError(error: any) {
      let userMessage = ''
      let messageType = 'error'
      let showModal = false
      
      // 优先使用错误码进行处理
      if (error.errorCode) {
        switch (error.errorCode) {
          case 'STORE_CLOSED':
            userMessage = '该店铺在选择的日期期间未营业，请尝试选择其他日期查询'
            messageType = 'warning'
            showModal = true
            break
          case 'NO_QUEUE_NEEDED':
            userMessage = '该店铺目前不需要排队，您可以直接前往就餐 🎉'
            messageType = 'success'
            showModal = true
            break
          case 'CALCULATION_ERROR':
            userMessage = '无法计算统计信息，数据格式可能有问题'
            messageType = 'error'
            break
          default:
            userMessage = error.message || '未知错误'
            messageType = 'error'
        }
      } else {
        // 回退到原有的文本匹配方式
        const errorMessage = error.message || error.toString()
        userMessage = errorMessage
        
        if (errorMessage.includes('该店铺在选择的日期期间未营业')) {
          userMessage = '该店铺在选择的日期期间未营业，请尝试选择其他日期查询'
          messageType = 'warning'
          showModal = true
        } else if (errorMessage.includes('该店铺目前不需要排队')) {
          userMessage = '该店铺目前不需要排队，您可以直接前往就餐 🎉'
          messageType = 'success'
          showModal = true
        } else if (errorMessage.includes('网络连接失败') || errorMessage.includes('网络请求失败')) {
          userMessage = '网络连接失败，请检查网络设置后重试'
          messageType = 'error'
        } else if (errorMessage.includes('HTTP 500')) {
          userMessage = '服务器暂时无法处理请求，请稍后重试'
          messageType = 'error'
        } else if (errorMessage.includes('HTTP 422')) {
          userMessage = '数据查询失败，请检查选择的门店和日期是否正确'
          messageType = 'warning'
        } else if (errorMessage.includes('HTTP 404')) {
          userMessage = '未找到相关数据，请检查门店信息或选择其他日期'
          messageType = 'warning'
        }
      }
      
      // 根据错误类型决定显示方式
      if (showModal) {
        this.showErrorModal(userMessage, messageType)
      } else {
        this.showMessage(userMessage, messageType)
      }
    },

    // 显示错误弹窗
    showErrorModal(message: string, type: string = 'error') {
      const title = type === 'success' ? '提示' : type === 'warning' ? '注意' : '错误'
      const icon = type === 'success' ? 'success' : type === 'warning' ? 'none' : 'error'
      
      wx.showModal({
        title: title,
        content: message,
        showCancel: false,
        confirmText: '知道了',
        confirmColor: type === 'success' ? '#07c160' : type === 'warning' ? '#ff9500' : '#fa5151'
      })
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
    },

    // 打开网页版图表
    openWebChart() {
      const url = 'https://sushiro.chinatsu1124.com'
      
      // 复制链接到剪贴板
      wx.setClipboardData({
        data: url,
        success: () => {
          wx.showModal({
            title: '链接已复制',
            content: '网页版图表链接已复制到剪贴板，请在浏览器中打开查看详细图表分析。',
            showCancel: false,
            confirmText: '知道了'
          })
        },
        fail: () => {
          wx.showModal({
            title: '网页版图表',
            content: `请在浏览器中访问：\n${url}\n\n查看完整的数据趋势图表和深度分析`,
            showCancel: false,
            confirmText: '知道了'
          })
        }
      })
    },

    // 处理分享参数
    handleShareParameters() {
      const pages = getCurrentPages()
      const currentPage = pages[pages.length - 1]
      const options = currentPage.options
      
      if (options && options.store_id && options.date) {
        // 从分享链接打开，保存参数稍后处理
        this.setData({
          shareStoreId: parseInt(options.store_id),
          shareDate: options.date
        })
      }
    },

    // 转发分享
    onShareAppMessage() {
      const { selectedStore, selectedDate } = this.data
      let title = '寿司郎取号小助手'
      let path = 'pages/index/index'
      
      if (selectedStore) {
        title = `${selectedStore.name} - 寿司郎取号小助手`
        if (selectedDate) {
          path = `pages/index/index?store_id=${selectedStore.id}&date=${selectedDate}`
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
      const { selectedStore } = this.data
      let title = '寿司郎取号小助手 - 实时查看等待时间'
      
      if (selectedStore) {
        title = `${selectedStore.name} - 寿司郎取号小助手`
      }
      
      return {
        title: title,
        query: '',
        imageUrl: '' // 使用默认分享图片
      }
    }
  }
})
