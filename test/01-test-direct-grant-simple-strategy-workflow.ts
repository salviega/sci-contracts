import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'

import { addMinutesToDate, toTimestamp } from '../utils/functions'
import { moveTime } from '../utils/functions/move-time'

import {
	BaseContract,
	BytesLike,
	Contract,
	ContractFactory,
	MaxUint256,
	ZeroAddress
} from 'ethers'
import { ethers, upgrades } from 'hardhat'

interface Accounts {
	admin: SignerWithAddress
	alice: SignerWithAddress
	bob: SignerWithAddress
	kyle: SignerWithAddress
	carol: SignerWithAddress
}

interface Contracts {
	daiMock: any
	registryInstance: any
	alloInstance: any
	qVSimpleStrategyContract: any
}

interface Metadata {
	protocol: bigint
	pointer: string
}

interface Profile {
	id: string
	nonce: bigint
	name: string
	metadata: Metadata
	owner: string
	anchor: string
}

interface Pool {
	profileId: BytesLike
	strategy: string
	token: string
	metadata: Metadata
	managerRole: BytesLike
	adminRole: BytesLike
}

interface InitializeData {
	registryGating: boolean
	metadataRequired: boolean
	reviewThreshold: number
	registrationStartTime: number
	registrationEndTime: number
	allocationStartTime: number
	allocationEndTime: number
}

interface RecipientData {
	recipientId: string
	recipientAddress: string
	metadata: Metadata
}

interface Recipient {
	useRegistryAnchor: boolean
	recipientAddress: string
	grantAmount: bigint
	metadata: Metadata
	recipientStatus: number
	milestonesReviewStatus: number
}

interface Milestone {
	amountPercentage: bigint
	metadata: Metadata
	status: bigint
}

