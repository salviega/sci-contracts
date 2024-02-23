import contractsJson from '../deployments/bsctestnet/deployments.json'

import dotenv from 'dotenv'
import { ethers } from 'ethers'

dotenv.config()

const { BSC_TESTNET_RPC_URL, WALLET1_PRIVATE_KEY } = process.env

if (!BSC_TESTNET_RPC_URL) {
	throw new Error('BSC_TESTNET_RPC_URL is not set')
}

if (!WALLET1_PRIVATE_KEY) {
	throw new Error('WALLET1_PRIVATE_KEY is not set')
}

const provider = new ethers.JsonRpcProvider(BSC_TESTNET_RPC_URL)
const signer = new ethers.Wallet(WALLET1_PRIVATE_KEY, provider)

const registryContract = new ethers.Contract(
	contractsJson.registryInstance.address,
	contractsJson.registryInstance.abi,
	signer
)

const recipients = [
	'0xd96b642ca70edb30e58248689ceafc6e36785d68',
	'0x7753e5f36f20b14ffb6b6a61319eb66f63abdb0b',
	'0xa653d77d16e944508dc087948bbb59668c383351',
	'0xb7bf6a2f53418eef9a9f5b120b70762344af0e8f',
	'0xddfa90628673895257b385a68602baccc0fc51a8',
	'0xfeeeec412dcfc791ae9f06f7e23d62315c77c332',
	'0xaa7880db88d8e051428b5204817e58d8327340de',
	'0xaaee015eac51c44cc2057093d49ce88f9bb91d11',
	'0xe7e27a5d882da76a0fee75a4519b843ab4819ef4'
]

async function addMembers() {
	try {
		const addMemberTx = await registryContract.addMembers(
			'0xbd71c97162a5a1b0c45de7e244d7aa9b028ac578b6a136f356edd0df7a84bb59',
			recipients
		)
		await addMemberTx.wait()
		console.log('✅ Successfully added members to the registry')
	} catch (error) {
		console.error('Failed to add members to the registry:', error)
	}
}

addMembers()
