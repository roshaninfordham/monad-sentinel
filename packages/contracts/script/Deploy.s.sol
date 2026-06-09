// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/SentinelEvidenceLedger.sol";

contract Deploy is Script {
    function run() external returns (SentinelEvidenceLedger ledger) {
        uint256 deployerKey = vm.envUint("GATEWAY_PRIVATE_KEY");
        vm.startBroadcast(deployerKey);
        ledger = new SentinelEvidenceLedger();
        vm.stopBroadcast();
    }
}
