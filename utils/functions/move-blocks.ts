import { network } from 'hardhat'

export async function moveBlocks(amount: number): Promise<void> {
	console.log('Moving blocks...')
	for (let index = 0; index < amount; index++) {
		await network.provider.request({
			method: 'evm_mine',
			params: []
		})
	}
	console.log(`Moved ${amount} blocks`)
}
