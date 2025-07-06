<template>
  <footer class="footer">
    <p class="icp-info">
      &copy; 2024 ponzs Inc. ICP:<a
        style="text-decoration: none; color: var(--text-color)"
        href="https://beian.miit.gov.cn"
      >
        京ICP备2024046101号</a
      >
    </p>
  </footer>
</template>

<style scoped>
.footer {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  background: var(--footer-bg); /* 动态背景色 */
  color: var(--footer-text); /* 动态文本色 */
  padding: 5px;
  text-align: center;
  font-size: 0.875rem;
  /* border-top: 1px solid var(--footer-border); */
  /* box-shadow: 0 -2px 5px rgba(0, 0, 0, 0.1);  */
  transition:
    background-color 0.3s,
    color 0.3s,
    border-color 0.3s; /* 平滑过渡效果 */
}

/* 备案信息样式 */
.icp-info {
  margin: 0;

  font-family: Arial, sans-serif; /* 使用易读的字体 */
}
</style>
