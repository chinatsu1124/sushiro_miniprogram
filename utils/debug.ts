// debug.ts
// API调试工具

export class DebugUtils {
  // 测试API连接
  static async testApiConnection(baseUrl: string = 'https://sushiro.chinatsu1124.com'): Promise<any> {
    return new Promise((resolve, reject) => {
      const testUrl = `${baseUrl}/api/regions`
      console.log('Testing API connection to:', testUrl)
      
      wx.request({
        url: testUrl,
        method: 'GET',
        timeout: 10000, // 10秒超时
        success: (res) => {
          console.log('Test Result - Status:', res.statusCode)
          console.log('Test Result - Data:', res.data)
          console.log('Test Result - Headers:', res.header)
          
          resolve({
            success: res.statusCode === 200,
            statusCode: res.statusCode,
            data: res.data,
            headers: res.header
          })
        },
        fail: (error) => {
          console.error('Test Failed:', error)
          resolve({
            success: false,
            error: error.errMsg,
            details: error
          })
        }
      })
    })
  }
  
  // 检查网络状态
  static checkNetworkStatus(): Promise<any> {
    return new Promise((resolve) => {
      wx.getNetworkType({
        success: (res) => {
          console.log('Network Type:', res.networkType)
          resolve({
            networkType: res.networkType,
            isConnected: res.networkType !== 'none'
          })
        },
        fail: (error) => {
          console.error('Network Check Failed:', error)
          resolve({
            networkType: 'unknown',
            isConnected: false,
            error: error
          })
        }
      })
    })
  }
  
  // 显示详细的错误信息
  static showDetailedError(error: any, context: string = '') {
    console.error(`[${context}] Detailed Error:`, error)
    
    let errorMessage = '未知错误'
    if (typeof error === 'string') {
      errorMessage = error
    } else if (error.message) {
      errorMessage = error.message
    } else if (error.errMsg) {
      errorMessage = error.errMsg
    }
    
    wx.showModal({
      title: '调试信息',
      content: `${context ? context + ': ' : ''}${errorMessage}`,
      showCancel: false,
      confirmText: '确定'
    })
  }
}

