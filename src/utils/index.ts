import dayjs from 'dayjs'

/**
 * @desc  格式化时间
 * @param {(Object|string|number)} time
 * @param {string} format
 * @returns {string | null}
 */
export function formatDateTime(time = undefined, format = 'YYYY-MM-DD HH:mm:ss') {
  return dayjs(time).format(format)
}

export function formatDate(date = undefined, format = 'YYYY-MM-DD') {
  return formatDateTime(date, format)
}
export function getNowTime() {
  const date = new Date()
  const vYear = date.getFullYear()
  const vMon = date.getMonth() + 1
  const vDay = date.getDate()
  const vHours = date.getHours()
  const vMinutes = date.getMinutes()
  const vSenconds = date.getSeconds()
  return vYear + '' + (vMon < 10 ? '0' + vMon : vMon) + (vDay < 10 ? '0' + vDay : vDay) + vHours + vMinutes + vSenconds
}

export function listTree(list: any, pId: number) {
  const result = []
  const itemMap: any = {}
  for (const item of list) {
    const id = item.id
    const parentId = item.parentId

    if (!itemMap[id]) {
      itemMap[id] = {
        children: []
      }
    }

    itemMap[id] = {
      ...item,
      children: itemMap[id]['children']
    }

    const treeItem = itemMap[id]

    if (parentId === pId) {
      result.push(treeItem)
    } else {
      if (!itemMap[parentId]) {
        itemMap[parentId] = {
          children: []
        }
      }
      itemMap[parentId].children.push(treeItem)
    }
  }
  return result
}
/**
 * 文件单位转换
 * @param {Number} bytes 文件大小（bytes）
 * @param {Number} decimals 小数位 （默认保留 2 位）
 * @return string / number
 */

export function formatBytes(bytes: number, decimals = 2) {
  if (!bytes || bytes === 0) return '0 Bytes'

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']

  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}
export function groupBy(array: any, f: any) {
  const groups: any = {}
  let treeArray: any = []

  array.forEach(function (o: any) {
    const group: any = JSON.stringify(f(o))
    groups[group] = groups[group] || []
    groups[group].push(o)
  })

  treeArray = Object.keys(groups).map(function (group) {
    return groups[group]
  })

  return treeArray.map((item: any, index: any) => {
    return {
      children: item,
      key: '1000000' + index,
      name: item[0].groupName,
      disabled: true
    }
  })
}

export function verifyUrl(val: string) {
  const v = new RegExp(
    '^(?!mailto:)(?:(?:http|https|ftp)://|//)(?:\\S+(?::\\S*)?@)?(?:(?:(?:[1-9]\\d?|1\\d\\d|2[01]\\d|22[0-3])(?:\\.(?:1?\\d{1,2}|2[0-4]\\d|25[0-5])){2}(?:\\.(?:[0-9]\\d?|1\\d\\d|2[0-4]\\d|25[0-4]))|(?:(?:[a-z\\u00a1-\\uffff0-9]+-?)*[a-z\\u00a1-\\uffff0-9]+)(?:\\.(?:[a-z\\u00a1-\\uffff0-9]+-?)*[a-z\\u00a1-\\uffff0-9]+)*(?:\\.(?:[a-z\\u00a1-\\uffff]{2,})))|localhost)(?::\\d{2,5})?(?:(/|\\?|#)[^\\s]*)?$',
    'i'
  )
  return v.test(val)
}

export function formatDuring(mss: number) {
  const days = mss / 1000 / 60 / 60 / 24
  const daysRound = Math.floor(days)
  const hours = mss / 1000 / 60 / 60 - 24 * daysRound
  const hoursRound = Math.floor(hours)
  const minutes = mss / 1000 / 60 - 24 * 60 * daysRound - 60 * hoursRound
  const minutesRound = Math.floor(minutes)
  const seconds = mss / 1000 - 24 * 60 * 60 * daysRound - 60 * 60 * hoursRound - 60 * minutesRound
  return (
    daysRound.toFixed(2) +
    ' 天 ' +
    daysRound.toFixed(2) +
    ' 小时 ' +
    minutesRound.toFixed(2) +
    ' 分钟 ' +
    seconds.toFixed(2) +
    ' 秒 '
  )
}

export function formatMsDuring(totalTime: number) {
  let hour = 0
  let minute = 0
  let second = totalTime

  if (second > 60) {
    minute = second / 60
    second = second % 60
  }

  if (minute > 60) {
    hour = minute / 60
    minute = minute % 60
  }

  // 转换时分秒 00:00:00
  const duration =
    (hour >= 10 ? hour.toFixed(0) : '0' + hour.toFixed(0)) +
    '时' +
    (minute >= 10 ? minute.toFixed(0) : '0' + minute.toFixed(0)) +
    '分' +
    (second >= 10 ? second.toFixed(0) : '0' + second.toFixed(0)) +
    '秒'

  return duration
}

// 对象指定属性转换为数字
export function objectStringToNumber(object: any, keys: string[]) {
  keys.forEach((key) => {
    object[key] = parseFloat(object[key])
  })
}

