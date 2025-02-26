<template>
  <div :class="!isCompact && 'warning'" v-if="needsFunds">
    <span v-if="!isCompact">
      {{ $t('fundsNeededWarning.span1_t1') }}
      {{ chain.isLayer2 ? $t('fundsNeededWarning.span1_l2') : chain.label }}
      {{ $t('fundsNeededWarning.span1_t2') }}
    </span>
    <p v-if="!!singleTokenNeeded">
      {{
        $t('fundsNeededWarning.p1', {
          nativeTokenSymbol: nativeTokenSymbol,
        })
      }}
    </p>
    <p @click="onNavigate" class="message">
      <links
        v-if="chain.isLayer2"
        :to="{
          name: 'about-layer-2',
          params: {
            section: 'bridge',
          },
        }"
      >
        {{
          $t('fundsNeededWarning.link1', {
            nativeTokenSymbol: nativeTokenSymbol,
          })
        }}
      </links>
      <links v-else :to="chain.bridge">
        {{
          $t('fundsNeededWarning.link2', {
            singleTokenNeeded: singleTokenNeeded,
            chain: chain.label,
          })
        }}
      </links>
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { BigNumber } from '@ethersproject/bignumber'
import { chain as _chain } from '@/api/core'
import { formatAmount } from '@/utils/amounts'
import Links from '@/components/Links.vue'
import { useAppStore, useUserStore } from '@/stores'
import { storeToRefs } from 'pinia'

const appStore = useAppStore()
const { hasUserContributed } = storeToRefs(appStore)
const userStore = useUserStore()

interface Props {
  onNavigate: () => void
  isCompact?: boolean
}

const props = defineProps<Props>()

const currentUser = computed(() => userStore.currentUser)
const chain = computed(() => _chain)
const nativeTokenSymbol = computed(() => appStore.nativeTokenSymbol)
const nativeTokenDecimals = computed(() => appStore.nativeTokenDecimals)
const tokenBalance = computed(() => {
  if (!currentUser.value?.balance) return null
  return parseFloat(formatAmount(currentUser.value.balance as BigNumber, nativeTokenDecimals.value))
})
const etherBalance = computed(() => {
  if (!currentUser.value?.etherBalance) return null
  return parseFloat(formatAmount(currentUser.value.etherBalance as BigNumber))
})
const needsTokens = computed(() => {
  return !hasUserContributed.value && tokenBalance.value === 0
})
const needsFunds = computed(() => {
  return etherBalance.value === 0 || needsTokens.value
})
const singleTokenNeeded = computed(() => {
  if (!currentUser.value) return ''
  const tokenNeeded = needsTokens.value
  const etherNeeded = etherBalance.value === 0
  if (tokenNeeded === etherNeeded) return ''
  // Only return string if either ETH or ERC-20 is zero balance, not both
  if (tokenNeeded) return nativeTokenSymbol.value
  return 'ETH'
})
</script>

<style lang="scss" scoped>
@import '../styles/vars';
@import '../styles/theme';

.warning {
  width: 100%;
  box-sizing: border-box;
  background: var(--warning-background);
  border-radius: 1rem;
  padding: 1rem;
  margin: 1rem 0 0;
  color: var(--warning-color);
}

.message {
  margin: 1.25rem 0 0;
  color: var(--text-color);
}
</style>