describe('Cuadratic Sciencie Flow', async function () {
	function toDecimal(value: number): bigint {
		return BigInt(value * 10 ** 18)
	}

	function toNumber(value: bigint): number {
		return Number(value / BigInt(10 ** 18))
	}

	let accounts: Accounts
	let contracts: Contracts

	const abiCoder = new ethers.AbiCoder()

	const initializeDataStructTypes: string[] = [
		'uint256',
		'tuple(bool, bool, uint256, uint64, uint64, uint64, uint64)'
	]
	const recipientDataStructTypes = [
		'address',
		'address',
		'tuple(uint256, string)'
	]
	const metadataStructTypes: string[] = ['uint256', 'string']
	const allocateStructTypes: string[] = ['address', 'uint256']

	const nowTime: Date = new Date()

	const reviewThresholdTimestamp: number = toTimestamp(
		addMinutesToDate(nowTime, 0).toISOString()
	)
	const registrationStartTimestamp: number = toTimestamp(
		addMinutesToDate(nowTime, 30).toISOString()
	)
	const registrationEndTimestamp: number = toTimestamp(
		addMinutesToDate(nowTime, 60).toISOString()
	)
	const allocationStartTimestamp: number = toTimestamp(
		addMinutesToDate(nowTime, 90).toISOString()
	)
	const allocationEndTimestamp: number = toTimestamp(
		addMinutesToDate(nowTime, 120).toISOString()
	)

	beforeEach(async function () {
		const signers = await ethers.getSigners()

		accounts = {
			admin: signers[0],
			alice: signers[1],
			bob: signers[2],
			kyle: signers[3],
			carol: signers[4]
		}

		contracts = await deployContracts()
	})

	it('Happy workflow', async () => {
		// Arrange
		const { alice, bob, kyle } = accounts
		const {
			daiMock,
			registryInstance,
			alloInstance,
			qVSimpleStrategyContract
		} = contracts

		const daiMockAddress: string = await daiMock.getAddress()

		const qVSimpleStrategyAddress: string =
			await qVSimpleStrategyContract.getAddress()

		const aliceNonce: number = await ethers.provider.getTransactionCount(
			alice.address
		)
		const aliceName: string = 'alice'
		const aliceMetadata: Metadata = {
			protocol: BigInt(1),
			pointer: 'ipfs://QmQmQmQmQmQmQmQmQmQmQmQmQm'
		}
		const aliceProfileMembers: string[] = []

		const alicePoolMetadata: Metadata = {
			protocol: BigInt(1),
			pointer: 'ipfs://QmQmQmQmQmQmQmQmQmQmQmQmQm'
		}

		const alicePoolManagers: string[] = []

		const alicePoolInitStrategyDataObject: InitializeData = {
			registryGating: false,
			metadataRequired: true,
			reviewThreshold: reviewThresholdTimestamp,
			registrationStartTime: registrationStartTimestamp,
			registrationEndTime: registrationEndTimestamp,
			allocationStartTime: allocationStartTimestamp,
			allocationEndTime: allocationEndTimestamp
		}

		const aliceInitStrategyDataValues: any[] = [
			MaxUint256,
			[
				alicePoolInitStrategyDataObject.registryGating,
				alicePoolInitStrategyDataObject.metadataRequired,
				alicePoolInitStrategyDataObject.reviewThreshold,
				alicePoolInitStrategyDataObject.registrationStartTime,
				alicePoolInitStrategyDataObject.registrationEndTime,
				alicePoolInitStrategyDataObject.allocationStartTime,
				alicePoolInitStrategyDataObject.allocationEndTime
			]
		]

		const aliceInitStrategyData: BytesLike = abiCoder.encode(
			initializeDataStructTypes,
			aliceInitStrategyDataValues
		)

		const bobData: RecipientData = {
			recipientId: bob.address,
			recipientAddress: ZeroAddress,
			metadata: {
				protocol: BigInt(1),
				pointer: 'ipfs://QmQmQmQmQmQmQmQmQmQmQmQmQm'
			}
		}

		const bobDataArray: any[] = [
			bobData.recipientId,
			bobData.recipientAddress,
			[bobData.metadata.protocol, bobData.metadata.pointer]
		]

		let bobDataBytes: BytesLike = abiCoder.encode(
			recipientDataStructTypes,
			bobDataArray
		)

		let currentBlock: any

		const poolFundingAmount: bigint = toDecimal(1000)

		let transactionReceipt: any
		let transactionBlockNumber: any

		let events: any
		let event: any

		let aliceProfileId: BytesLike
		let aliceProfileDto: any
		let aliceProfile: Profile
		let aliceStrategyContract: any

		let strategyAddress: string

		let alicePoolId: bigint
		let alicePoolDto: any
		let alicePool: Pool

		let bobRecipientId: string
		let bobRecipient: Recipient
		let bobRecipientStatus: bigint

		// Act

		// Create profile
		console.log(' 🚩  1. Create profile')
		const createProfileTx = await registryInstance.connect(alice).createProfile(
			aliceNonce, // _nonce
			aliceName, // _name
			[aliceMetadata.protocol, aliceMetadata.pointer], // _metadata
			alice.address, // ownerAddress
			aliceProfileMembers // _membersAddresses
		)

		await createProfileTx.wait()

		transactionReceipt = await ethers.provider.getTransactionReceipt(
			createProfileTx.hash
		)
		transactionBlockNumber = transactionReceipt.blockNumber

		events = await registryInstance.queryFilter(
			'ProfileCreated',
			transactionBlockNumber
		)

		event = events[events.length - 1]

		aliceProfileId = event.args.profileId

		aliceProfileDto = await registryInstance.getProfileById(aliceProfileId)

		aliceProfile = {
			id: aliceProfileDto[0],
			nonce: aliceProfileDto[1],
			name: aliceProfileDto[2],
			metadata: {
				protocol: aliceProfileDto[3][0],
				pointer: aliceProfileDto[3][1]
			},
			owner: aliceProfileDto[4],
			anchor: aliceProfileDto[5]
		}

		bobData.recipientAddress = aliceProfile.anchor
		// bobDataArray[1] = aliceProfile.anchor
		bobDataBytes = abiCoder.encode(recipientDataStructTypes, bobDataArray)

		// Add strategy to cloneable strategies
		// console.log(' 🚩  2. Add strategy to cloneable strategies')
		// const addToCloneableStrategiesTx = await alloInstance
		// 	.connect(admin)
		// 	.addToCloneableStrategies(qVSimpleStrategyAddress)

		// await addToCloneableStrategiesTx.wait()

		// transactionReceipt = await ethers.provider.getTransactionReceipt(
		// 	addToCloneableStrategiesTx.hash
		// )
		// transactionBlockNumber = transactionReceipt.blockNumber

		// events = await alloInstance.queryFilter(
		// 	'StrategyApproved',
		// 	transactionBlockNumber
		// )

		// event = events[events.length - 1]

		// strategyAddress = event.args.strategy

		// Create pool
		console.log(' 🚩  3. Create pool')

		const mintTx = await daiMock.connect(alice).mint(toDecimal(1000))
		await mintTx.wait()

		const approveTx = await daiMock
			.connect(alice)
			.approve(await alloInstance.getAddress(), toDecimal(1000))
		await approveTx.wait()

		const aliceBalanceBefore = await daiMock.balanceOf(alice.address)

		const createPoolTx = await alloInstance
			.connect(alice)
			.createPoolWithCustomStrategy(
				aliceProfileId, // _profileId
				qVSimpleStrategyAddress, // _strategy
				aliceInitStrategyData, // _initStrategyData
				daiMockAddress, // _token
				poolFundingAmount, // _amount
				[alicePoolMetadata.protocol, alicePoolMetadata.pointer], // _metadata
				alicePoolManagers // _managers
			)

		await createPoolTx.wait()

		transactionReceipt = await ethers.provider.getTransactionReceipt(
			createPoolTx.hash
		)
		transactionBlockNumber = transactionReceipt.blockNumber

		events = await alloInstance.queryFilter(
			'PoolCreated',
			transactionBlockNumber
		)

		event = events[events.length - 1]

		alicePoolId = event.args.poolId
		alicePoolDto = await alloInstance.getPool(alicePoolId)
		alicePool = {
			profileId: alicePoolDto[0],
			strategy: alicePoolDto[1],
			token: alicePoolDto[2],
			metadata: {
				protocol: alicePoolDto[3][0],
				pointer: alicePoolDto[3][1]
			},
			managerRole: alicePoolDto[4],
			adminRole: alicePoolDto[5]
		}

		aliceStrategyContract = await ethers.getContractAt(
			'QVSimpleStrategy',
			alicePool.strategy
		)

		const aliceStrategyContractBalanceBefore = await daiMock.balanceOf(
			alicePool.strategy
		)

		currentBlock = await ethers.provider.getBlock('latest')

		if (!currentBlock) {
			throw new Error('No current block found')
		}

		let currentTime = currentBlock.timestamp
		let timeToMoveForward = registrationStartTimestamp - currentTime
		timeToMoveForward += 60
		await moveTime(timeToMoveForward)

		// 4. Add recipient
		console.log(' 🚩  4. Add recipient')
		const addRecipientTx = await alloInstance
			.connect(bob)
			.registerRecipient(alicePoolId, bobDataBytes)

		await addRecipientTx.wait()

		transactionReceipt = await ethers.provider.getTransactionReceipt(
			addRecipientTx.hash
		)
		transactionBlockNumber = transactionReceipt.blockNumber

		events = await aliceStrategyContract.queryFilter(
			'Registered',
			transactionBlockNumber
		)

		event = events[events.length - 1]

		bobRecipientId = event.args.recipientId

		const bobRecipientDto: any[] = await aliceStrategyContract.getRecipient(
			bobRecipientId
		)

		console.table(bobRecipientDto)

		bobRecipient = {
			useRegistryAnchor: bobRecipientDto[0],
			recipientAddress: bobRecipientDto[1],
			grantAmount: bobRecipientDto[2],
			metadata: {
				protocol: bobRecipientDto[3][0],
				pointer: bobRecipientDto[3][1]
			},
			recipientStatus: bobRecipientDto[4],
			milestonesReviewStatus: bobRecipientDto[5]
		}

		// 5. Set recipient status to inReview reviewRecipients()
		// console.log(' 🚩  5. Set recipient status to inReview')

		// const setReviewRecipientsTx = await aliceStrategyContract
		// 	.connect(alice)
		// 	.reviewRecipients([bobRecipientId], [5])

		// await setReviewRecipientsTx.wait()

		// transactionReceipt = await ethers.provider.getTransactionReceipt(
		// 	setReviewRecipientsTx.hash
		// )
		// transactionBlockNumber = transactionReceipt.blockNumber

		// events = await aliceStrategyContract.queryFilter(
		// 	'RecipientStatusUpdated',
		// 	transactionBlockNumber
		// )

		// event = events[events.length - 1]

		// let recipientStatusChangedStatus: bigint = event.args.status

		bobRecipientStatus = await aliceStrategyContract.getRecipientStatus(
			bobRecipientId
		)

		// 6. Fund pool
		console.log(' 🚩  6. Fund pool')

		const mintTx2 = await daiMock.connect(kyle).mint(toDecimal(2000))
		await mintTx2.wait()

		const approveTx2 = await daiMock
			.connect(kyle)
			.approve(await alloInstance.getAddress(), toDecimal(2000))
		await approveTx2.wait()

		const fundPoolTx = await alloInstance
			.connect(kyle)
			.fundPool(alicePoolId, toDecimal(1000))
		await fundPoolTx.wait()

		transactionReceipt = await ethers.provider.getTransactionReceipt(
			fundPoolTx.hash
		)
		transactionBlockNumber = transactionReceipt.blockNumber

		events = await alloInstance.queryFilter(
			'PoolFunded',
			transactionBlockNumber
		)

		event = events[events.length - 1]

		const poolFundedAmount: bigint = event.args.amount

		// 7. Allocate funds
		console.log(' 🚩  7. Allocate funds')

		currentBlock = await ethers.provider.getBlock('latest')

		if (!currentBlock) {
			throw new Error('No current block found')
		}

		currentTime = currentBlock.timestamp
		timeToMoveForward = allocationStartTimestamp - currentTime
		timeToMoveForward += 60
		await moveTime(timeToMoveForward)

		const voiceCredits: number = toNumber(poolFundedAmount)

		const kyleAllocateDataArray: any[] = [bobRecipientId, 1]

		const kyleAllocateDataBytes: BytesLike = abiCoder.encode(
			allocateStructTypes,
			kyleAllocateDataArray
		)

		const allocateFundsTx = await alloInstance
			.connect(kyle)
			.allocate(alicePoolId, kyleAllocateDataBytes)

		await allocateFundsTx.wait()

		transactionReceipt = await ethers.provider.getTransactionReceipt(
			allocateFundsTx.hash
		)
		transactionBlockNumber = transactionReceipt.blockNumber

		events = await aliceStrategyContract.queryFilter(
			'Allocated',
			transactionBlockNumber
		)

		event = events[events.length - 1]

		const allocatedVotes: bigint = event.args.votes

		const allocateFundsTx2 = await alloInstance
			.connect(kyle)
			.allocate(alicePoolId, kyleAllocateDataBytes)

		await allocateFundsTx2.wait()

		transactionReceipt = await ethers.provider.getTransactionReceipt(
			allocateFundsTx.hash
		)
		transactionBlockNumber = transactionReceipt.blockNumber

		events = await aliceStrategyContract.queryFilter(
			'Allocated',
			transactionBlockNumber
		)

		event = events[events.length - 1]

		const allocatedVotes2: bigint = event.args.votes

		// 8. Distribute
		console.log(' 🚩  8. Distribute funds')

		currentBlock = await ethers.provider.getBlock('latest')

		if (!currentBlock) {
			throw new Error('No current block found')
		}

		currentTime = currentBlock.timestamp
		timeToMoveForward = allocationEndTimestamp - currentTime
		timeToMoveForward += 60
		await moveTime(timeToMoveForward)

		const bobBalanceBefore = await daiMock.balanceOf(bob.address)

		const distibuteTx = await alloInstance
			.connect(alice)
			.distribute(alicePoolId, [bobRecipientId], ethers.encodeBytes32String(''))

		await distibuteTx.wait()

		const bobBalanceAfter = await daiMock.balanceOf(bob.address)

		const aliceBalanceAfter = await daiMock.balanceOf(alice.address)

		const aliceStrategyContractBalanceAfter = await daiMock.balanceOf(
			await aliceStrategyContract.getAddress()
		)

		console.table({
			bobBalanceBefore: toNumber(bobBalanceBefore),
			bobBalanceAfter: toNumber(bobBalanceAfter),
			aliceBalanceBefore: toNumber(aliceBalanceBefore),
			aliceBalanceAfter: toNumber(aliceBalanceAfter),
			aliceStrategyContractBalanceBefore: toNumber(
				aliceStrategyContractBalanceBefore
			),
			aliceStrategyContractBalanceAfter: toNumber(
				aliceStrategyContractBalanceAfter
			)
		})

		const _bobRecipientDto: any[] = await aliceStrategyContract.getRecipient(
			bobRecipientId
		)

		console.table(_bobRecipientDto)
	})
})

