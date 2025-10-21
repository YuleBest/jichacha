<template>
  <v-container class="fill-height">
    <v-row justify="center" align="center">
      <v-col cols="12" sm="8" md="6">
        <v-card class="elevation-12 rounded-lg">
          <v-card-text>
            <v-text-field
              v-model="searchQuery"
              label="查询设备"
              prepend-inner-icon="mdi-magnify"
              variant="outlined"
              hide-details
              class="mb-6"
              @keyup.enter="searchAll"
            ></v-text-field>

            <v-divider class="my-4"></v-divider>

            <div class="text-subtitle-1 mb-2">按品牌查询</div>
            <v-row>
              <v-col
                cols="6"
                sm="4"
                md="3"
                v-for="brand in brands"
                :key="brand.id"
              >
                <v-card
                  :to="'/brand/' + brand.id"
                  class="brand-card pa-4 text-center"
                  hover
                  elevation="2"
                >
                  <div class="text-body-1">{{ brand.name }}</div>
                </v-card>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { getBrands } from "@/utils/csvDataService.js";

const router = useRouter();
const searchQuery = ref("");

// 设置页面标题
document.title = "机查查 - 手机代号查询工具";

// 品牌数据
const brands = ref([]);

// 全局搜索功能
const searchAll = () => {
  if (searchQuery.value.trim()) {
    router.push({
      path: "/search",
      query: { q: searchQuery.value },
    });
  }
};

onMounted(async () => {
  try {
    // 动态加载品牌数据
    const brandData = await getBrands();
    brands.value = brandData;
  } catch (error) {
    console.error("加载品牌数据失败:", error);
  }
});
</script>

<style scoped>
.brand-card {
  transition: transform 0.2s;
}
.brand-card:hover {
  transform: translateY(-5px);
}
</style>
