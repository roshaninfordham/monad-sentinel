// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/SentinelEvidenceLedger.sol";

contract SentinelEvidenceLedgerTest is Test {
    SentinelEvidenceLedger ledger;
    bytes32 sessionId = keccak256("demo");

    function setUp() public {
        ledger = new SentinelEvidenceLedger();
    }

    function testSessionCreationWorks() public {
        ledger.createSession(sessionId, "Demo");
        (address authority,,,, bool active,) = ledger.shipments(sessionId);
        assertEq(authority, address(this));
        assertTrue(active);
    }

    function testDuplicateSessionFails() public {
        ledger.createSession(sessionId, "Demo");
        vm.expectRevert("EXISTS");
        ledger.createSession(sessionId, "Again");
    }

    function testShipmentCreationStoresPolicyCommitments() public {
        bytes32 routePolicy = keccak256("route");
        bytes32 destination = keccak256("destination");
        ledger.createShipment(sessionId, routePolicy, destination);
        (address authority, bytes32 storedRoute, bytes32 storedDestination,, bool active, bool delivered) = ledger.shipments(sessionId);
        assertEq(authority, address(this));
        assertEq(storedRoute, routePolicy);
        assertEq(storedDestination, destination);
        assertTrue(active);
        assertFalse(delivered);
    }

    function testNonAuthorityCannotRegisterDevice() public {
        ledger.createSession(sessionId, "Demo");
        vm.prank(address(0xBEEF));
        vm.expectRevert("NOT_AUTHORITY");
        ledger.registerDevice(sessionId, keccak256("device"), keccak256("pub"), 1);
    }

    function testNonAuthorityCannotCommitBatch() public {
        ledger.createSession(sessionId, "Demo");
        vm.prank(address(0xBEEF));
        vm.expectRevert("NOT_AUTHORITY");
        ledger.commitBatch(sessionId, 1, keccak256("root"), 10, 1, 0, bytes32(0), 1, 2);
    }

    function testDuplicateBatchSequenceFails() public {
        ledger.createSession(sessionId, "Demo");
        ledger.commitBatch(sessionId, 1, keccak256("root"), 10, 1, 0, bytes32(0), 1, 2);
        vm.expectRevert("BATCH_EXISTS");
        ledger.commitBatch(sessionId, 1, keccak256("root2"), 10, 1, 0, bytes32(0), 1, 2);
    }

    function testInactiveSessionRejectsCommits() public {
        ledger.createSession(sessionId, "Demo");
        ledger.setSessionActive(sessionId, false);
        vm.expectRevert("INACTIVE");
        ledger.commitBatch(sessionId, 1, keccak256("root"), 10, 1, 0, bytes32(0), 1, 2);
    }

    function testBatchRootViewReturnsRoot() public {
        bytes32 root = keccak256("root");
        ledger.createSession(sessionId, "Demo");
        ledger.commitBatch(sessionId, 1, root, 10, 1, 0, bytes32(0), 1, 2);
        assertEq(ledger.batchRoot(sessionId, 1), root);
    }

    function testDeliveryConfirmationMarksDelivered() public {
        ledger.createSession(sessionId, "Demo");
        ledger.confirmDelivery(sessionId, keccak256("delivery"), keccak256("receiver"), 1);
        (,,,,, bool delivered) = ledger.shipments(sessionId);
        assertTrue(delivered);
    }
}
