# On-chain integration (Solidity)

The Dispute Generator is deployed on Ethereum mainnet. Your contract calls one create function, gets the dispute address, and reads the ruling.

## Create

```solidity
contract MyDisputeOracle {
    address constant DISPUTE_GENERATOR = 0xd61221AD7331d0233c50925BbFeF0ef1C891D647;

    /// Creates a dispute and returns the address.
    function createDispute(
        bytes32 id,
        bytes calldata extraData,
        uint256 rulingOptions,
        string calldata metaEvidence
    ) external payable returns (address dispute) {
        (bool ok, bytes memory data) = DISPUTE_GENERATOR.call{value: msg.value}(
            abi.encodeWithSignature(
                "createDispute((bytes32,bytes,uint256,string))",
                [id, extraData, rulingOptions, metaEvidence]
            )
        );
        require(ok);
        dispute = abi.decode(data, (address));
    }

    /// Reads the ruling on a dispute your contract created.
    function getRuling(address dispute) external view returns (uint256) {
        (bool ok, bytes memory data) = dispute.staticcall(
            abi.encodeWithSignature("isRuled()")
        );
        require(ok);
        if (!abi.decode(data, (bool))) revert("not yet ruled");

        (ok, data) = dispute.staticcall(abi.encodeWithSignature("ruling()"));
        return abi.decode(data, (uint256));
    }
}
```

The Dispute Generator address is the only thing you need. The rest is on the dispute.