async function deployContracts() {
	const [owner] = await ethers.getSigners()

	// Deploy DAIMock contract

	const daiMock = await deployContract('DAIMock', [])

	// Deploy Registry contract

	const registryArgs: any = [owner.address]
	const Registry: ContractFactory<any[], BaseContract> =
		await ethers.getContractFactory('Registry')

	const registryInstance: Contract = await upgrades.deployProxy(
		Registry,
		registryArgs
	)
	await registryInstance.waitForDeployment()

	const registryInstanceAddress: string = registryInstance.target as string

	// Deploy Allo contract

	const alloArgs: any = [
		owner.address, // owner
		registryInstanceAddress, // registryAddress
		'0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', // treasury,
		0, // percentFee,
		0 // baseFee,
	]

	const Allo: ContractFactory<any[], BaseContract> =
		await ethers.getContractFactory('Allo')

	const alloInstance: Contract = await upgrades.deployProxy(Allo, alloArgs)
	await alloInstance.waitForDeployment()

	const alloInstanceAddress: string = alloInstance.target as string

	// Deploy Direct Grants Simple Strategy contract

	const qVSimpleStrategyArgs: any[] = [
		alloInstanceAddress, // _alloAddress
		'Cuadratic voting simple strategy' // _strategyName
	]
	const qVSimpleStrategyContract = await deployContract(
		'QVSimpleStrategy',
		qVSimpleStrategyArgs
	)

	// Return all deployed contracts
	return {
		daiMock,
		registryInstance,
		alloInstance,
		qVSimpleStrategyContract
	}
}

async function deployContract(contractName: string, args: any[]) {
	const ContractFactory: ContractFactory = await ethers.getContractFactory(
		contractName
	)
	const contract = await ContractFactory.deploy(...args)
	return contract
}
