// utils/api.ts
// API服务工具

// 配置信息
const CONFIG = {
  API_BASE_URL: 'https://sushiro.chinatsu1124.com', // 生产环境地址
  // API_BASE_URL: 'http://localhost:8765', // 本地测试地址
  // 备用地址列表
  FALLBACK_URLS: [
    'https://sushiro.chinatsu1124.com',
    'http://sushiro.chinatsu1124.com',
    'http://localhost:8765'
  ]
}

export interface Store {
  id: number
  name: string
  region?: string
}

export interface StatsData {
  current_queue_count: number
  current_wait_time: number
  avg_calls_per_minute: number
  max_calls_per_minute: number
  avg_new_tickets_per_minute: number
  max_new_tickets_per_minute: number
}

export interface ChartData {
  time: string[]
  waitTime: number[]
  calls: number[]
  newTickets: number[]
}

export interface AnalysisResult {
  estimated_wait_time: number
  estimated_queue_count: number
  suggestion: string
  avg_wait_time: number
  max_wait_time: number
  min_wait_time: number
  data_points: number
  best_times?: Array<{
    time: string
    waitTime: number
  }>
}

class ApiService {
  // 通用请求方法
  private request(url: string, options: any = {}): Promise<any> {
    return new Promise((resolve, reject) => {
      const fullUrl = `${CONFIG.API_BASE_URL}${url}`
      console.log('API Request:', fullUrl)
      
      wx.request({
        url: fullUrl,
        method: options.method || 'GET',
        data: options.data || {},
        header: {
          'content-type': 'application/json',
          ...options.header
        },
        success: (res) => {
          console.log('API Response:', res.statusCode, res.data)
          if (res.statusCode === 200) {
            resolve(res.data)
          } else {
            console.error('API Error:', res.statusCode, res.data)
            // 创建包含错误码的错误对象
            const error = new Error(`HTTP ${res.statusCode}: ${res.data?.error || res.data?.message || '服务器错误'}`) as any
            error.statusCode = res.statusCode
            error.errorCode = res.data?.error_code
            error.errorData = res.data
            reject(error)
          }
        },
        fail: (error) => {
          console.error('Network Error:', error)
          reject(new Error(error.errMsg || '网络连接失败，请检查网络设置'))
        }
      })
    })
  }

  // 获取地区列表
  async getRegions(): Promise<{ success: boolean; regions: string[]; message?: string }> {
    try {
      const response = await this.request('/api/regions')
      // 适配API返回格式：{ regions: [], count: number }
      if (response && response.regions && Array.isArray(response.regions)) {
        return {
          success: true,
          regions: response.regions,
          message: `成功获取${response.count || response.regions.length}个地区`
        }
      } else {
        return { success: false, regions: [], message: 'API返回数据格式错误' }
      }
    } catch (error: any) {
      return { success: false, regions: [], message: error.message }
    }
  }

  // 获取门店列表
  async getStores(region: string): Promise<{ success: boolean; stores: Store[]; message?: string }> {
    try {
      const response = await this.request(`/api/stores?region=${encodeURIComponent(region)}`)
      // 适配API返回格式：{ stores: [], count: number, region: string }
      if (response && response.stores && Array.isArray(response.stores)) {
        return {
          success: true,
          stores: response.stores,
          message: `成功获取${response.count || response.stores.length}个门店`
        }
      } else {
        return { success: false, stores: [], message: 'API返回数据格式错误' }
      }
    } catch (error: any) {
      return { success: false, stores: [], message: error.message }
    }
  }

  // 获取可用日期
  async getDates(storeId: number): Promise<{ success: boolean; dates: string[]; message?: string }> {
    try {
      const response = await this.request(`/api/dates?store_id=${storeId}`)
      // 适配API返回格式：{ store_id: number, dates: [], count: number }
      if (response && response.dates && Array.isArray(response.dates)) {
        return {
          success: true,
          dates: response.dates,
          message: `成功获取${response.count || response.dates.length}个可用日期`
        }
      } else {
        return { success: false, dates: [], message: 'API返回数据格式错误' }
      }
    } catch (error: any) {
      return { success: false, dates: [], message: error.message }
    }
  }

  // 获取统计数据
  async getStats(storeId: number, date: string): Promise<{ success: boolean; data?: StatsData; message?: string }> {
    try {
      const response = await this.request(`/api/data?store_id=${storeId}&start_date=${date}&end_date=${date}`)
      // 适配API返回格式：直接返回数据对象
      if (response && typeof response === 'object' && !response.error) {
        return {
          success: true,
          data: response,
          message: '数据获取成功'
        }
      } else {
        return { 
          success: false, 
          message: response.error || 'API返回数据格式错误' 
        }
      }
    } catch (error: any) {
      return { success: false, message: error.message }
    }
  }

