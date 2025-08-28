// utils/location.ts
// 定位服务工具类

export interface LocationInfo {
  latitude: number
  longitude: number
  city?: string
  province?: string
  district?: string
}

export interface CityDistance {
  city: string
  distance: number
}

export class LocationService {
  // 获取用户位置
  static async getUserLocation(): Promise<LocationInfo | null> {
    return new Promise((resolve) => {
      wx.getLocation({
        type: 'gcj02',
        success: (res) => {
          console.log('获取位置成功:', res)
          resolve({
            latitude: res.latitude,
            longitude: res.longitude
          })
        },
        fail: (error) => {
          console.error('获取位置失败:', error)
          // 如果用户拒绝授权，尝试引导用户打开设置
          if (error.errMsg.includes('auth deny')) {
            wx.showModal({
              title: '定位权限',
              content: '为了为您推荐最近的门店，需要获取您的位置信息。请在设置中开启定位权限。',
              confirmText: '去设置',
              cancelText: '取消',
              success: (modalRes) => {
                if (modalRes.confirm) {
                  wx.openSetting({
                    success: (settingRes) => {
                      if (settingRes.authSetting['scope.userLocation']) {
                        // 用户重新授权后，再次获取位置
                        this.getUserLocation().then(resolve)
                      } else {
                        resolve(null)
                      }
                    }
                  })
                } else {
                  resolve(null)
                }
              }
            })
          } else {
            resolve(null)
          }
        }
      })
    })
  }

  // 通过腾讯地图API获取地址信息
  static async getAddressFromLocation(latitude: number, longitude: number): Promise<LocationInfo | null> {
    return new Promise((resolve) => {
      // 使用微信小程序的逆地理编码API
      wx.request({
        url: 'https://apis.map.qq.com/ws/geocoder/v1/',
        data: {
          location: `${latitude},${longitude}`,
          key: 'YOUR_TENCENT_MAP_KEY', // 需要申请腾讯地图API密钥
          get_poi: 0
        },
        success: (res: any) => {
          if (res.data && res.data.status === 0) {
            const result = res.data.result
            const addressComponent = result.address_component
            resolve({
              latitude,
              longitude,
              province: addressComponent.province,
              city: addressComponent.city,
              district: addressComponent.district
            })
          } else {
            console.error('逆地理编码失败:', res)
            resolve({
              latitude,
              longitude
            })
          }
        },
        fail: (error) => {
          console.error('逆地理编码请求失败:', error)
          resolve({
            latitude,
            longitude
          })
        }
      })
    })
  }

  // 计算两点之间的距离（使用Haversine公式）
  static calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371 // 地球半径（公里）
    const dLat = this.toRadians(lat2 - lat1)
    const dLon = this.toRadians(lon2 - lon1)
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c
  }

  private static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180)
  }

  // 城市坐标映射（主要城市的大概坐标）
  static readonly CITY_COORDINATES: { [key: string]: { lat: number, lon: number } } = {
    '杭州': { lat: 30.2741, lon: 120.1551 },
    '上海': { lat: 31.2304, lon: 121.4737 },
    '北京': { lat: 39.9042, lon: 116.4074 },
    '深圳': { lat: 22.5431, lon: 114.0579 },
    '广州': { lat: 23.1291, lon: 113.2644 },
    '南京': { lat: 32.0603, lon: 118.7969 },
    '苏州': { lat: 31.2989, lon: 120.5853 },
    '成都': { lat: 30.5728, lon: 104.0668 },
    '重庆': { lat: 29.5647, lon: 106.5507 },
    '西安': { lat: 34.3416, lon: 108.9398 },
    '武汉': { lat: 30.5928, lon: 114.3055 },
    '天津': { lat: 39.3434, lon: 117.3616 },
    '青岛': { lat: 36.0986, lon: 120.3719 },
    '大连': { lat: 38.9140, lon: 121.6147 },
    '沈阳': { lat: 41.8057, lon: 123.4315 },
    '济南': { lat: 36.6512, lon: 117.1201 },
    '福州': { lat: 26.0745, lon: 119.2965 },
    '厦门': { lat: 24.4798, lon: 118.0894 },
    '昆明': { lat: 25.0389, lon: 102.7183 },
    '长沙': { lat: 28.2282, lon: 112.9388 },
    '南昌': { lat: 28.6820, lon: 115.8581 },
    '合肥': { lat: 31.8206, lon: 117.2272 },
    '石家庄': { lat: 38.0428, lon: 114.5149 },
    '太原': { lat: 37.8706, lon: 112.5489 },
    '郑州': { lat: 34.7466, lon: 113.6253 },
    '长春': { lat: 43.8171, lon: 125.3235 },
    '哈尔滨': { lat: 45.8038, lon: 126.5349 },
    '兰州': { lat: 36.0611, lon: 103.8343 },
    '银川': { lat: 38.4681, lon: 106.2731 },
    '西宁': { lat: 36.6171, lon: 101.7782 },
    '乌鲁木齐': { lat: 43.8266, lon: 87.6168 }
  }

  // 根据用户位置找到最近的城市
  static findNearestCity(userLocation: LocationInfo, availableCities: string[]): string | null {
    if (!userLocation.latitude || !userLocation.longitude) {
      return null
    }

    let nearestCity = null
    let minDistance = Infinity

    for (const city of availableCities) {
      const cityCoords = this.CITY_COORDINATES[city]
      if (cityCoords) {
        const distance = this.calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          cityCoords.lat,
          cityCoords.lon
        )

        if (distance < minDistance) {
          minDistance = distance
          nearestCity = city
        }
      }
    }

    console.log(`最近的城市: ${nearestCity}, 距离: ${minDistance.toFixed(2)}km`)
    return nearestCity
  }

  // 请求定位权限
  static async requestLocationPermission(): Promise<boolean> {
    return new Promise((resolve) => {
      wx.getSetting({
        success: (res) => {
          if (res.authSetting['scope.userLocation']) {
            // 已经授权
            resolve(true)
          } else if (res.authSetting['scope.userLocation'] === false) {
            // 用户拒绝过，需要引导到设置页面
            wx.showModal({
              title: '定位权限',
              content: '为了为您推荐最近的门店，需要获取您的位置信息。请在设置中开启定位权限。',
              confirmText: '去设置',
              cancelText: '取消',
              success: (modalRes) => {
                if (modalRes.confirm) {
                  wx.openSetting({
                    success: (settingRes) => {
                      resolve(!!settingRes.authSetting['scope.userLocation'])
                    },
                    fail: () => resolve(false)
                  })
                } else {
                  resolve(false)
                }
              }
            })
          } else {
            // 第一次请求授权
            wx.authorize({
              scope: 'scope.userLocation',
              success: () => resolve(true),
              fail: () => resolve(false)
            })
          }
        },
        fail: () => resolve(false)
      })
    })
  }
}
