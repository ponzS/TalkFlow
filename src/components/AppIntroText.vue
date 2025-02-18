<template>
    <div class="AppIntroText">
        <h3>
        Welcome to the Ionic7/Vue SQLite Database CRUD App Example Tutorial
        </h3>
        <h4>using @capacitor-community/sqlite</h4>
    </div>
</template>
  
<script lang="ts">
import { defineComponent } from 'vue';
export default defineComponent({
  name: 'AppIntroText',
});
</script>

<style scoped>
.AppIntroText {
    width: 100%;
    max-height: 200px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    text-align: center;
    margin-top: 5%;
}
</style>