  // 获取图表数据
  async getChartData(storeId: number, date: string): Promise<{ success: boolean; data?: ChartData; message?: string }> {
    try {
      const response = await this.request(`/api/data?store_id=${storeId}&start_date=${date}&end_date=${date}`)
      // 适配API返回格式：从data API中提取图表数据
      if (response && !response.error && response.times && response.wait_data && response.calls_data) {
        const chartData: ChartData = {
          time: response.times || [],
          waitTime: response.wait_data || [],
          calls: response.calls_data || [],
          newTickets: response.new_tickets_data || []
        }
        return {
          success: true,
          data: chartData,
          message: '图表数据获取成功'
        }
      } else {
        return { 
          success: false, 
          message: response.error || '图表数据格式错误' 
        }
      }
    } catch (error: any) {
      return { success: false, message: error.message }
    }
  }

  // 获取就餐分析
  async getDiningAnalysis(storeId: number, diningTime: string): Promise<{ success: boolean; data?: AnalysisResult; message?: string }> {
    try {
      const response = await this.request(`/api/dining-analysis?store_id=${storeId}&dining_time=${diningTime}`)
      // 适配API返回格式：{ store_id, dining_time, analysis_data, statistics }
      if (response && !response.error && response.analysis_data) {
        // 处理分析数据，计算预测值
        const analysisData = response.analysis_data || []
        const statistics = response.statistics || {}
        
        // 计算等待时间（就餐时间 - 预计取号时间）
        const calculateWaitTime = (diningTime: string, issueTime: string): number => {
          try {
            const [diningHour, diningMin] = diningTime.split(':').map(Number)
            const [issueHour, issueMin] = issueTime.split(':').map(Number)
            
            const diningMinutes = diningHour * 60 + diningMin
            const issueMinutes = issueHour * 60 + issueMin
            
            return Math.max(0, diningMinutes - issueMinutes)
          } catch {
            return 0
          }
        }
        
        let totalWaitTime = 0
        let validDataCount = 0
        const waitTimes: number[] = []
        
        // 处理每条历史数据
        analysisData.forEach((item: any) => {
          if (item.estimated_issue_time && item.dining_time) {
            const waitTime = calculateWaitTime(item.dining_time, item.estimated_issue_time)
            waitTimes.push(waitTime)
            totalWaitTime += waitTime
            validDataCount++
          }
        })
        
        const avgWaitTime = validDataCount > 0 ? Math.round(totalWaitTime / validDataCount) : 0
        const maxWaitTime = waitTimes.length > 0 ? Math.max(...waitTimes) : 0
        const minWaitTime = waitTimes.length > 0 ? Math.min(...waitTimes) : 0
        
        // 估算排队人数（基于等待时间，假设每3分钟一个号）
        const estimatedQueueCount = Math.max(0, Math.round(avgWaitTime / 3))
        
        // 生成建议
        let suggestion = '暂无建议'
        if (validDataCount > 0) {
          if (avgWaitTime <= 30) {
            suggestion = '✅ 这个时间段等待时间较短，是就餐的好时机！'
          } else if (avgWaitTime <= 90) {
            suggestion = '⚠️ 这个时间段有一定等待时间，建议提前取号或考虑其他时间。'
          } else {
            suggestion = '❌ 这个时间段等待时间较长，建议选择其他时间就餐。'
          }
          
          // 根据统计数据提供更详细的建议
          if (statistics.avg_issue_time) {
            suggestion += `\n💡 历史平均取号时间：${statistics.avg_issue_time}`
          }
        }
        
        const result: AnalysisResult = {
          estimated_wait_time: avgWaitTime,
          estimated_queue_count: estimatedQueueCount,
          suggestion: suggestion,
          avg_wait_time: avgWaitTime,
          max_wait_time: maxWaitTime,
          min_wait_time: minWaitTime,
          data_points: statistics.total_days || analysisData.length,
          best_times: [] // 可以后续扩展
        }
        
        return {
          success: true,
          data: result,
          message: '就餐分析完成'
        }
      } else {
        return { 
          success: false, 
          message: response.error || '分析数据格式错误' 
        }
      }
    } catch (error: any) {
      return { success: false, message: error.message }
    }
  }
}

// 导出单例
export const apiService = new ApiService()

// 工具函数
export class Utils {
  // 格式化日期
  static formatDate(date: Date): string {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // 获取今天日期
  static getToday(): string {
    return this.formatDate(new Date())
  }

  // 获取昨天日期
  static getYesterday(): string {
    return this.formatDate(new Date(Date.now() - 24 * 60 * 60 * 1000))
  }

  // 验证时间格式
  static isTimeInRange(timeString: string): boolean {
    if (!timeString) return false
    
    const [hours, minutes] = timeString.split(':').map(Number)
    const timeMinutes = hours * 60 + minutes
    const startTime = 10 * 60 + 30 // 10:30
    const endTime = 22 * 60 // 22:00
    
    return timeMinutes >= startTime && timeMinutes <= endTime
  }

  // 显示消息提示
  static showToast(title: string, icon: 'success' | 'error' | 'none' = 'none') {
    wx.showToast({
      title,
      icon,
      duration: 2000
    })
  }

  // 显示加载中
  static showLoading(title: string = '加载中...') {
    wx.showLoading({
      title,
      mask: true
    })
  }

  // 隐藏加载中
  static hideLoading() {
    wx.hideLoading()
  }
}
