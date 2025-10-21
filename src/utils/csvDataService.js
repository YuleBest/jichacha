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
    const response = await fetch("/src/database/models.csv");
    const csvText = await response.text();

    const result = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
      transform: (value) => value.trim(),
    });

    if (result.errors.length > 0) {
      console.error("CSV解析错误:", result.errors);
    }

    csvData = result.data;
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
