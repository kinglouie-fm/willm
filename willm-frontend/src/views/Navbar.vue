<script setup>
import { auth } from '../stores/auth'

const logout = async () => {
    await auth.logout()
}
</script>

<template>
    <nav class="navbar navbar-expand">
        <div class="container-fluid d-flex flex-column align-items-stretch my-0 mx-3">
            <div class="row align-items-center justify-content-between">
                <div class="col-4 text-start mt-1">
                    <a-popover title="Information" placement="bottomRight">
                        <template #content>
                            <p>Information</p>
                        </template>
                        <img class="item-popover" src="/images/icons/icon-info-01.svg" />
                    </a-popover>
                </div>
                <div class="col-4 text-center mt-2">
                    <h1 class="title">WILLM</h1>
                </div>
                <div class="col-4 text-end mt-1">
                    <button class="btn" @click="logout">
                        <h4>Logout</h4>
                    </button>
                </div>
            </div>
        </div>
    </nav>
</template>

<style scoped>
.navbar {
    height: 100px;
    background: #eabc7c;
    box-shadow: rgba(0, 0, 0, 0.1) 0px 20px 25px -5px, rgba(0, 0, 0, 0.04) 0px 10px 10px -5px;
}

.title {
    white-space: nowrap;
}

.item-popover {
    cursor: pointer;
    font-size: 14pt;
    height: 35px;
}
</style>