<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <v-card class="mb-4">
          <v-card-title class="d-flex align-center">
            <v-btn
              icon="mdi-arrow-left"
              variant="text"
              @click="$router.push('/')"
            ></v-btn>
            <span class="ml-2"
              >{{ brandInfo.brand_zh }} {{ deviceTypeText }}查询</span
            >
          </v-card-title>

          <v-card-text>
            <v-row>
              <v-col cols="12" md="9">
                <v-text-field
                  v-model="searchQuery"
                  label="查询设备"
                  variant="outlined"
                  prepend-inner-icon="mdi-magnify"
                  clearable
                  @input="debouncedFilterPhones"
                ></v-text-field>
              </v-col>

              <v-col cols="12" md="3">
                <v-select
                  v-model="selectedType"
                  :items="phoneTypes"
                  label="设备类型"
                  variant="outlined"
                  clearable
                  @update:model-value="filterPhones"
                ></v-select>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>

        <v-card v-if="filteredPhones.length > 0">
          <v-card-text>
            <v-row>
              <v-col
                v-for="(phone, index) in filteredPhones"
                :key="index"
                cols="12"
                sm="6"
                md="4"
                lg="3"
              >
                <v-card elevation="2" class="mb-4">
                  <v-card-title class="text-h6">{{
                    Object.keys(phone)[0]
                  }}</v-card-title>
                  <v-card-text>
                    <div
                      v-if="
                        phone[Object.keys(phone)[0]].codename &&
                        phone[Object.keys(phone)[0]].codename.trim()
                      "
                      class="d-flex align-center mb-2"
                    >
                      <span class="text-caption mr-2">代号</span>
                      <v-chip
                        size="small"
                        color="primary"
                        variant="outlined"
                        class="code-chip"
                        @click="
                          copyToClipboard(phone[Object.keys(phone)[0]].codename)
                        "
                      >
                        {{ phone[Object.keys(phone)[0]].codename }}
                        <v-icon size="x-small" class="ml-1"
                          >mdi-content-copy</v-icon
                        >
                      </v-chip>
                    </div>
                    <v-divider
                      v-if="
                        phone[Object.keys(phone)[0]].codename &&
                        phone[Object.keys(phone)[0]].codename.trim()
                      "
                      class="mb-2"
                    ></v-divider>
                    <div
                      v-for="(model, version) in phone[Object.keys(phone)[0]]
                        .model"
                      :key="version"
                      class="mb-2"
                    >
                      <div class="d-flex align-center">
                        <strong class="text-body-2 mr-2">{{ version }}</strong>
                        <v-chip
                          size="small"
                          color="secondary"
                          variant="flat"
                          class="code-chip"
                          @click="copyToClipboard(model)"
                        >
                          {{ model }}
                          <v-icon size="x-small" class="ml-1"
                            >mdi-content-copy</v-icon
                          >
                        </v-chip>
                      </div>
                    </div>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>

        <v-card v-else class="text-center pa-6">
          <v-icon size="64" color="grey">mdi-cellphone-off</v-icon>
          <p class="text-h6 mt-4">未找到符合条件的设备型号</p>
          <p class="text-body-2">请尝试调整搜索条件</p>
        </v-card>
      </v-col>
    </v-row>
  </v-container>

  <!-- 复制成功提示 -->
  <v-snackbar v-model="snackbar" :timeout="2000" color="success">
    {{ snackbarText }}
    <template v-slot:actions>
      <v-btn variant="text" @click="snackbar = false">关闭</v-btn>
    </template>
  </v-snackbar>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";

// 防抖函数
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};
import { useRoute } from "vue-router";

const route = useRoute();
const brandId = computed(() => route.params.id);

const searchQuery = ref("");
const selectedType = ref(null);

const brandData = ref(null);
const brandInfo = ref({});
const phones = ref([]);
const filteredPhones = ref([]);

// 计算设备类型文本
const deviceTypeText = computed(() => {
  if (!selectedType.value) return "设备型号";
  const deviceTypeMap = {
    mob: "手机",
    pad: "平板电脑",
    tv: "电视",
    tv_hub: "电视盒子",
    watch: "手表",
    band: "手环",
    computer: "PC电脑",
    device: "驱动类",
    pod: "耳机",
    all: "所有类型",
  };
  // 如果有中文映射则显示中文，否则显示英文原文
  const typeName = deviceTypeMap[selectedType.value] || selectedType.value;
  return typeName + "型号";
});

