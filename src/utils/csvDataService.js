import Papa from "papaparse";

let csvData = null;
let brands = null;

/**
 * 加载CSV数据
 */
export const loadCsvData = async () => {
  if (csvData) {
    return csvData;
  }

  try {
    // 尝试多个可能的路径
    const possiblePaths = [
      "/database/models.csv",     // 生产环境公共路径（优先）
      "/src/database/models.csv", // 开发环境路径
      "./database/models.csv",   // 相对路径简化版
      "./src/database/models.csv" // 相对路径
    ];

    let response;
    let lastError;
    
    for (const path of possiblePaths) {
      try {
        response = await fetch(path);
        if (response.ok) {
          console.log(`成功从 ${path} 加载CSV文件`);
          break;
        } else {
          console.warn(`从 ${path} 加载失败: ${response.status} ${response.statusText}`);
        }
      } catch (error) {
        console.warn(`从 ${path} 加载失败:`, error.message);
        lastError = error;
      }
    }

    if (!response || !response.ok) {
      throw new Error(`无法加载CSV文件，已尝试路径: ${possiblePaths.join(', ')}. 最后错误: ${lastError?.message}`);
    }

    const csvText = await response.text();

    // 第一次尝试：使用标准配置解析
    let result = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      delimiter: ",", // 明确指定分隔符为逗号
      quoteChar: '"', // 明确指定引号字符
      escapeChar: '"', // 明确指定转义字符
      transformHeader: (header) => header.trim(),
      transform: (value) => value.trim(),
    });

    // 如果有太多字段错误，尝试更宽松的配置
    const fieldMismatchErrors = result.errors.filter(error => error.code === 'TooManyFields');
    if (fieldMismatchErrors.length > 10) {
      console.warn("检测到大量字段不匹配错误，尝试使用宽松配置重新解析");
      result = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        delimiter: ",",
        quoteChar: '"',
        escapeChar: '"',
        transformHeader: (header) => header.trim(),
        transform: (value) => value.trim(),
        // 允许动态字段数
        dynamicTyping: false,
      });
    }

    if (result.errors.length > 0) {
      console.error("CSV解析错误:", result.errors);
      // 在开发环境中显示详细的错误信息
      if (import.meta.env.DEV) {
        result.errors.forEach(error => {
          console.error(`CSV错误 - 类型: ${error.type}, 代码: ${error.code}, 消息: ${error.message}, 行: ${error.row}`);
        });
      }
    }

    // 验证数据完整性
    if (!result.data || result.data.length === 0) {
      throw new Error("CSV文件解析后没有数据");
    }

    // 验证必要的列是否存在
    const requiredColumns = ['model', 'dtype', 'brand', 'brand_title', 'code', 'code_alias', 'model_name', 'ver_name'];
    const firstRow = result.data[0];
    const missingColumns = requiredColumns.filter(col => !(col in firstRow));
    
    if (missingColumns.length > 0) {
      console.warn("CSV缺少列:", missingColumns);
    }

    // 过滤掉无效的行（确保所有必需字段都存在）
    const validData = result.data.filter(row => {
      return row.model !== undefined && row.brand !== undefined;
    });

    console.log(`CSV数据加载成功：总共 ${result.data.length} 行，有效 ${validData.length} 行`);
    
    csvData = validData;
    return csvData;
  } catch (error) {
    console.error("加载CSV数据失败:", error);
    throw error;
  }
};

/**
 * 品牌名映射 - 中文名(英文名)格式
 */
const brandNameMap = {
  apple: "苹果(Apple)",
  asus: "华硕(Asus)",
  blackshark: "黑鲨",
  google: "谷歌(Google)",
  huawei: "华为",
  meizu: "魅族",
  xiaomi: "小米",
  mitv: "小米电视",
  motorola: "摩托罗拉(Motorola)",
  oneplus: "一加",
  realme: "真我",
  samsung: "三星(Samsung)",
  honor: "荣耀",
};

/**
 * 获取显示的品牌名
 */
const getDisplayBrandName = (brand, brandTitle) => {
  const brandKey = brand.toLowerCase();
  return brandNameMap[brandKey] || brandTitle;
};