//产生随机字符串
export function generateMixed(n: any) {
  const chars = [
    '0',
    '1',
    '2',
    '3',
    '4',
    '5',
    '6',
    '7',
    '8',
    '9',
    'A',
    'B',
    'C',
    'D',
    'E',
    'F',
    'G',
    'H',
    'I',
    'J',
    'K',
    'L',
    'M',
    'N',
    'O',
    'P',
    'Q',
    'R',
    'S',
    'T',
    'U',
    'V',
    'W',
    'X',
    'Y',
    'Z'
  ]
  let res = ''
  for (let i = 0; i < n; i++) {
    const id = Math.floor(Math.random() * 36)
    res += chars[id]
  }
  return res
}

// 数组对象排序
export function compare(prop: string | number) {
  return function (obj1: any, obj2: any) {
    let val1 = obj1[prop]
    let val2 = obj2[prop]
    if (!isNaN(Number(val1)) && !isNaN(Number(val2))) {
      val1 = Number(val1)
      val2 = Number(val2)
    }
    if (val1 < val2) {
      return -1
    } else if (val1 > val2) {
      return 1
    } else {
      return 0
    }
  }
}

// 四舍五入保留2位小数（不够位数，则用0替补）
export function keepDecimalFull(num: number, s = 2) {
  let number: any = 0
  num = num * 1
  if (num < 0) {
    number = Math.abs(num)
  } else {
    number = num
  }
  const times = Math.pow(10, s)
  let result = parseFloat(number)

  result = Math.round(accMul(number, times)) / times
  let s_x = result.toString()
  let pos_decimal = s_x.indexOf('.')
  if (pos_decimal < 0) {
    pos_decimal = s_x.length
    s_x += '.'
  }
  while (s_x.length <= pos_decimal + 2) {
    s_x += '0'
  }
  if (num < 0) {
    s_x = '-' + s_x
  }
  return accMul(s_x, 1)
}
export const accMul = (arg1: any, arg2: any) => {
  let m = 0
  let s1 = ''
  let s2 = ''
  if (arg1) {
    s1 = arg1.toString()
  }
  if (arg2) {
    s2 = arg2.toString()
  }
  try {
    if (s1.split('.')[1] !== undefined) {
      m += s1.split('.')[1].length
    }
  } catch (e) {}
  try {
    if (s2.split('.')[1] !== undefined) {
      m += s2.split('.')[1].length
    }
  } catch (e) {}
  return (Number(s1.replace('.', '')) * Number(s2.replace('.', ''))) / Math.pow(10, m)
}

// 十进制经纬度转换为度分秒格式
export function transformDMS(degree: number, direction: string) {
  const D = plusZeroAtHead(Math.floor(degree))
  const M = plusZeroAtHead(Math.floor((degree - D) * 60))
  const S = plusZeroAtHead(Math.floor(((degree - D) * 60 - M) * 60))
  let result = D + '°' + M + '′' + S + '″'

  // 如果是个位数， 则在首位加 0
  function plusZeroAtHead(num: any) {
    if (num > -10 && num < 0) {
      num = '-0' + Math.abs(num)
    }

    if (num > 0 && num < 10) {
      return '0' + num
    }

    return num
  }

  if (direction === 'lon') {
    D > 0 ? (result += 'E') : (result += 'W')
    return result
  }

  if (direction === 'lat') {
    D > 0 ? (result += 'N') : (result += 'S')
    return result
  }

  return result
}

// 根据 -180° - 180° 计算方位
export function getDirection(degree: number) {
  degree = ((((degree + 180) % 360) + 360) % 360) - 180

  const directions = [
    { name: '北', range: [-22.5, 22.5] },
    { name: '东北', range: [22.5, 67.5] },
    { name: '东', range: [67.5, 112.5] },
    { name: '东南', range: [112.5, 157.5] },
    { name: '南', range: [-180, -157.5] },
    { name: '南', range: [157.5, 180] },
    { name: '西南', range: [-157.5, -112.5] },
    { name: '西', range: [-112.5, -67.5] },
    { name: '西北', range: [-67.5, -22.5] }
  ]

  for (const direction of directions) {
    if (degree >= direction.range[0] && degree < direction.range[1]) {
      return direction.name
    }
  }
}

// 根据指定字段将数组转换为对象
export function arrayToObject(arr: any, key: string, value: string) {
  const obj: any = {}
  arr.forEach((item: any) => {
    obj[item[key]] = item[value]
  })
  return obj
}

// 格式化距离
export const formartKilo = (num: number, isCHN: boolean) => {
  if (num < 1000) {
    return `${keepDecimalFull(num, 2)}${isCHN ? '米' : 'm'}`
  } else {
    return `${keepDecimalFull(num / 1000, 2)}${isCHN ? '千米' : 'km'}`
  }
}

export const calcPageCurrent = (total: number, pageSize: number, current: number) => {
  const totalPage = Math.ceil((total - 1) / pageSize)
  const pagenum = current > totalPage ? totalPage : current
  return pagenum < 1 ? 1 : pagenum
}

// 获取不包含IP和端口的URL
export function getUrlWithoutIpPort(url: string | URL) {
  // 1. 解析URL
  const urlObj = new URL(url)
  // 2. 拼接：路径 + 查询参数（带?） + 锚点（带#）
  let result = urlObj.pathname // 路径
  if (urlObj.search) {
    // 查询参数（已包含?，如"?name=test"）
    result += urlObj.search
  }
  if (urlObj.hash) {
    // 锚点（已包含#，如"#detail"）
    result += urlObj.hash
  }
  return result
}