const phoneTypes = computed(() => {
  if (!phones.value || phones.value.length === 0) return [];

  const types = [];
  const deviceTypeMap = {
    mob: "手机",
    pad: "平板电脑",
    tv: "电视",
    tv_hub: "电视盒子",
    watch: "手表",
    band: "手环",
    computer: "PC电脑",
    device: "驱动类",
    pod: "耳机",
    all: "所有类型",
  };

  // 直接从CSV数据中获取设备类型，而不是通过名称匹配
  const availableTypes = new Set();
  phones.value.forEach((phone) => {
    const phoneName = Object.keys(phone)[0];
    const phoneData = phone[phoneName];

    // 如果phoneData中有dtype字段，直接使用该字段
    if (phoneData.dtype) {
      availableTypes.add(phoneData.dtype);
    } else {
      // 如果没有dtype字段，再根据设备名称判断类型（兼容旧数据）
      if (phoneName.includes("平板") || phoneName.includes("Pad")) {
        availableTypes.add("pad");
      } else if (phoneName.includes("电视") || phoneName.includes("TV")) {
        availableTypes.add("tv");
      } else if (phoneName.includes("盒子") || phoneName.includes("Box")) {
        availableTypes.add("tv_hub");
      } else if (phoneName.includes("手表") || phoneName.includes("Watch")) {
        availableTypes.add("watch");
      } else if (phoneName.includes("手环") || phoneName.includes("Band")) {
        availableTypes.add("band");
      } else if (
        phoneName.includes("电脑") ||
        phoneName.includes("Computer") ||
        phoneName.includes("PC")
      ) {
        availableTypes.add("computer");
      } else if (phoneName.includes("驱动") || phoneName.includes("Device")) {
        availableTypes.add("device");
      } else {
        availableTypes.add("mob"); // 默认为手机
      }
    }
  });

  // 将类型转换为选项，有中文映射显示中文，否则显示英文原文
  availableTypes.forEach((type) => {
    const displayName = deviceTypeMap[type] || type;
    types.push({ title: displayName, value: type });
  });

  // 如果品牌有多种设备类型，添加"all"选项
  if (types.length > 1) {
    types.unshift({ title: "所有类型", value: null });
  }
  return types;
});

import { getBrandData } from "@/utils/csvDataService.js";

onMounted(async () => {
  try {
    // 根据品牌ID加载对应的数据
    const data = await getBrandData(brandId.value);
    if (data) {
      brandData.value = data;
      brandInfo.value = data.about;
      phones.value = data.phones;
      filteredPhones.value = data.phones;

      // 设置页面标题
      const brandName =
        data.about.brand_zh || data.about.brand || brandId.value;
      document.title = `${brandName}设备型号查询 - 机查查`;
    }
  } catch (error) {
    console.error("加载品牌数据失败:", error);
  }
});

const filterPhones = () => {
  if (!phones.value) return;

  filteredPhones.value = phones.value.filter((phone) => {
    const phoneName = Object.keys(phone)[0];
    const phoneData = phone[phoneName];

    // 搜索条件过滤
    const matchesSearch = searchQuery.value
      ? phoneName.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
        phoneData.codename
          .toLowerCase()
          .includes(searchQuery.value.toLowerCase()) ||
        Object.values(phoneData.model).some((model) =>
          model.toLowerCase().includes(searchQuery.value.toLowerCase())
        )
      : true;

    // 类型过滤 - 根据设备类型进行过滤
    const matchesType = selectedType.value
      ? (phoneData.dtype && phoneData.dtype === selectedType.value) || // 优先使用dtype字段进行精确匹配
        (!phoneData.dtype &&
          ((selectedType.value === "mob" &&
            !phoneName.includes("平板") &&
            !phoneName.includes("Pad") &&
            !phoneName.includes("电视") &&
            !phoneName.includes("TV") &&
            !phoneName.includes("盒子") &&
            !phoneName.includes("Box") &&
            !phoneName.includes("手表") &&
            !phoneName.includes("Watch") &&
            !phoneName.includes("手环") &&
            !phoneName.includes("Band") &&
            !phoneName.includes("电脑") &&
            !phoneName.includes("Computer") &&
            !phoneName.includes("PC") &&
            !phoneName.includes("驱动") &&
            !phoneName.includes("Device")) ||
            (selectedType.value === "pad" &&
              (phoneName.includes("平板") || phoneName.includes("Pad"))) ||
            (selectedType.value === "tv" &&
              (phoneName.includes("电视") || phoneName.includes("TV"))) ||
            (selectedType.value === "tv_hub" &&
              (phoneName.includes("盒子") || phoneName.includes("Box"))) ||
            (selectedType.value === "watch" &&
              (phoneName.includes("手表") || phoneName.includes("Watch"))) ||
            (selectedType.value === "band" &&
              (phoneName.includes("手环") || phoneName.includes("Band"))) ||
            (selectedType.value === "computer" &&
              (phoneName.includes("电脑") ||
                phoneName.includes("Computer") ||
                phoneName.includes("PC"))) ||
            (selectedType.value === "device" &&
              (phoneName.includes("驱动") || phoneName.includes("Device")))))
      : true;

    return matchesSearch && matchesType;
  });
};

// 防抖筛选函数
const debouncedFilterPhones = debounce(filterPhones, 500);

// 复制提示
const snackbar = ref(false);
const snackbarText = ref("");

// 复制到剪贴板功能
const copyToClipboard = (text) => {
  navigator.clipboard
    .writeText(text)
    .then(() => {
      // 显示复制成功的提示
      snackbarText.value = `已复制: ${text}`;
      snackbar.value = true;
    })
    .catch((err) => {
      console.error("复制失败:", err);
      snackbarText.value = "复制失败";
      snackbar.value = true;
    });
};
</script>
