// food.js
const foodData = [
    {
        time: "2025-03-10",
        city: "台中市",
        district: "沙鹿區",
        storeName: "鹿雅森林",
        category: "景觀餐廳",
        priceLevel: "$$$",
         // 地圖用 (示例座標)
        lat: 24.227327, 
        lng: 120.595054,
        // 各細項評分 (0~100)
        taste: 78,        // 口味
        freshness: 80,    // 食材新鮮度
        texture: 80,      // 口感
        appearance: 82.5,   // 外觀
        smell: 77,        // 氣味
        portion: 75,      // 分量
        uniqueness: 84,   // 獨特性
        price: 82,        // 價格
        environment: 88,  // 環境
        attitude: 90.8,     // 態度
        others: 93,        // 其他
        // ★★ 加入 Google Maps 連結 ★★
        gmapUrl: "https://maps.app.goo.gl/rJto2WZisTTouqYe9"
      },
      {
        time: "2025-03-10",
        city: "台中市",
        district: "龍井區",
        storeName: "啡文學 龍井店",
        category: "景觀餐廳",
        priceLevel: "$$$",
         // 地圖用 (示例座標)
        lat: 24.188923, 
        lng: 120.575486,
        // 各細項評分 (0~100)
        taste: 83,        // 口味
        freshness: 81,    // 食材新鮮度
        texture: 82.5,      // 口感
        appearance: 80,   // 外觀
        smell: 79,        // 氣味
        portion: 80,      // 分量
        uniqueness: 80,   // 獨特性
        price: 82,        // 價格
        environment: 80,  // 環境
        attitude: 83,     // 態度
        others: 88.5,        // 其他
        // ★★ 加入 Google Maps 連結 ★★
        gmapUrl: "https://maps.app.goo.gl/VFDkf78MSV1g5hJw5"
      },
      {
        time: "2025-03-10",
        city: "台中市",
        district: "南區",
        storeName: "咖啡任務 — 總部",
        category: "景觀餐廳",
        priceLevel: "$$$",
         // 地圖用 (示例座標)
        lat: 24.123385, 
        lng: 120.660871,
        // 各細項評分 (0~100)
        taste: 88.5,        // 口味
        freshness: 83,    // 食材新鮮度
        texture: 87,      // 口感
        appearance: 85,   // 外觀
        smell: 86,        // 氣味
        portion: 78.5,      // 分量
        uniqueness: 86,   // 獨特性
        price: 75.5,        // 價格
        environment: 89,  // 環境
        attitude: 80,     // 態度
        others: 86,        // 其他
        // ★★ 加入 Google Maps 連結 ★★
        gmapUrl: "https://maps.app.goo.gl/8xobP82uyg7AnqXc7"
      },
      {
        time: "2025-03-10",
        city: "台北市",
        district: "士林區",
        storeName: "屋頂上",
        category: "景觀餐廳",
        priceLevel: "$$$",
         // 地圖用 (示例座標)
        lat: 25.1334811, 
        lng: 121.536832,
        // 各細項評分 (0~100)
        taste: 85.5,        // 口味
        freshness: 82,    // 食材新鮮度
        texture: 85,      // 口感
        appearance: 89.5,   // 外觀
        smell: 84,        // 氣味
        portion: 79,      // 分量
        uniqueness: 85,   // 獨特性
        price: 73,        // 價格
        environment: 88,  // 環境
        attitude: 82.5,     // 態度
        others: 65,        // 其他
        // ★★ 加入 Google Maps 連結 ★★
        gmapUrl: "https://maps.app.goo.gl/4vkxDir3A82AHkJ5A"
      },
      {
        time: "2025-03-10",
        city: "台北市",
        district: "士林區",
        storeName: "草山夜未眠景觀餐廳",
        category: "景觀餐廳",
        priceLevel: "$$$",
         // 地圖用 (示例座標)
        lat: 25.1339777, 
        lng: 121.5327677,
        // 各細項評分 (0~100)
        taste: 85,        // 口味
        freshness: 82,    // 食材新鮮度
        texture: 85.5,      // 口感
        appearance: 85.5,   // 外觀
        smell: 84,        // 氣味
        portion: 79.5,      // 分量
        uniqueness: 85,   // 獨特性
        price: 74,        // 價格
        environment: 91,  // 環境
        attitude: 90,     // 態度
        others: 84.5,        // 其他
        // ★★ 加入 Google Maps 連結 ★★
        gmapUrl: "https://maps.app.goo.gl/KrLFbgETjgfzKT2x6"
      },
      {
        time: "2025-03-10",
        city: "屏東縣",
        district: "枋山鄉",
        storeName: "魔幻咖啡",
        category: "景觀餐廳",
        priceLevel: "$$$",
         // 地圖用 (示例座標)
        lat: 22.296043, 
        lng: 120.6409869,
        // 各細項評分 (0~100)
        taste: 87,        // 口味
        freshness: 82,    // 食材新鮮度
        texture: 85,      // 口感
        appearance: 85.5,   // 外觀
        smell: 82.5,        // 氣味
        portion: 81,      // 分量
        uniqueness: 82,   // 獨特性
        price: 75,        // 價格
        environment: 90,  // 環境
        attitude: 80,     // 態度
        others: 81.5,        // 其他
        // ★★ 加入 Google Maps 連結 ★★
        gmapUrl: "https://maps.app.goo.gl/FBNbStaSSC89kZC29"
      },
    {
      time: "2025-03-10",
      city: "台南市",
      district: "東區",
      storeName: "阿桂嬤養生湯",
      category: "夜市",
      priceLevel: "$$",
       // 地圖用 (示例座標)
      lat: 22.982575, 
      lng: 120.219317,
      // 各細項評分 (0~100)
      taste: 97.5,        // 口味
      freshness: 90,    // 食材新鮮度
      texture: 90,      // 口感
      appearance: 87,   // 外觀
      smell: 97,        // 氣味
      portion: 89.5,      // 分量
      uniqueness: 85,   // 獨特性
      price: 85,        // 價格
      environment: 85,  // 環境
      attitude: 85.5,     // 態度
      others: 85,        // 其他
      // ★★ 加入 Google Maps 連結 ★★
      gmapUrl: "https://maps.app.goo.gl/hwyrdy2E14PkHSrp7"
    },
    {
        time: "2025-03-10",
        city: "台中市",
        district: "南區",
        storeName: "鴨娘當歸鴨",
        category: "店面",
        priceLevel: "$$",
         // 地圖用 (示例座標)
        lat: 24.129834, 
        lng: 120.682950,
        // 各細項評分 (0~100)
        taste: 87,        // 口味
        freshness: 97,    // 食材新鮮度
        texture: 92,      // 口感
        appearance: 87,   // 外觀
        smell: 90,        // 氣味
        portion: 91.5,      // 分量
        uniqueness: 85,   // 獨特性
        price: 86,        // 價格
        environment: 86,  // 環境
        attitude: 97,     // 態度
        others: 90,        // 其他
        // ★★ 加入 Google Maps 連結 ★★
        gmapUrl: "https://maps.app.goo.gl/5DVdH4tme2sM9DYa7"
      },
      {
        time: "2025-03-10",
        city: "台南市",
        district: "中西區",
        storeName: "下大道蘭米糕",
        category: "店面",
        priceLevel: "$$",
         // 地圖用 (示例座標)
        lat: 22.989864, 
        lng: 120.193899,
        // 各細項評分 (0~100)
        taste: 85,        // 口味
        freshness: 87,    // 食材新鮮度
        texture: 88,      // 口感
        appearance: 90,   // 外觀
        smell: 89,        // 氣味
        portion: 90,      // 分量
        uniqueness: 90,   // 獨特性
        price: 88.5,        // 價格
        environment: 85,  // 環境
        attitude: 85,     // 態度
        others: 85,        // 其他
        // ★★ 加入 Google Maps 連結 ★★
        gmapUrl: "https://maps.app.goo.gl/DyXR6d874Q86c5xXA"
      },
      {
        time: "2025-03-10",
        city: "台南市",
        district: "中西區",
        storeName: "阿蓮牛肉湯-台南公園店",
        category: "店面",
        priceLevel: "$$$",
         // 地圖用 (示例座標)
        lat: 22.994914, 
        lng: 120.205419,
        // 各細項評分 (0~100)
        taste: 86,        // 口味
        freshness: 90,    // 食材新鮮度
        texture: 87,      // 口感
        appearance: 87,   // 外觀
        smell: 87,        // 氣味
        portion: 90,      // 分量
        uniqueness: 88.5,   // 獨特性
        price: 90,        // 價格
        environment: 90,  // 環境
        attitude: 85,     // 態度
        others: 85,        // 其他
        // ★★ 加入 Google Maps 連結 ★★
        gmapUrl: "https://maps.app.goo.gl/YuESVaq61BnMcG5f8"
      },
      {
        time: "2025-03-10",
        city: "台南市",
        district: "中西區",
        storeName: "大勇街無名鹹粥",
        category: "店面",
        priceLevel: "$$",
         // 地圖用 (示例座標)
        lat: 22.989813, 
        lng:  120.193300,
        // 各細項評分 (0~100)
        taste: 88,        // 口味
        freshness: 88,    // 食材新鮮度
        texture: 85.5,      // 口感
        appearance: 87,   // 外觀
        smell: 83,        // 氣味
        portion: 87,      // 分量
        uniqueness: 85,   // 獨特性
        price: 86,        // 價格
        environment: 82,  // 環境
        attitude: 85,     // 態度
        others: 85,        // 其他
        // ★★ 加入 Google Maps 連結 ★★
        gmapUrl: "https://maps.app.goo.gl/6xvyCiFyx8k3mLPv7"
      },
      {
        time: "2025-03-10",
        city: "台南市",
        district: "中西區",
        storeName: "阿川紅燒青蛙（方家老牌炒鱔魚）",
        category: "店面",
        priceLevel: "$$",
         // 地圖用 (示例座標)
        lat: 22.998888, 
        lng:  120.200684,
        // 各細項評分 (0~100)
        taste: 85,        // 口味
        freshness: 85.5,    // 食材新鮮度
        texture: 85,      // 口感
        appearance: 83.5,   // 外觀
        smell: 85.5,        // 氣味
        portion: 85.5,      // 分量
        uniqueness: 85,   // 獨特性
        price: 85,        // 價格
        environment: 82.5,  // 環境
        attitude: 88,     // 態度
        others: 87,        // 其他
        // ★★ 加入 Google Maps 連結 ★★
        gmapUrl: "https://maps.app.goo.gl/tNfxtAzhmupsTbSCA"
      },
      {
        time: "2025-03-10",
        city: "台南市",
        district: "中西區",
        storeName: "集品蝦仁飯",
        category: "店面",
        priceLevel: "$$",
         // 地圖用 (示例座標)
        lat: 22.990217, 
        lng:  120.195199,
        // 各細項評分 (0~100)
        taste: 88,        // 口味
        freshness: 83,    // 食材新鮮度
        texture: 84.5,      // 口感
        appearance: 86,   // 外觀
        smell: 85,        // 氣味
        portion: 82.5,      // 分量
        uniqueness: 86.5,   // 獨特性
        price: 84,        // 價格
        environment: 79,  // 環境
        attitude: 82,     // 態度
        others: 82,        // 其他
        // ★★ 加入 Google Maps 連結 ★★
        gmapUrl: "https://maps.app.goo.gl/u3cBtLV5pM7NbYgs8"
      },
      {
        time: "2025-03-10",
        city: "台中市",
        district: "南區",
        storeName: "老陳海南雞飯 復興總店",
        category: "店面",
        priceLevel: "$$$",
         // 地圖用 (示例座標)
        lat: 24.132236, 
        lng:  120.677916,
        // 各細項評分 (0~100)
        taste: 85.5,        // 口味
        freshness: 85,    // 食材新鮮度
        texture: 82.5,      // 口感
        appearance: 87,   // 外觀
        smell: 83.5,        // 氣味
        portion: 86,      // 分量
        uniqueness: 82.5,   // 獨特性
        price: 81.5,        // 價格
        environment: 85,  // 環境
        attitude: 83.5,     // 態度
        others: 84,        // 其他
        // ★★ 加入 Google Maps 連結 ★★
        gmapUrl: "https://maps.app.goo.gl/RyA4Pc3uVtQVpmQH9"
      },
      {
        time: "2025-03-10",
        city: "台南市",
        district: "中西區",
        storeName: "矮仔成蝦仁飯",
        category: "店面",
        priceLevel: "$$",
         // 地圖用 (示例座標)
        lat: 22.989013, 
        lng:  120.195156,
        // 各細項評分 (0~100)
        taste: 84.5,        // 口味
        freshness: 83,    // 食材新鮮度
        texture: 85,      // 口感
        appearance: 83.5,   // 外觀
        smell: 82.5,        // 氣味
        portion: 81,      // 分量
        uniqueness: 86.5,   // 獨特性
        price: 82,        // 價格
        environment: 90,  // 環境
        attitude: 89,     // 態度
        others: 83,        // 其他
        // ★★ 加入 Google Maps 連結 ★★
        gmapUrl: "https://maps.app.goo.gl/hMMFhydaDtig4P6i8"
      },
      {
        time: "2025-03-10",
        city: "台南市",
        district: "中西區",
        storeName: "品味鱔魚意麵",
        category: "店面",
        priceLevel: "$$$",
         // 地圖用 (示例座標)
        lat: 22.991815, 
        lng:  120.195307,
        // 各細項評分 (0~100)
        taste: 85.5,        // 口味
        freshness: 85.5,    // 食材新鮮度
        texture: 84.5,      // 口感
        appearance: 83,   // 外觀
        smell: 84,        // 氣味
        portion: 83,      // 分量
        uniqueness: 83.5,   // 獨特性
        price: 83,        // 價格
        environment: 81,  // 環境
        attitude: 82,     // 態度
        others: 82,        // 其他
        // ★★ 加入 Google Maps 連結 ★★
        gmapUrl: "https://maps.app.goo.gl/pzNKGh76vQZRGAvh6"
      },
      {
        time: "2025-03-10",
        city: "高雄市",
        district: "前金區",
        storeName: "黃家粉圓冰",
        category: "冰甜品",
        priceLevel: "$$",
         // 地圖用 (示例座標)
        lat: 22.634270, 
        lng:  120.292613,
        // 各細項評分 (0~100)
        taste: 87.5,        // 口味
        freshness: 86,    // 食材新鮮度
        texture: 84,      // 口感
        appearance: 77.5,   // 外觀
        smell: 80,        // 氣味
        portion: 83.5,      // 分量
        uniqueness: 76.5,   // 獨特性
        price: 88.5,        // 價格
        environment: 83,  // 環境
        attitude: 82,     // 態度
        others: 82,        // 其他
        // ★★ 加入 Google Maps 連結 ★★
        gmapUrl: "https://maps.app.goo.gl/33kCsCyUNQyA68N29"
      },
      {
        time: "2025-03-10",
        city: "台中市",
        district: "南區",
        storeName: "味全米糕",
        category: "店面",
        priceLevel: "$$",
         // 地圖用 (示例座標)
        lat: 24.129439, 
        lng:  120.681417,
        // 各細項評分 (0~100)
        taste: 85.5,        // 口味
        freshness: 83.5,    // 食材新鮮度
        texture: 82.5,      // 口感
        appearance: 82.5,   // 外觀
        smell: 84,        // 氣味
        portion: 80.5,      // 分量
        uniqueness: 83.5,   // 獨特性
        price: 83.5,        // 價格
        environment: 79,  // 環境
        attitude: 82,     // 態度
        others: 76,        // 其他
        // ★★ 加入 Google Maps 連結 ★★
        gmapUrl: "https://maps.app.goo.gl/F35PnEyxqfHqdfYh6"
      },
      {
        time: "2025-03-10",
        city: "桃園市",
        district: "中壢區",
        storeName: "源記牛肉麵",
        category: "店面",
        priceLevel: "$$$",
         // 地圖用 (示例座標)
        lat: 24.955932, 
        lng:  121.225533,
        // 各細項評分 (0~100)
        taste: 83,        // 口味
        freshness: 82,    // 食材新鮮度
        texture: 80,      // 口感
        appearance: 81,   // 外觀
        smell: 84.5,        // 氣味
        portion: 85,      // 分量
        uniqueness: 82.5,   // 獨特性
        price: 85,        // 價格
        environment: 83,  // 環境
        attitude: 90,     // 態度
        others: 80,        // 其他
        // ★★ 加入 Google Maps 連結 ★★
        gmapUrl: "https://maps.app.goo.gl/nXziVPdVVk3cjrDz7"
      },
      {
        time: "2025-03-10",
        city: "台南市",
        district: "中西區",
        storeName: "八寶彬 圓仔惠",
        category: "冰甜品",
        priceLevel: "$$",
         // 地圖用 (示例座標)
        lat: 22.990444, 
        lng:  120.196709,
        // 各細項評分 (0~100)
        taste: 84,        // 口味
        freshness: 84,    // 食材新鮮度
        texture: 82.5,      // 口感
        appearance: 82.5,   // 外觀
        smell: 83,        // 氣味
        portion: 82,      // 分量
        uniqueness: 79,   // 獨特性
        price: 83,        // 價格
        environment: 82,  // 環境
        attitude: 84,     // 態度
        others: 82,        // 其他
        // ★★ 加入 Google Maps 連結 ★★
        gmapUrl: "https://maps.app.goo.gl/5aLsKukofUJGGeqTA"
      },
      {
        time: "2025-03-10",
        city: "台北市",
        district: "中山區",
        storeName: "重‧烘爐火炭羊肉爐",
        category: "店面",
        priceLevel: "$$$$",
         // 地圖用 (示例座標)
        lat: 25.064291, 
        lng:  121.535032,
        // 各細項評分 (0~100)
        taste: 85,        // 口味
        freshness: 85,    // 食材新鮮度
        texture: 82.5,      // 口感
        appearance: 85,   // 外觀
        smell: 83,        // 氣味
        portion: 79.5,      // 分量
        uniqueness: 88,   // 獨特性
        price: 78,        // 價格
        environment: 79,  // 環境
        attitude: 80,     // 態度
        others: 82,        // 其他
        // ★★ 加入 Google Maps 連結 ★★
        gmapUrl: "https://maps.app.goo.gl/xe8Fu8Pxcf1XzgMV9"
      },
      {
        time: "2025-03-10",
        city: "台中市",
        district: "南區",
        storeName: "品味牛肉麵/紅燒原汁牛肉麵",
        category: "店面",
        priceLevel: "$$$",
         // 地圖用 (示例座標)
        lat: 24.125251, 
        lng:  120.667938,
        // 各細項評分 (0~100)
        taste: 83,        // 口味
        freshness: 84,    // 食材新鮮度
        texture: 83.5,      // 口感
        appearance: 82,   // 外觀
        smell: 81,        // 氣味
        portion: 80.5,      // 分量
        uniqueness: 81.5,   // 獨特性
        price: 84,        // 價格
        environment: 78.5,  // 環境
        attitude: 78,     // 態度
        others: 80,        // 其他
        // ★★ 加入 Google Maps 連結 ★★
        gmapUrl: "https://maps.app.goo.gl/96qg16ww6etqg5SJ9"
      },
      {
        time: "2025-03-10",
        city: "台南市",
        district: "中西區",
        storeName: "邱家小卷米粉",
        category: "店面",
        priceLevel: "$$$",
         // 地圖用 (示例座標)
        lat: 22.999207, 
        lng:  120.199649,
        // 各細項評分 (0~100)
        taste: 83.5,        // 口味
        freshness: 80,    // 食材新鮮度
        texture: 80.5,      // 口感
        appearance: 82.5,   // 外觀
        smell: 83.5,        // 氣味
        portion: 83,      // 分量
        uniqueness: 82.5,   // 獨特性
        price: 81,        // 價格
        environment: 80,  // 環境
        attitude: 83,     // 態度
        others: 82,        // 其他
        // ★★ 加入 Google Maps 連結 ★★
        gmapUrl: "https://maps.app.goo.gl/6dF6zQqGwa8uuaS87"
      },
      {
        time: "2025-03-10",
        city: "台中市",
        district: "南區",
        storeName: "春美牛肉麵",
        category: "店面",
        priceLevel: "$$$",
         // 地圖用 (示例座標)
        lat: 24.124384, 
        lng:  120.670193,
        // 各細項評分 (0~100)
        taste: 86,        // 口味
        freshness: 84,    // 食材新鮮度
        texture: 84,      // 口感
        appearance: 82.5,   // 外觀
        smell: 82.5,        // 氣味
        portion: 80.5,      // 分量
        uniqueness: 82.5,   // 獨特性
        price: 84,        // 價格
        environment: 75,  // 環境
        attitude: 76,     // 態度
        others: 70,        // 其他
        // ★★ 加入 Google Maps 連結 ★★
        gmapUrl: "https://maps.app.goo.gl/h5WbkimmjdQgQNSH6"
      },
      {
        time: "2025-03-10",
        city: "台南市",
        district: "中西區",
        storeName: "阿堂鹹粥",
        category: "店面",
        priceLevel: "$$$",
         // 地圖用 (示例座標)
        lat: 22.9899117, 
        lng:  120.195373,
        // 各細項評分 (0~100)
        taste: 81.5,        // 口味
        freshness: 82.5,    // 食材新鮮度
        texture: 81,      // 口感
        appearance: 83.5,   // 外觀
        smell: 80,        // 氣味
        portion: 81,      // 分量
        uniqueness: 85,   // 獨特性
        price: 79,        // 價格
        environment: 81.5,  // 環境
        attitude: 83,     // 態度
        others: 85,        // 其他
        // ★★ 加入 Google Maps 連結 ★★
        gmapUrl: "https://maps.app.goo.gl/6LUAdVSUJns12qvq8"
      },
      {
        time: "2025-03-10",
        city: "台中市",
        district: "豐原區",
        storeName: "廟東清水排骨麵店",
        category: "店面",
        priceLevel: "$$",
         // 地圖用 (示例座標)
        lat: 24.2511364, 
        lng:  120.7166141,
        // 各細項評分 (0~100)
        taste: 87,        // 口味
        freshness: 83,    // 食材新鮮度
        texture: 82.5,      // 口感
        appearance: 85,   // 外觀
        smell: 89,        // 氣味
        portion: 79.5,      // 分量
        uniqueness: 82,   // 獨特性
        price: 80,        // 價格
        environment: 67,  // 環境
        attitude: 78,     // 態度
        others: 65,        // 其他
        // ★★ 加入 Google Maps 連結 ★★
        gmapUrl: "https://maps.app.goo.gl/7dnmmw2At1jjuQGy9"
      },
      {
        time: "2025-03-10",
        city: "台南市",
        district: "中西區",
        storeName: "海安牛肉食堂",
        category: "店面",
        priceLevel: "$$$",
         // 地圖用 (示例座標)
        lat: 22.9884109, 
        lng:  120.1920725,
        // 各細項評分 (0~100)
        taste: 81.5,        // 口味
        freshness: 82,    // 食材新鮮度
        texture: 78,      // 口感
        appearance: 80,   // 外觀
        smell: 81.5,        // 氣味
        portion: 81.5,      // 分量
        uniqueness: 80,   // 獨特性
        price: 80,        // 價格
        environment: 85,  // 環境
        attitude: 82.5,     // 態度
        others: 85,        // 其他
        // ★★ 加入 Google Maps 連結 ★★
        gmapUrl: "https://maps.app.goo.gl/oEA8H6Lwvui4NGtP8"
      },
      {
        time: "2025-03-10",
        city: "台中市",
        district: "南區",
        storeName: "王將藥燉排骨",
        category: "店面",
        priceLevel: "$$$",
         // 地圖用 (示例座標)
        lat: 24.1259306, 
        lng:  120.660582,
        // 各細項評分 (0~100)
        taste: 86,        // 口味
        freshness: 80,    // 食材新鮮度
        texture: 80,      // 口感
        appearance: 81,   // 外觀
        smell: 84,        // 氣味
        portion: 82,      // 分量
        uniqueness: 80,   // 獨特性
        price: 81,        // 價格
        environment: 75,  // 環境
        attitude: 77,     // 態度
        others: 74,        // 其他
        // ★★ 加入 Google Maps 連結 ★★
        gmapUrl: "https://maps.app.goo.gl/HL7ekKzP2ZdaEX5ZA"
      },
      {
        time: "2025-03-10",
        city: "桃園市",
        district: "中壢區",
        storeName: "御冠園鮮肉湯包專賣店",
        category: "夜市",
        priceLevel: "$$",
         // 地圖用 (示例座標)
        lat: 24.9556584, 
        lng:  121.2380475,
        // 各細項評分 (0~100)
        taste: 82.5,        // 口味
        freshness: 81,    // 食材新鮮度
        texture: 80,      // 口感
        appearance: 82.5,   // 外觀
        smell: 81,        // 氣味
        portion: 81,      // 分量
        uniqueness: 80,   // 獨特性
        price: 80,        // 價格
        environment: 77,  // 環境
        attitude: 80,     // 態度
        others: 79,        // 其他
        // ★★ 加入 Google Maps 連結 ★★
        gmapUrl: "https://maps.app.goo.gl/VpeR3KjXCtVNrVfRA"
      },
      {
        time: "2025-03-10",
        city: "台南市",
        district: "中西區",
        storeName: "葉家小卷米粉",
        category: "店面",
        priceLevel: "$$$",
         // 地圖用 (示例座標)
        lat: 22.9910754, 
        lng:  120.1943792,
        // 各細項評分 (0~100)
        taste: 84,        // 口味
        freshness: 69,    // 食材新鮮度
        texture: 79,      // 口感
        appearance: 82.5,   // 外觀
        smell: 82.5,        // 氣味
        portion: 83,      // 分量
        uniqueness: 82,   // 獨特性
        price: 82,        // 價格
        environment: 80,  // 環境
        attitude: 81.5,     // 態度
        others: 80.5,        // 其他
        // ★★ 加入 Google Maps 連結 ★★
        gmapUrl: "https://maps.app.goo.gl/kfdwMpTkpk5dtCCy7"
      },
      {
        time: "2025-03-10",
        city: "台中市",
        district: "南區",
        storeName: "清一色牛肉麵 興大店",
        category: "店面",
        priceLevel: "$$$",
         // 地圖用 (示例座標)
        lat: 24.126088, 
        lng:  120.675216,
        // 各細項評分 (0~100)
        taste: 77.5,        // 口味
        freshness: 80,    // 食材新鮮度
        texture: 82,      // 口感
        appearance: 82.5,   // 外觀
        smell: 80,        // 氣味
        portion: 85,      // 分量
        uniqueness: 81,   // 獨特性
        price: 73,        // 價格
        environment: 80,  // 環境
        attitude: 80,     // 態度
        others: 85,        // 其他
        // ★★ 加入 Google Maps 連結 ★★
        gmapUrl: "https://maps.app.goo.gl/ADyaHuqh8aQcjdde7"
      },
      {
        time: "2025-03-10",
        city: "台中市",
        district: "南區",
        storeName: "聞香牛肉麵",
        category: "店面",
        priceLevel: "$$$",
         // 地圖用 (示例座標)
        lat: 24.125935, 
        lng:  120.675131,
        // 各細項評分 (0~100)
        taste: 77,        // 口味
        freshness: 80,    // 食材新鮮度
        texture: 78,      // 口感
        appearance: 80,   // 外觀
        smell: 82,        // 氣味
        portion: 85.5,      // 分量
        uniqueness: 82.5,   // 獨特性
        price: 74,        // 價格
        environment: 78,  // 環境
        attitude: 78.5,     // 態度
        others: 85,        // 其他
        // ★★ 加入 Google Maps 連結 ★★
        gmapUrl: "https://maps.app.goo.gl/vtRai2dAsoKZAnzy9"
      },
      {
        time: "2025-03-10",
        city: "台南市",
        district: "東區",
        storeName: "鴻牛溫體牛肉湯-東寧店",
        category: "店面",
        priceLevel: "$$$",
         // 地圖用 (示例座標)
        lat: 22.989624, 
        lng:  120.228977,
        // 各細項評分 (0~100)
        taste: 79,        // 口味
        freshness: 82,    // 食材新鮮度
        texture: 75,      // 口感
        appearance: 74,   // 外觀
        smell: 80,        // 氣味
        portion: 81,      // 分量
        uniqueness: 81,   // 獨特性
        price: 77,        // 價格
        environment: 80,  // 環境
        attitude: 80,     // 態度
        others: 84,        // 其他
        // ★★ 加入 Google Maps 連結 ★★
        gmapUrl: "https://maps.app.goo.gl/mq7RuLgYVmxrNYrC8"
      },
      {
        time: "2025-03-10",
        city: "台南市",
        district: "中西區",
        storeName: "大岡山羊肉專家",
        category: "店面",
        priceLevel: "$$$",
         // 地圖用 (示例座標)
        lat: 22.995503, 
        lng:  120.196399,
        // 各細項評分 (0~100)
        taste: 76.5,        // 口味
        freshness: 78,    // 食材新鮮度
        texture: 75,      // 口感
        appearance: 76.5,   // 外觀
        smell: 79,        // 氣味
        portion: 82,      // 分量
        uniqueness: 81.5,   // 獨特性
        price: 79,        // 價格
        environment: 80,  // 環境
        attitude: 79,     // 態度
        others: 85,        // 其他
        // ★★ 加入 Google Maps 連結 ★★
        gmapUrl: "https://maps.app.goo.gl/8BqbKxKLe2BmXpP69"
      },
      {
        time: "2025-03-10",
        city: "台中市",
        district: "南區",
        storeName: "西濱蛋炒飯-脆皮蚵仔煎",
        category: "店面",
        priceLevel: "$$",
         // 地圖用 (示例座標)
        lat: 24.127536, 
        lng:  120.676905,
        // 各細項評分 (0~100)
        taste: 77.5,        // 口味
        freshness: 83,    // 食材新鮮度
        texture: 82,      // 口感
        appearance: 78.5,   // 外觀
        smell: 78.5,        // 氣味
        portion: 81.5,      // 分量
        uniqueness: 78,   // 獨特性
        price: 85,        // 價格
        environment: 80,  // 環境
        attitude: 76.5,     // 態度
        others: 84,        // 其他
        // ★★ 加入 Google Maps 連結 ★★
        gmapUrl: "https://maps.app.goo.gl/q2oVUYRxRa3iSgKN6"
      },
      {
        time: "2025-03-10",
        city: "台中市",
        district: "南區",
        storeName: "正記北港香菇肉羹/炒飯",
        category: "店面",
        priceLevel: "$$",
         // 地圖用 (示例座標)
        lat: 24.128849, 
        lng:  120.674059,
        // 各細項評分 (0~100)
        taste: 84.1,        // 口味
        freshness: 84.7,    // 食材新鮮度
        texture: 83,      // 口感
        appearance: 76,   // 外觀
        smell: 80,        // 氣味
        portion: 81.5,      // 分量
        uniqueness: 79,   // 獨特性
        price: 94,        // 價格
        environment: 70,  // 環境
        attitude: 75,     // 態度
        others: 82.5,        // 其他
        // ★★ 加入 Google Maps 連結 ★★
        gmapUrl: "https://maps.app.goo.gl/9PUUv4qqhXvLbgCT8"
      },
      {
        time: "2025-03-10",
        city: "台中市",
        district: "南區",
        storeName: "八十八號牛排",
        category: "夜市",
        priceLevel: "$$$",
         // 地圖用 (示例座標)
        lat: 24.128647, 
        lng:  120.679805,
        // 各細項評分 (0~100)
        taste: 85,        // 口味
        freshness: 86,    // 食材新鮮度
        texture: 86,      // 口感
        appearance: 83,   // 外觀
        smell: 86,        // 氣味
        portion: 90,      // 分量
        uniqueness: 73,   // 獨特性
        price: 83,        // 價格
        environment: 74,  // 環境
        attitude: 82,     // 態度
        others: 80,        // 其他
        // ★★ 加入 Google Maps 連結 ★★
        gmapUrl: "https://maps.app.goo.gl/kaeQSKVGKR2EQ4JB9"
      },
      {
        time: "2025-03-10",
        city: "台中市",
        district: "南區",
        storeName: "德洲牛排",
        category: "夜市",
        priceLevel: "$$$",
         // 地圖用 (示例座標)
        lat: 24.128943, 
        lng:  120.680272,
        // 各細項評分 (0~100)
        taste: 81.5,        // 口味
        freshness: 86.8,    // 食材新鮮度
        texture: 83.5,      // 口感
        appearance: 83.3,   // 外觀
        smell: 83,        // 氣味
        portion: 80,      // 分量
        uniqueness: 70,   // 獨特性
        price:79,        // 價格
        environment: 75,  // 環境
        attitude: 82,     // 態度
        others: 80,        // 其他
        // ★★ 加入 Google Maps 連結 ★★
        gmapUrl: "https://maps.app.goo.gl/HLYNHRkigEAZ4s4q7"
      },
      {
        time: "2025-03-10",
        city: "台中市",
        district: "南區",
        storeName: "越南安安河粉米線專賣店",
        category: "店面",
        priceLevel: "$$$",
         // 地圖用 (示例座標)
        lat: 24.125683, 
        lng:  120.675478,
        // 各細項評分 (0~100)
        taste: 82.8,        // 口味
        freshness: 87,    // 食材新鮮度
        texture: 82.5,      // 口感
        appearance: 85.5,   // 外觀
        smell: 84.5,        // 氣味
        portion: 85,      // 分量
        uniqueness: 77,   // 獨特性
        price:81,        // 價格
        environment: 87,  // 環境
        attitude: 85.9,     // 態度
        others: 83,        // 其他
        // ★★ 加入 Google Maps 連結 ★★
        gmapUrl: "https://maps.app.goo.gl/P4EuHZ9ZjxrrwPYeA"
      },
      {
        time: "2025-03-10",
        city: "台中市",
        district: "南區",
        storeName: "沙茶魷魚焿",
        category: "夜市",
        priceLevel: "$$",
         // 地圖用 (示例座標)
        lat: 24.128787, 
        lng:  120.680060,
        // 各細項評分 (0~100)
        taste: 73,        // 口味
        freshness: 85,    // 食材新鮮度
        texture: 83,      // 口感
        appearance: 79,   // 外觀
        smell: 79,        // 氣味
        portion: 88,      // 分量
        uniqueness: 82,   // 獨特性
        price:90,        // 價格
        environment: 74,  // 環境
        attitude: 30,     // 態度
        others: 62,        // 其他
        // ★★ 加入 Google Maps 連結 ★★
        gmapUrl: "https://maps.app.goo.gl/BPbwiRNPhrrWE5Rf8"
      },
      {
        time: "2025-03-10",
        city: "台中市",
        district: "南區",
        storeName: "植人炸雞忠孝總店",
        category: "夜市",
        priceLevel: "$$",
         // 地圖用 (示例座標)
        lat: 24.128814, 
        lng:  120.679980,
        // 各細項評分 (0~100)
        taste: 86.6,        // 口味
        freshness: 88,    // 食材新鮮度
        texture: 88,      // 口感
        appearance: 83.5,   // 外觀
        smell: 85.5,        // 氣味
        portion: 86,      // 分量
        uniqueness: 77,   // 獨特性
        price:88,        // 價格
        environment: 90,  // 環境
        attitude: 90,     // 態度
        others: 78,        // 其他
        // ★★ 加入 Google Maps 連結 ★★
        gmapUrl: "https://maps.app.goo.gl/DNdaqN5Qd2D3kXw47"
      },
      {
        time: "2025-04-10",
        city: "台中市",
        district: "南區",
        storeName: "滷肉莊",
        category: "店面",
        priceLevel: "$$",
         // 地圖用 (示例座標)
        lat: 24.127595, 
        lng:  120.677354,
        // 各細項評分 (0~100)
        taste: 72,        // 口味
        freshness: 83,    // 食材新鮮度
        texture: 80,      // 口感
        appearance: 82.5,   // 外觀
        smell: 81.5,        // 氣味
        portion: 84,      // 分量
        uniqueness: 80,   // 獨特性
        price:87,        // 價格
        environment: 77,  // 環境
        attitude: 82.5,     // 態度
        others: 80,        // 其他
        // ★★ 加入 Google Maps 連結 ★★
        gmapUrl: "https://maps.app.goo.gl/PG9NTUTQDBj8N8K68"
      },
      {
        time: "2025-04-10",
        city: "台中市",
        district: "南區",
        storeName: "雞大麻三菜一湯",
        category: "夜市",
        priceLevel: "$$$",
         // 地圖用 (示例座標)
        lat: 24.129420, 
        lng:  120.681694,
        // 各細項評分 (0~100)
        taste: 88,        // 口味
        freshness: 86,    // 食材新鮮度
        texture: 86.5,      // 口感
        appearance: 79,   // 外觀
        smell: 86,        // 氣味
        portion: 86,      // 分量
        uniqueness: 84,   // 獨特性
        price:88,        // 價格
        environment: 78,  // 環境
        attitude: 90,     // 態度
        others: 84,        // 其他
        // ★★ 加入 Google Maps 連結 ★★
        gmapUrl: "https://maps.app.goo.gl/zozs4MdT6BH5dC5QA"
      },
      {
        time: "2025-04-10",
        city: "台中市",
        district: "南區",
        storeName: "貳什 拌物/雞白湯",
        category: "店面",
        priceLevel: "$$$",
         // 地圖用 (示例座標)
        lat: 24.128681, 
        lng:  120.682050,
        // 各細項評分 (0~100)
        taste: 80,        // 口味
        freshness: 86,    // 食材新鮮度
        texture: 85,      // 口感
        appearance: 77,   // 外觀
        smell: 80.5,        // 氣味
        portion: 82.5,      // 分量
        uniqueness: 77,   // 獨特性
        price:86.5,        // 價格
        environment: 79.5,  // 環境
        attitude: 82,     // 態度
        others: 83,        // 其他
        // ★★ 加入 Google Maps 連結 ★★
        gmapUrl: "https://maps.app.goo.gl/i78EQs5rkZH9F8ev7"
      },
      {
        time: "2025-04-10",
        city: "台中市",
        district: "南區",
        storeName: "伙房燒烤-忠孝總店",
        category: "店面",
        priceLevel: "$$$",
         // 地圖用 (示例座標)
        lat: 24.129739, 
        lng:  120.684093,
        // 各細項評分 (0~100)
        taste: 82,        // 口味
        freshness: 85,    // 食材新鮮度
        texture: 82,      // 口感
        appearance: 83,   // 外觀
        smell: 81,        // 氣味
        portion: 75,      // 分量
        uniqueness: 75,   // 獨特性
        price:82.5,        // 價格
        environment: 81,  // 環境
        attitude: 90,     // 態度
        others: 82,        // 其他
        // ★★ 加入 Google Maps 連結 ★★
        gmapUrl: "https://maps.app.goo.gl/8rfUJ7Zo7nAnUi7z7"
      },
      {
        time: "2025-04-10",
        city: "台中市",
        district: "東區",
        storeName: "花囍家日式料理製研所(站前店）",
        category: "店面",
        priceLevel: "$$$",
         // 地圖用 (示例座標)
        lat: 24.135287, 
        lng:  120.687233,
        // 各細項評分 (0~100)
        taste: 84,        // 口味
        freshness: 86,    // 食材新鮮度
        texture: 85,      // 口感
        appearance: 87,   // 外觀
        smell: 81,        // 氣味
        portion: 71,      // 分量
        uniqueness: 86,   // 獨特性
        price:77,        // 價格
        environment: 85,  // 環境
        attitude: 84,     // 態度
        others: 83,        // 其他
        // ★★ 加入 Google Maps 連結 ★★
        gmapUrl: "https://maps.app.goo.gl/feXmYJsEyAwHGnSD9"
      },
      {
        time: "2025-04-10",
        city: "台中市",
        district: "北區",
        storeName: "蘇坤蔚牛排 Sukhumvit STEAK",
        category: "店面",
        priceLevel: "$$$",
         // 地圖用 (示例座標)
        lat: 24.150217, 
        lng:  120.685393,
        // 各細項評分 (0~100)
        taste: 77,        // 口味
        freshness: 80,    // 食材新鮮度
        texture: 82,      // 口感
        appearance: 83.5,   // 外觀
        smell: 85,        // 氣味
        portion: 85.5,      // 分量
        uniqueness: 79,   // 獨特性
        price:82.5,        // 價格
        environment: 81,  // 環境
        attitude: 70,     // 態度
        others: 76,        // 其他
        // ★★ 加入 Google Maps 連結 ★★
        gmapUrl: "https://maps.app.goo.gl/FWtYsMK6n1N4VsJ5A"
      },
      {
        time: "2025-04-10",
        city: "台中市",
        district: "東區",
        storeName: "石洞韓式鐵板蓋飯（總店）",
        category: "店面",
        priceLevel: "$$$",
         // 地圖用 (示例座標)
        lat:  24.133860, 
        lng:  120.684497,
        // 各細項評分 (0~100)
        taste: 84,        // 口味
        freshness: 80,    // 食材新鮮度
        texture: 79.5,      // 口感
        appearance: 77,   // 外觀
        smell: 82.5,        // 氣味
        portion: 86,      // 分量
        uniqueness: 75,   // 獨特性
        price:88,        // 價格
        environment: 78,  // 環境
        attitude: 84,     // 態度
        others: 84,        // 其他
        // ★★ 加入 Google Maps 連結 ★★
        gmapUrl: "https://maps.app.goo.gl/PPHtX7uEbeWysqxJ8"
      },
      {
        time: "2025-04-10",
        city: "台中市",
        district: "西區",
        storeName: "發愣吃VARMT - 勤美店",
        category: "店面",
        priceLevel: "$$$",
         // 地圖用 (示例座標)
        lat:  24.1489903, 
        lng:  120.6619419,
        // 各細項評分 (0~100)
        taste: 72,        // 口味
        freshness: 80,    // 食材新鮮度
        texture: 78,      // 口感
        appearance: 90,   // 外觀
        smell: 83,        // 氣味
        portion: 79,      // 分量
        uniqueness: 85,   // 獨特性
        price: 67.5,        // 價格
        environment: 88,  // 環境
        attitude: 88,     // 態度
        others: 84,        // 其他
        // ★★ 加入 Google Maps 連結 ★★
        gmapUrl: "https://maps.app.goo.gl/5YbrRA5772e6udqW7"
      },
      {
        time: "2025-04-10",
        city: "台南市",
        district: "北區",
        storeName: "好美味胡椒魚",
        category: "夜市",
        priceLevel: "$$$",
         // 地圖用 (示例座標)
        lat:  23.0109202, 
        lng:  120.2078252,
        // 各細項評分 (0~100)
        taste: 85.8,        // 口味
        freshness: 88,    // 食材新鮮度
        texture: 85,      // 口感
        appearance: 84.5,   // 外觀
        smell: 82.5,        // 氣味
        portion: 89,      // 分量
        uniqueness: 81,   // 獨特性
        price: 89,        // 價格
        environment: 83,  // 環境
        attitude: 88,     // 態度
        others: 82,        // 其他
        // ★★ 加入 Google Maps 連結 ★★
        gmapUrl: "https://maps.app.goo.gl/N2Yt5YhB6uaGEEzm6"
      },
      {
        time: "2025-04-10",
        city: "台南市",
        district: "北區",
        storeName: "鴨肉國",
        category: "夜市",
        priceLevel: "$$$",
         // 地圖用 (示例座標)
        lat:  23.0109202, 
        lng:  120.2078255,
        // 各細項評分 (0~100)
        taste: 82,        // 口味
        freshness: 80.5,    // 食材新鮮度
        texture: 78.5,      // 口感
        appearance: 79,   // 外觀
        smell: 84.5,        // 氣味
        portion: 79,      // 分量
        uniqueness: 77,   // 獨特性
        price: 78,        // 價格
        environment: 81.5,  // 環境
        attitude: 85,     // 態度
        others: 84.5,        // 其他
        // ★★ 加入 Google Maps 連結 ★★
        gmapUrl: "https://maps.app.goo.gl/YHuy1Bf9mWywwgzz6"
      },
      {
        time: "2025-04-10",
        city: "台南市",
        district: "永康區",
        storeName: "府城牛肉湯",
        category: "店面",
        priceLevel: "$$$",
         // 地圖用 (示例座標)
        lat:  23.0416355, 
        lng:  120.2413806,
        // 各細項評分 (0~100)
        taste: 85,        // 口味
        freshness: 88,    // 食材新鮮度
        texture: 83.7,      // 口感
        appearance: 78,   // 外觀
        smell: 84,        // 氣味
        portion: 80,      // 分量
        uniqueness: 81,   // 獨特性
        price: 77.5,        // 價格
        environment: 79,  // 環境
        attitude: 83,     // 態度
        others: 83,        // 其他
        // ★★ 加入 Google Maps 連結 ★★
        gmapUrl: "https://maps.app.goo.gl/8wYLekRALxkLJ3PR7"
      },
      {
        time: "2025-04-16",
        city: "台中市",
        district: "西屯區",
        storeName: "太初麵食",
        category: "店面",
        priceLevel: "$$$",
         // 地圖用 (示例座標)
        lat:  24.150736, 
        lng:  120.649256,
        // 各細項評分 (0~100)
        taste: 85.5,        // 口味
        freshness: 85,    // 食材新鮮度
        texture: 82,      // 口感
        appearance: 83,   // 外觀
        smell: 84,        // 氣味
        portion: 80,      // 分量
        uniqueness: 81,   // 獨特性
        price: 84.5,        // 價格
        environment: 94,  // 環境
        attitude: 92,     // 態度
        others: 85,        // 其他
        // ★★ 加入 Google Maps 連結 ★★
        gmapUrl: "https://maps.app.goo.gl/Pa9UriZmqWKxk8y58"
      },
      {
        time: "2025-04-20",
        city: "台北市",
        district: "萬華區",
        storeName: "廣州街夜市脆皮蚵仔煎",
        category: "夜市",
        priceLevel: "$$",
         // 地圖用 (示例座標)
        lat:  25.036735, 
        lng:  121.495847,
        // 各細項評分 (0~100)
        taste: 85,        // 口味
        freshness: 85,    // 食材新鮮度
        texture: 85,      // 口感
        appearance: 84,   // 外觀
        smell: 81,        // 氣味
        portion: 80,      // 分量
        uniqueness: 85.5,   // 獨特性
        price: 76,        // 價格
        environment: 71,  // 環境
        attitude: 74.5,     // 態度
        others: 80,        // 其他
        gmapUrl: "https://maps.app.goo.gl/rkzEZKSR7Y72bGf79"
      },
      {
        time: "2025-04-20",
        city: "台北市",
        district: "萬華區",
        storeName: "福鼎肉片 林記正宗福建特色小吃",
        category: "夜市",
        priceLevel: "$$",
         // 地圖用 (示例座標)
        lat:  25.036701, 
        lng:  121.496500,
        // 各細項評分 (0~100)
        taste: 85.2,        // 口味
        freshness: 85,    // 食材新鮮度
        texture: 85,      // 口感
        appearance: 81.5,   // 外觀
        smell: 81,        // 氣味
        portion: 85.3,      // 分量
        uniqueness: 82.5,   // 獨特性
        price: 82,        // 價格
        environment: 77.5,  // 環境
        attitude: 65,     // 態度
        others: 69,        // 其他
        gmapUrl: "https://maps.app.goo.gl/trLZ2zos4dkA249WA"
      },
      {
        time: "2025-04-20",
        city: "台北市",
        district: "萬華區",
        storeName: "烤識願 萬華店",
        category: "店面",
        priceLevel: "$$",
         // 地圖用 (示例座標)
        lat:  25.0374984, 
        lng:  121.4963788,
        // 各細項評分 (0~100)
        taste: 87.5,        // 口味
        freshness: 85,    // 食材新鮮度
        texture: 82.5,      // 口感
        appearance: 87,   // 外觀
        smell: 86,        // 氣味
        portion: 82,      // 分量
        uniqueness: 86,   // 獨特性
        price: 82,        // 價格
        environment: 80,  // 環境
        attitude: 84.5,     // 態度
        others: 73,        // 其他
        gmapUrl: "https://maps.app.goo.gl/rkzEZKSR7Y72bGf79"
      },
      {
        time: "2025-04-20",
        city: "台北市",
        district: "萬華區",
        storeName: "尋秦記（吳記排骨酥）",
        category: "夜市",
        priceLevel: "$$",
         // 地圖用 (示例座標)
        lat:  25.036773, 
        lng:  121.495903,
        // 各細項評分 (0~100)
        taste: 86.5,        // 口味
        freshness: 79,    // 食材新鮮度
        texture: 80,      // 口感
        appearance: 81,   // 外觀
        smell: 86,        // 氣味
        portion: 87,      // 分量
        uniqueness: 83.5,   // 獨特性
        price: 83.5,        // 價格
        environment: 64,  // 環境
        attitude: 87,     // 態度
        others: 65,        // 其他
        gmapUrl: "https://maps.app.goo.gl/fiqbkn5H65LfqwuP8"
      },
      {
        time: "2025-04-20",
        city: "台北市",
        district: "萬華區",
        storeName: "兩喜號 Liang Xi Hao - 總店",
        category: "夜市",
        priceLevel: "$$",
         // 地圖用 (示例座標)
        lat:  25.036785, 
        lng:  121.497799,
        // 各細項評分 (0~100)
        taste: 83.7,        // 口味
        freshness: 82,    // 食材新鮮度
        texture: 82,      // 口感
        appearance: 83,   // 外觀
        smell: 84,        // 氣味
        portion: 82.5,      // 分量
        uniqueness: 86,   // 獨特性
        price: 83,        // 價格
        environment: 75,  // 環境
        attitude: 78,     // 態度
        others: 80,        // 其他
        gmapUrl: "https://maps.app.goo.gl/rnfoqtZPyTys5zucA"
      },
      {
        time: "2025-04-20",
        city: "台北市",
        district: "萬華區",
        storeName: "頂級甜不辣",
        category: "夜市",
        priceLevel: "$$",
         // 地圖用 (示例座標)
        lat:  25.036702, 
        lng:  121.497666,
        // 各細項評分 (0~100)
        taste: 84,        // 口味
        freshness: 85,    // 食材新鮮度
        texture: 82.5,      // 口感
        appearance: 81,   // 外觀
        smell: 81,        // 氣味
        portion: 81,      // 分量
        uniqueness: 81,   // 獨特性
        price: 76,        // 價格
        environment: 80,  // 環境
        attitude: 83,     // 態度
        others: 81,        // 其他
        gmapUrl: "https://maps.app.goo.gl/HBqG7cBdV8xj6A8G9"
      },
      {
        time: "2025-04-20",
        city: "台北市",
        district: "萬華區",
        storeName: "老施碳烤",
        category: "夜市",
        priceLevel: "$$",
         // 地圖用 (示例座標)
        lat:  25.036783, 
        lng:  121.495816,
        // 各細項評分 (0~100)
        taste: 85,        // 口味
        freshness: 79,    // 食材新鮮度
        texture: 78,      // 口感
        appearance: 77,   // 外觀
        smell: 85,        // 氣味
        portion: 80,      // 分量
        uniqueness: 81,   // 獨特性
        price: 80,        // 價格
        environment: 77,  // 環境
        attitude: 83,     // 態度
        others: 75.5,        // 其他
        gmapUrl: "https://maps.app.goo.gl/q4ixKB6SwzVW1Qb48"
      },
      {
        time: "2025-04-20",
        city: "台北市",
        district: "萬華區",
        storeName: "甲林鐵板燒",
        category: "夜市",
        priceLevel: "$$$",
         // 地圖用 (示例座標)
        lat:  25.036747, 
        lng:  121.496560,
        // 各細項評分 (0~100)
        taste: 84.5,        // 口味
        freshness: 82,    // 食材新鮮度
        texture: 82.5,      // 口感
        appearance: 78,   // 外觀
        smell: 82,        // 氣味
        portion: 81.5,      // 分量
        uniqueness: 85,   // 獨特性
        price: 78.6,        // 價格
        environment: 78.6,  // 環境
        attitude: 81,     // 態度
        others: 80,        // 其他
        gmapUrl: "https://maps.app.goo.gl/mRMvo7MFHhxG7unh6"
      },
      {
        time: "2025-04-20",
        city: "台北市",
        district: "萬華區",
        storeName: "臭博士臭豆腐",
        category: "夜市",
        priceLevel: "$$",
         // 地圖用 (示例座標)
        lat:  25.036719, 
        lng:  121.496140,
        // 各細項評分 (0~100)
        taste: 88.5,        // 口味
        freshness: 86,    // 食材新鮮度
        texture: 85,      // 口感
        appearance: 85,   // 外觀
        smell: 84.7,        // 氣味
        portion: 85,      // 分量
        uniqueness: 82.5,   // 獨特性
        price: 82,        // 價格
        environment: 77,  // 環境
        attitude: 83,     // 態度
        others: 81,        // 其他
        gmapUrl: "https://maps.app.goo.gl/qs7MEfXc7bcigL4W9"
      },
      {
        time: "2025-04-20",
        city: "台北市",
        district: "萬華區",
        storeName: "布袋鮮之蚵",
        category: "店面",
        priceLevel: "$$",
         // 地圖用 (示例座標)
        lat:  25.035262, 
        lng:  121.497089,
        // 各細項評分 (0~100)
        taste: 86.8,        // 口味
        freshness: 88,    // 食材新鮮度
        texture: 82,      // 口感
        appearance: 84,   // 外觀
        smell: 81,        // 氣味
        portion: 88,      // 分量
        uniqueness: 77,   // 獨特性
        price: 80,        // 價格
        environment: 76.5,  // 環境
        attitude: 80,     // 態度
        others: 77.5,        // 其他
        gmapUrl: "https://maps.app.goo.gl/g9vnx5xALecaf3rR7"
      },
      {
        time: "2025-04-20",
        city: "台北市",
        district: "萬華區",
        storeName: "李家現烤香腸",
        category: "店面",
        priceLevel: "$$",
         // 地圖用 (示例座標)
        lat:  25.035260, 
        lng:  121.498263,
        // 各細項評分 (0~100)
        taste: 88,        // 口味
        freshness: 87,    // 食材新鮮度
        texture: 87,      // 口感
        appearance: 85,   // 外觀
        smell: 88,        // 氣味
        portion: 85.8,      // 分量
        uniqueness: 81,   // 獨特性
        price: 75,        // 價格
        environment: 78,  // 環境
        attitude: 81,     // 態度
        others: 78,        // 其他
        gmapUrl: "https://maps.app.goo.gl/zo5HCeyu8pTc2g2e6"
      },
      {
        time: "2025-04-20",
        city: "台北市",
        district: "萬華區",
        storeName: "艋舺清粥小菜（新地址）",
        category: "店面",
        priceLevel: "$$",
         // 地圖用 (示例座標)
        lat:  25.035250, 
        lng:  121.497582,
        // 各細項評分 (0~100)
        taste: 85,        // 口味
        freshness: 85,    // 食材新鮮度
        texture: 85,      // 口感
        appearance: 83.5,   // 外觀
        smell: 82,        // 氣味
        portion: 88,      // 分量
        uniqueness: 73,   // 獨特性
        price: 90,        // 價格
        environment: 80,  // 環境
        attitude: 83,     // 態度
        others: 81,        // 其他
        gmapUrl: "https://maps.app.goo.gl/hSsi3DqG4dbq6wVx5"
      },
      {
        time: "2025-04-20",
        city: "台北市",
        district: "萬華區",
        storeName: "藏賀岩燒牛排",
        category: "店面",
        priceLevel: "$$$",
         // 地圖用 (示例座標)
        lat:  25.035232, 
        lng:  121.497661,
        // 各細項評分 (0~100)
        taste: 85,        // 口味
        freshness: 88,    // 食材新鮮度
        texture: 88,      // 口感
        appearance: 84,   // 外觀
        smell: 83.5,        // 氣味
        portion: 80,      // 分量
        uniqueness: 80,   // 獨特性
        price: 75.7,        // 價格
        environment: 82.5,  // 環境
        attitude: 81.5,     // 態度
        others: 81,        // 其他
        gmapUrl: "https://maps.app.goo.gl/L9GTz8v6Hxbms48h6"
      },
      {
        time: "2025-04-20",
        city: "台中市",
        district: "北區",
        storeName: "洄味牛肉麵崇德店",
        category: "店面",
        priceLevel: "$$$",
         // 地圖用 (示例座標)
        lat:  24.164376, 
        lng:  120.6851715,
        // 各細項評分 (0~100)
        taste: 86,        // 口味
        freshness: 85,    // 食材新鮮度
        texture: 87,      // 口感
        appearance: 83,   // 外觀
        smell: 85,        // 氣味
        portion: 83,      // 分量
        uniqueness: 85,   // 獨特性
        price: 81.5,        // 價格
        environment: 75,  // 環境
        attitude: 73.5,     // 態度
        others: 70,        // 其他
        gmapUrl: "https://maps.app.goo.gl/cPVUxjmTWKWgvYJT9"
      },
      {
        time: "2025-04-20",
        city: "台中市",
        district: "西區",
        storeName: "宏佳火雞肉飯-向上店",
        category: "店面",
        priceLevel: "$$",
         // 地圖用 (示例座標)
        lat:  24.146746, 
        lng:  120.658769,
        // 各細項評分 (0~100)
        taste: 85.7,        // 口味
        freshness: 87,    // 食材新鮮度
        texture: 85,      // 口感
        appearance: 85,   // 外觀
        smell: 81.5,        // 氣味
        portion: 81,      // 分量
        uniqueness: 75,   // 獨特性
        price: 84,        // 價格
        environment: 80,  // 環境
        attitude: 83,     // 態度
        others: 83,        // 其他
        gmapUrl: "https://maps.app.goo.gl/oSEdVsh26KJdwLJY9"
      },
      {
        time: "2025-04-20",
        city: "台中市",
        district: "西區",
        storeName: "moi x pho 哞一河粉",
        category: "店面",
        priceLevel: "$$$",
         // 地圖用 (示例座標)
        lat:  24.148371, 
        lng:  120.660265,
        // 各細項評分 (0~100)
        taste: 88,        // 口味
        freshness: 90,    // 食材新鮮度
        texture: 85,      // 口感
        appearance: 89,   // 外觀
        smell: 85,        // 氣味
        portion: 79,      // 分量
        uniqueness: 78,   // 獨特性
        price: 79,        // 價格
        environment: 85,  // 環境
        attitude: 81.5,     // 態度
        others: 81,        // 其他
        gmapUrl: "https://maps.app.goo.gl/acG2x5R7bMNWrG2JA"
      },
      {
        time: "2025-04-20",
        city: "台中市",
        district: "西區",
        storeName: "打盹nap&knife -義大利麵專賣",
        category: "店面",
        priceLevel: "$$$",
         // 地圖用 (示例座標)
        lat:  24.1546071, 
        lng:  120.66133,
        // 各細項評分 (0~100)
        taste: 90,        // 口味
        freshness: 88,    // 食材新鮮度
        texture: 83.5,      // 口感
        appearance: 90,   // 外觀
        smell: 82.5,        // 氣味
        portion: 77,      // 分量
        uniqueness: 75,   // 獨特性
        price: 78.5,        // 價格
        environment: 88,  // 環境
        attitude: 84,     // 態度
        others: 83,        // 其他
        gmapUrl: "https://maps.app.goo.gl/4kXn2auBtVYomt938"
      },
      {
        time: "2025-06-01",
        city: "台中市",
        district: "北屯區",
        storeName: "徐家莊手打麵",
        category: "店面",
        priceLevel: "$$$",
         // 地圖用 (示例座標)
        lat:  24.1711337, 
        lng:  120.6801843,
        // 各細項評分 (0~100)
        taste: 86.5,        // 口味
        freshness: 84.5,    // 食材新鮮度
        texture: 90,      // 口感
        appearance: 81,   // 外觀
        smell: 86,        // 氣味
        portion: 84,      // 分量
        uniqueness: 83,   // 獨特性
        price: 80,        // 價格
        environment: 70.1,  // 環境
        attitude: 82,     // 態度
        others: 80,        // 其他
        gmapUrl: "https://maps.app.goo.gl/jnTrYsb5W7UdR1PP8"
      },
      {
        time: "2025-06-01",
        city: "台北市",
        district: "萬華區",
        storeName: "樂麵屋 西門店",
        category: "店面",
        priceLevel: "$$$",
         // 地圖用 (示例座標)
        lat:  25.0448011, 
        lng:  121.5053743,
        // 各細項評分 (0~100)
        taste: 87.5,        // 口味
        freshness: 86,    // 食材新鮮度
        texture: 83,      // 口感
        appearance: 84.5,   // 外觀
        smell: 82,        // 氣味
        portion: 88,      // 分量
        uniqueness: 85,   // 獨特性
        price: 83,        // 價格
        environment: 82.5,  // 環境
        attitude: 82,     // 態度
        others: 80,        // 其他
        gmapUrl: "https://maps.app.goo.gl/XLLuJZkrdHrL4ajP9"
      },
      {
        time: "2025-06-01",
        city: "台北市",
        district: "萬華區",
        storeName: "海天香餃",
        category: "店面",
        priceLevel: "$$",
         // 地圖用 (示例座標)
        lat:  25.0352088, 
        lng:  121.4981112,
        // 各細項評分 (0~100)
        taste: 84.5,        // 口味
        freshness: 85,    // 食材新鮮度
        texture: 82.5,      // 口感
        appearance: 82.5,   // 外觀
        smell: 80,        // 氣味
        portion: 83,      // 分量
        uniqueness: 78,   // 獨特性
        price: 80,        // 價格
        environment: 84,  // 環境
        attitude: 81,     // 態度
        others: 82,        // 其他
        gmapUrl: "https://maps.app.goo.gl/W576355qyxP8a2CC8"
      },
      {
        time: "2025-06-01",
        city: "台北市",
        district: "萬華區",
        storeName: "原汁排骨湯 和平本舖",
        category: "店面",
        priceLevel: "$$",
         // 地圖用 (示例座標)
        lat:  25.0352277, 
        lng:  121.4978081,
        // 各細項評分 (0~100)
        taste: 86,        // 口味
        freshness: 86.5,    // 食材新鮮度
        texture: 84,      // 口感
        appearance: 82,   // 外觀
        smell: 82,        // 氣味
        portion: 84.5,      // 分量
        uniqueness: 81,   // 獨特性
        price: 82,        // 價格
        environment: 77.5,  // 環境
        attitude: 80,     // 態度
        others: 82.5,        // 其他
        gmapUrl: "https://maps.app.goo.gl/w8uHkrp1RZsuDktv7"
      },
      {
        time: "2025-06-01",
        city: "台北市",
        district: "萬華區",
        storeName: "陳記腸蚵專業麵線",
        category: "店面",
        priceLevel: "$$",
         // 地圖用 (示例座標)
        lat:  25.0352277, 
        lng:  121.4982168,
        // 各細項評分 (0~100)
        taste: 85.5,        // 口味
        freshness: 90,    // 食材新鮮度
        texture: 83.5,      // 口感
        appearance: 85,   // 外觀
        smell: 82,        // 氣味
        portion: 79,      // 分量
        uniqueness: 78,   // 獨特性
        price: 77,        // 價格
        environment: 76.5,  // 環境
        attitude: 80,     // 態度
        others: 82.5,        // 其他
        gmapUrl: "https://maps.app.goo.gl/Gpd6W37XREzXhh3TA"
      },
      {
        time: "2025-06-01",
        city: "台北市",
        district: "萬華區",
        storeName: "梧州街原汁排骨湯",
        category: "店面",
        priceLevel: "$$",
         // 地圖用 (示例座標)
        lat:  25.0362991, 
        lng:  121.4975774,
        // 各細項評分 (0~100)
        taste: 87,        // 口味
        freshness: 86,    // 食材新鮮度
        texture: 85,      // 口感
        appearance: 82,   // 外觀
        smell: 82,        // 氣味
        portion: 83.5,      // 分量
        uniqueness: 81,   // 獨特性
        price: 80,        // 價格
        environment: 68.5,  // 環境
        attitude: 81,     // 態度
        others: 82.7,        // 其他
        gmapUrl: "https://maps.app.goo.gl/c3oqeRdL7Y3WPot47"
      },
      {
        time: "2025-06-11",
        city: "台中市",
        district: "北區",
        storeName: "浪金生魚片",
        category: "店面",
        priceLevel: "$$$",
         // 地圖用 (示例座標)
        lat:  24.1662206, 
        lng:  120.6866692,
        // 各細項評分 (0~100)
        taste: 88.5,        // 口味
        freshness: 90,    // 食材新鮮度
        texture: 90,      // 口感
        appearance: 90,   // 外觀
        smell: 87,        // 氣味
        portion: 84.5,      // 分量
        uniqueness: 84,   // 獨特性
        price: 83.5,        // 價格
        environment: 83.5,  // 環境
        attitude: 75,     // 態度
        others: 82.5,        // 其他
        gmapUrl: "https://maps.app.goo.gl/5yRqkyrt7Eg9mi9L8"
      },
      {
        time: "2025-06-11",
        city: "台中市",
        district: "南區",
        storeName: "宇匠屋《丼飯 壽司職人專門店》",
        category: "店面",
        priceLevel: "$$$",
         // 地圖用 (示例座標)
        lat:  24.1298153, 
        lng:  120.6826311,
        // 各細項評分 (0~100)
        taste: 82,        // 口味
        freshness: 82.6,    // 食材新鮮度
        texture: 85,      // 口感
        appearance: 83.5,   // 外觀
        smell: 85,        // 氣味
        portion: 82.2,      // 分量
        uniqueness: 76,   // 獨特性
        price: 83,        // 價格
        environment: 83.5,  // 環境
        attitude: 84.5,     // 態度
        others: 70,        // 其他
        gmapUrl: "https://maps.app.goo.gl/1nMTYYRAtXtAn3pc6"
      },
      {
        time: "2025-06-11",
        city: "台中市",
        district: "南區",
        storeName: "夜夜見來蛋包飯",
        category: "店面",
        priceLevel: "$$$",
         // 地圖用 (示例座標)
        lat:  24.1298153, 
        lng:  120.6826311,
        // 各細項評分 (0~100)
        taste: 79,        // 口味
        freshness: 77,    // 食材新鮮度
        texture: 79,      // 口感
        appearance: 80.5,   // 外觀
        smell: 82,        // 氣味
        portion: 86,      // 分量
        uniqueness: 76,   // 獨特性
        price: 84.5,        // 價格
        environment: 78,  // 環境
        attitude: 86,     // 態度
        others: 80.3,        // 其他
        gmapUrl: "https://maps.app.goo.gl/EijAFY2LurXKPF5A9"
      },
    
  ];
  