<template>
  <vue-final-modal class="modal-container">
    <div class="modal-body">
      <div v-if="step === 1">
        <h3>{{ $t('matchingFundsModal.title', { tokenSymbol }) }}</h3>
        <div>
          {{ $t('matchingFundsModal.fund_distribution_message') }}
        </div>
        <div class="contribution-form">
          <input-button
            :modelValue="amount"
            :input="{
              placeholder: '10',
              class: `{ invalid: ${!isAmountValid} }`,
              required: true,
            }"
            @update:modelValue="newValue => (amount = newValue)"
          />
        </div>
        <div v-if="!isBalanceSufficient" class="balance-check-warning">
          {{
            $t('matchingFundsModal.div1', {
              renderBalance: renderBalance,
              tokenSymbol: tokenSymbol,
            })
          }}
        </div>
        <div class="btn-row">
          <button class="btn-secondary" @click="$emit('close')">{{ $t('cancel') }}</button>
          <button class="btn-action" :disabled="!isAmountValid" @click="contributeMatchingFunds()">
            {{ $t('matchingFundsModal.button2') }}
          </button>
        </div>
      </div>
      <div v-if="step === 2">
        <h3>
          {{
            $t('matchingFundsModal.h3_2_t1', {
              renderContributionAmount: renderContributionAmount,
              tokenSymbol: tokenSymbol,
            })
          }}
        </h3>
        <transaction :hash="transferTxHash" :error="transferTxError" @close="$emit('close')"></transaction>
      </div>
      <div v-if="step === 3">
        <div class="big-emoji">💦</div>
        <h3>
          {{
            $t('matchingFundsModal.h3_3', {
              renderContributionAmount: renderContributionAmount,
              tokenSymbol: tokenSymbol,
            })
          }}
        </h3>
        <div class="mb2">{{ $t('matchingFundsModal.div2') }}</div>
        <button class="btn-primary" @click="$emit('close')">{{ $t('matchingFundsModal.button3') }}</button>
      </div>
    </div>
  </vue-final-modal>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { BigNumber, Contract } from 'ethers'
import { parseFixed } from '@ethersproject/bignumber'
import Transaction from '@/components/Transaction.vue'
import InputButton from '@/components/InputButton.vue'

import { waitForTransaction } from '@/utils/contracts'
import { formatAmount } from '@/utils/amounts'
import { getTokenLogo } from '@/utils/tokens'
import { formatUnits } from '@ethersproject/units'

import { ERC20 } from '@/api/abi'
import { factory } from '@/api/core'
import { VueFinalModal } from 'vue-final-modal'
import { useAppStore, useUserStore } from '@/stores'

const appStore = useAppStore()
const userStore = useUserStore()

// state
const step = ref(1)
const amount = ref('100')
const transferTxHash = ref('')
const transferTxError = ref('')

const balance = computed<string | null>(() => {
  const balance = userStore.currentUser?.balance
  if (balance === null || typeof balance === 'undefined') {
    return null
  }
  return formatUnits(balance, 18)
})
const renderBalance = computed<string | null>(() => {
  const balance: BigNumber | null | undefined = userStore.currentUser?.balance
  if (balance === null || typeof balance === 'undefined') return null
  const { nativeTokenDecimals } = appStore.currentRound!
  return formatAmount(balance, nativeTokenDecimals, null, 5)
})
const renderContributionAmount = computed<string | null>(() => {
  const { nativeTokenDecimals } = appStore.currentRound!
  return formatAmount(amount.value, nativeTokenDecimals, null, null)
})
const isBalanceSufficient = computed<boolean>(() => {
  if (balance.value === null) return false

  return parseFloat(balance.value) >= parseFloat(amount.value)
})

const isAmountValid = computed<boolean>(() => {
  const { nativeTokenDecimals } = appStore.currentRound!
  let _amount
  try {
    _amount = parseFixed(amount.value, nativeTokenDecimals)
  } catch {
    return false
  }
  if (_amount.lte(BigNumber.from(0))) {
    return false
  }
  if (balance.value && parseFloat(amount.value) > parseFloat(balance.value)) {
    return false
  }
  return true
})
const tokenSymbol = computed<string>(() => appStore.currentRound?.nativeTokenSymbol || '')
const tokenLogo = computed<string>(() => getTokenLogo(tokenSymbol.value))

async function contributeMatchingFunds() {
  step.value += 1
  const { nativeTokenAddress, nativeTokenDecimals } = appStore.currentRound!
  const token = new Contract(nativeTokenAddress, ERC20, userStore.signer)
  const _amount = parseFixed(amount.value, nativeTokenDecimals)

  // TODO: update to take factory address as a parameter from the route props, default to env. variable
  const matchingPoolAddress = import.meta.env.VITE_MATCHING_POOL_ADDRESS
    ? import.meta.env.VITE_MATCHING_POOL_ADDRESS
    : factory.address

  try {
    await waitForTransaction(token.transfer(matchingPoolAddress, _amount), hash => (transferTxHash.value = hash))
  } catch (error) {
    transferTxError.value = error.message
    if (error.message.indexOf('Nonce too high') >= 0 && import.meta.env.MODE === 'development') {
      transferTxError.value = 'Have you been buidling?? Reset your nonce! 🪄'
    }
    return
  }
  step.value += 1
}
</script>

<style scoped lang="scss">
@import '../styles/vars';
@import '../styles/theme';

.contribution-form {
  align-items: flex-start;
  display: flex;
  flex-direction: row;
  margin-top: $modal-space;
}

.btn-row {
  margin: $modal-space auto 0;
  width: 100%;
  display: flex;
  justify-content: space-between;
}

.close-btn {
  margin-top: $modal-space;
}

.vm--modal {
  background-color: transparent !important;
}

.modal-body {
  background-color: var(--bg-primary-color);
  padding: $modal-space;
  box-shadow: var(--box-shadow);
  text-align: left;

  .loader {
    margin: $modal-space auto;
  }
}

.balance-check {
  font-size: 14px;
  text-transform: uppercase;
  font-weight: 500;
  margin-top: 0.5rem;
}
.balance-check-warning {
  font-size: 14px;
  text-transform: uppercase;
  font-weight: 500;
  margin-top: 0.5rem;
  color: var(--attention-color);
}

.transaction-fee {
  opacity: 0.6;
  font-size: 14px;
  text-transform: uppercase;
  font-weight: 500;
  margin-top: 1rem;
}
</style>
