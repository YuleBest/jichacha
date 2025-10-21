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
            <span class="ml-2">搜索结果: {{ route.query.q }}</span>
          </v-card-title>

          <v-card-text>
            <v-text-field
              v-model="searchQuery"
              label="查询设备"
              variant="outlined"
              prepend-inner-icon="mdi-magnify"
              clearable
              @keyup.enter="search"
              @input="debouncedSearch"
            ></v-text-field>
          </v-card-text>
        </v-card>

        <div v-if="loading" class="text-center pa-6">
          <v-progress-circular
            indeterminate
            color="primary"
          ></v-progress-circular>
          <p class="mt-4">正在搜索...</p>
        </div>

        <template v-else>
          <v-card v-if="searchResults.length > 0">
            <v-card-text>
              <v-row>
                <v-col
                  v-for="(result, index) in searchResults"
                  :key="index"
                  cols="12"
                  sm="6"
                  md="4"
                  lg="3"
                >
                  <v-card elevation="2" class="mb-4">
                    <v-card-title class="text-subtitle-1">
                      {{ result.phoneName }}
                    </v-card-title>
                    <v-card-text>
                      <div
                        v-if="result.codename && result.codename.trim()"
                        class="d-flex align-center mb-2"
                      >
                        <span class="text-caption mr-2">代号:</span>
                        <v-chip
                          size="small"
                          color="primary"
                          variant="outlined"
                          class="code-chip"
                          @click="copyToClipboard(result.codename)"
                        >
                          {{ result.codename }}
                          <v-icon size="x-small" class="ml-1"
                            >mdi-content-copy</v-icon
                          >
                        </v-chip>
                      </div>
                      <v-divider
                        v-if="result.codename && result.codename.trim()"
                        class="mb-2"
                      ></v-divider>
                      <div
                        v-for="(model, version) in result.models"
                        :key="version"
                        class="mb-2"
                      >
                        <div class="d-flex align-center">
                          <strong class="text-body-2 mr-2"
                            >{{ version }}:</strong
                          >
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
            <p class="text-body-2">请尝试使用其他关键词搜索</p>
            <p class="text-body-2">比如：小米 替换为 xiaomi</p>
          </v-card>
        </template>
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
import { ref, onMounted, watch } from "vue";

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
import { useRoute, useRouter } from "vue-router";

const route = useRoute();
const router = useRouter();
const searchQuery = ref("");
const searchResults = ref([]);
const loading = ref(false);

// 设置页面标题
const updateTitle = () => {
  const query = route.query.q || "";
  document.title = query ? `搜索设备 - ${query}` : "机查查 - 搜索设备";
};

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

// 监听路由变化，更新搜索查询
watch(
  () => route.query.q,
  (newQuery) => {
    searchQuery.value = newQuery || "";
    updateTitle(); // 更新页面标题
    if (searchQuery.value.trim()) {
      performSearch();
    } else {
      // 如果搜索查询为空，清空搜索结果并停止加载状态
      searchResults.value = [];
      loading.value = false;
    }
  }
);

onMounted(() => {
  // 初始化搜索查询值和标题
  searchQuery.value = route.query.q || "";
  updateTitle(); // 设置初始标题
  if (searchQuery.value.trim()) {
    performSearch();
  }
});

const search = () => {
  if (searchQuery.value.trim()) {
    router.push({
      path: "/search",
      query: { q: searchQuery.value },
    });
  } else {
    // 如果搜索查询为空，清空搜索结果
    searchResults.value = [];
  }
};

// 防抖搜索函数
const debouncedSearch = debounce(search, 500);

import { searchDevices } from "@/utils/csvDataService.js";

const performSearch = async () => {
  loading.value = true;
  searchResults.value = [];

  try {
    // 使用CSV数据服务进行搜索
    const results = await searchDevices(searchQuery.value);
    searchResults.value = results;
  } catch (error) {
    console.error("搜索失败:", error);
  } finally {
    loading.value = false;
  }
};
</script>
