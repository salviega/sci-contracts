import verify from '../helper-functions'

import { ContractFactory } from 'ethers'
import { ethers } from 'hardhat'

async function main() {
	await deployContracts()
}

async function deployContracts() {
	// Deploy Quadratic Voting Strategy contract
	const qVSimpleStrategyArgs: any[] = [
		'0x9d0757C6cF366De37aB87128DD82e865F64f766C', // _alloAddress
		'Cuadratic voting simple strategy' // _strategyName
	]
	const qVSimpleStrategyContract = await deployContract(
		'QVSimpleStrategy',
		qVSimpleStrategyArgs
	)
	await verify(
		await qVSimpleStrategyContract.getAddress(),
		qVSimpleStrategyArgs
	)

	// Log deployed contracts
	console.log('\n 📜 Deployed contracts')
	console.table({
		qVSimpleStrategyContract: await qVSimpleStrategyContract.getAddress()
	})
}

async function deployContract(contractName: string, args: any[]) {
	const ContractFactory: ContractFactory = await ethers.getContractFactory(
		contractName
	)
	const contract = await ContractFactory.deploy(...args)
	return contract
}

main()
	.then(() => process.exit(0))
	.catch(error => {
		console.error(error)
		process.exit(1)
	})