/**
 * 获取所有品牌
 */
export const getBrands = async () => {
  if (brands) {
    return brands;
  }

  const data = await loadCsvData();
  const brandMap = new Map();

  data.forEach((row) => {
    if (row.brand && row.brand_title) {
      brandMap.set(row.brand, {
        id: row.brand,
        name: getDisplayBrandName(row.brand, row.brand_title),
        brand: row.brand,
        brand_title: row.brand_title,
      });
    }
  });

  brands = Array.from(brandMap.values());
  return brands;
};

/**
 * 搜索设备
 */
export const searchDevices = async (query) => {
  const data = await loadCsvData();
  const searchQuery = query.toLowerCase();

  const results = [];
  const deviceMap = new Map();

  data.forEach((row) => {
    if (!row.model_name) return;

    const modelName = row.model_name;
    const code = row.code || "";
    const codeAlias = row.code_alias || "";
    const verName = row.ver_name || "";

    // 检查是否匹配搜索词
    const nameMatches = modelName.toLowerCase().includes(searchQuery);
    const codeMatches = code.toLowerCase().includes(searchQuery);
    const aliasMatches = codeAlias.toLowerCase().includes(searchQuery);
    const verMatches = verName.toLowerCase().includes(searchQuery);

    if (nameMatches || codeMatches || aliasMatches || verMatches) {
      const key = `${row.brand}-${row.dtype}-${modelName}`;

      if (!deviceMap.has(key)) {
        // 构建codename，包含code和code_alias（如果有）
        let codename = code;
        if (codeAlias && codeAlias !== code) {
          codename = code ? `${code} / ${codeAlias}` : codeAlias;
        }

        deviceMap.set(key, {
          brandName: row.brand_title,
          phoneName: modelName,
          codename: codename || "",
          models: {},
          dtype: row.dtype,
          brand: row.brand,
        });
      }

      const device = deviceMap.get(key);
      if (verName) {
        device.models[verName] = row.model || code || "";
      } else if (row.model) {
        // 如果没有版本信息，直接使用model字段作为默认型号
        device.models["型号"] = row.model;
      }
    }
  });

  return Array.from(deviceMap.values());
};

/**
 * 获取品牌数据
 */
export const getBrandData = async (brandId) => {
  const data = await loadCsvData();
  const brandData = data.filter((row) => row.brand === brandId);

  if (brandData.length === 0) {
    return null;
  }

  const brandInfo = {
    brand: brandData[0].brand,
    brand_zh: brandData[0].brand_title,
    "sub-brand": brandData[0].brand,
    "sub-brand_zh": brandData[0].brand_title,
    type: "phone",
  };

  const phones = [];
  const deviceMap = new Map();

  brandData.forEach((row) => {
    if (!row.model_name) return;

    const modelName = row.model_name;
    const key = modelName;

    if (!deviceMap.has(key)) {
      // 构建codename，包含code和code_alias（如果有）
      let codename = row.code || "";
      if (row.code_alias && row.code_alias !== row.code) {
        codename = codename
          ? `${codename} / ${row.code_alias}`
          : row.code_alias;
      }

      deviceMap.set(key, {
        [modelName]: {
          codename: codename,
          model: {},
          dtype: row.dtype, // 添加dtype字段
        },
      });
    }

    const device = deviceMap.get(key);
    const deviceData = device[modelName];

    if (row.ver_name) {
      deviceData.model[row.ver_name] = row.model || row.code || "";
    } else if (row.model) {
      // 如果没有版本信息，直接使用model字段作为默认型号
      deviceData.model["型号"] = row.model;
    }
  });

  return {
    about: brandInfo,
    phones: Array.from(deviceMap.values()),
  };
};

/**
 * 获取设备类型（手机/平板）
 */
export const getDeviceType = (deviceName, dtype) => {
  if (dtype === "pad") return "pad";
  if (dtype === "mob") return "phone";

  // 根据设备名称判断
  if (deviceName.includes("平板") || deviceName.includes("Pad")) {
    return "pad";
  }
  return "phone";
};
