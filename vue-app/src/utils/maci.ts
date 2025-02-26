import type { BigNumber } from 'ethers'
import { genRandomSalt, IncrementalQuinTree, hash5 } from 'maci-crypto'
import { Keypair, PubKey, Command, Message } from 'maci-domainobjs'

const LEAVES_PER_NODE = 5

function bnSqrt(a: BigNumber): BigNumber {
  // Take square root from a big number
  // https://stackoverflow.com/a/52468569/1868395
  if (a.isZero()) {
    return a
  }
  let x
  let x1 = a.div(2)
  do {
    x = x1
    x1 = x.add(a.div(x)).div(2)
  } while (!x.eq(x1))
  return x
}

export function createMessage(
  userStateIndex: number,
  userKeypair: Keypair,
  newUserKeypair: Keypair | null,
  coordinatorPubKey: PubKey,
  voteOptionIndex: number | null,
  voiceCredits: BigNumber | null,
  nonce: number,
  salt?: bigint,
): [Message, PubKey] {
  const encKeypair = new Keypair()
  if (!salt) {
    salt = genRandomSalt() as bigint
  }
  const quadraticVoteWeight = voiceCredits ? bnSqrt(voiceCredits) : 0
  const command = new Command(
    BigInt(userStateIndex),
    newUserKeypair ? newUserKeypair.pubKey : userKeypair.pubKey,
    BigInt(voteOptionIndex || 0),
    BigInt(quadraticVoteWeight.toString()),
    BigInt(nonce),
    BigInt(salt),
  )
  const signature = command.sign(userKeypair.privKey)
  const message = command.encrypt(signature, Keypair.genEcdhSharedKey(encKeypair.privKey, coordinatorPubKey))
  return [message, encKeypair.pubKey]
}

export interface Tally {
  provider: string
  maci: string
  results: {
    commitment: string
    tally: string[]
    salt: string
  }
  totalVoiceCredits: {
    spent: string
    commitment: string
    salt: string
  }
  totalVoiceCreditsPerVoteOption: {
    commitment: string
    tally: string[]
    salt: string
  }
}

export function getRecipientClaimData(recipientIndex: number, recipientTreeDepth: number, tally: Tally): any[] {
  // Create proof for total amount of spent voice credits
  const spent = tally.totalVoiceCreditsPerVoteOption.tally[recipientIndex]
  const spentSalt = tally.totalVoiceCreditsPerVoteOption.salt
  const spentTree = new IncrementalQuinTree(recipientTreeDepth, BigInt(0), LEAVES_PER_NODE, hash5)
  for (const leaf of tally.totalVoiceCreditsPerVoteOption.tally) {
    spentTree.insert(BigInt(leaf))
  }
  const spentProof = spentTree.genMerklePath(recipientIndex)

  return [recipientIndex, spent, spentProof.pathElements.map(x => x.map(y => y.toString())), spentSalt]
}
