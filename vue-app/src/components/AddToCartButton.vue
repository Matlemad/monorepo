<template>
  <div>
    <input-button
      v-if="!inCart && canContribute()"
      :modelValue="amount"
      :input="{
        placeholder: defaultAmount.toString(),
        class: `{ invalid: ${!isAmountValid} }`,
      }"
      :button="{
        text: $t('addToCartButton.input1'),
        disabled: !isAmountValid,
      }"
      @update:model-value="newValue => (amount = newValue)"
      @click="handleSubmit"
    />
    <input-button
      v-if="inCart && canContribute()"
      :button="{
        wide: true,
        text: $t('addToCartButton.input2'),
      }"
      @click="toggleCartPanel()"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { DateTime } from 'luxon'

import { DEFAULT_CONTRIBUTION_AMOUNT, isContributionAmountValid } from '@/api/contributions'

import type { Project } from '@/api/projects'
import { RoundStatus } from '@/api/round'
import type { CartItem } from '@/api/contributions'
import InputButton from '@/components/InputButton.vue'
import { useAppStore, useUserStore } from '@/stores'
import { storeToRefs } from 'pinia'
import { useModal } from 'vue-final-modal'
import WalletModal from './WalletModal.vue'

const amount = ref(DEFAULT_CONTRIBUTION_AMOUNT.toString())

interface Props {
  project: Project
}

const props = defineProps<Props>()

const appStore = useAppStore()
const { currentRound, cart } = storeToRefs(appStore)

const userStore = useUserStore()
const { currentUser } = storeToRefs(userStore)

const inCart = computed(() => {
  const index = cart.value.findIndex((item: CartItem) => {
    // Ignore cleared items
    return item.id === props.project.id && !item.isCleared
  })
  return index !== -1
})
const defaultAmount = computed(() => {
  return DEFAULT_CONTRIBUTION_AMOUNT
})

const isAmountValid = computed(() => {
  return isContributionAmountValid(amount.value, currentRound.value!)
})

function hasContributeBtn(): boolean {
  return !!currentRound.value && props.project.index !== 0
}

function canContribute(): boolean {
  return (
    hasContributeBtn() &&
    !!currentRound.value &&
    DateTime.local() < currentRound.value.votingDeadline &&
    currentRound.value.status !== RoundStatus.Cancelled &&
    props.project.isHidden === false &&
    props.project.isLocked === false
  )
}

function contribute() {
  appStore.addCartItem({
    ...props.project,
    amount: amount.value,
    isCleared: false,
  })
  appStore.saveCart()
  appStore.toggleEditSelection(true)
  appStore.toggleShowCartPanel(true)
}
function handleSubmit(): void {
  if (hasContributeBtn() && currentUser.value) {
    contribute()
    return
  }

  promptConnection()
}

function promptConnection(): void {
  const { open, close } = useModal({
    component: WalletModal,
    attrs: {
      onClose() {
        close()
        if (currentUser.value?.walletAddress) {
          handleWalletModalClose()
        }
      },
    },
  })
  open()
}

function handleWalletModalClose(): void {
  // The modal can be closed by clicking in Cancel or when the user is
  // connected successfully. Hence, this checks if we are in the latter case
  if (currentUser.value) {
    contribute()
  }
}

function toggleCartPanel() {
  appStore.toggleShowCartPanel(true)
}
</script>
