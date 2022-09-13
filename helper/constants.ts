interface IDeployParameters {
    [key: string]: any
}

export default Object.freeze({
    mainnet: {
        aave: '0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9',
        stkAave: '0x4da27a545c0c5b758a6ba100e3a049001de870f5',
        // USDC
        bidAsset: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        aaveGovernance: '0xEC568fffba86c094cf06b22134B23074DFE2252c'
    },
    kovan: {
        aave: '0xb597cd8d3217ea6477232f9217fa70837ff667af',
        stkAave: '0xf2fbf9a6710afda1c4aab2e922de9d69e0c97fd2',
        // WETH address
        bidAsset: '0xd0A1E359811322d97991E03f863a0C30C2cF029C',
        aaveGovernance: '0xc2ebab3bac8f2f5028f5c7317027a41ebfca31d2'
    },
    hardhat: {
        bidAsset: undefined,
        aave: undefined,
        stkAave: undefined,
        aaveGovernance: undefined
    }
}) as IDeployParameters

