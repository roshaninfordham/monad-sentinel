// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ISentinelEvidenceLedger {
    event SessionCreated(bytes32 indexed sessionId, address indexed authority, string label, uint256 timestamp);

    event DeviceRegistered(bytes32 indexed sessionId, bytes32 indexed deviceId, bytes32 pubkeyHash, uint8 deviceClass, uint256 timestamp);

    event BatchCommitted(
        bytes32 indexed sessionId,
        uint64 indexed sequence,
        bytes32 indexed merkleRoot,
        uint32 sampleCount,
        uint16 maxRiskScore,
        uint16 combinedFlags,
        bytes32 alertsRoot,
        uint256 firstClientTimestamp,
        uint256 lastClientTimestamp,
        uint256 chainTimestamp
    );

    event IncidentRaised(
        bytes32 indexed sessionId,
        bytes32 indexed deviceId,
        bytes32 indexed evidenceHash,
        uint16 riskScore,
        uint16 flags,
        uint64 batchSequence,
        uint256 chainTimestamp
    );

    function createSession(bytes32 sessionId, string calldata label) external;

    function registerDevice(bytes32 sessionId, bytes32 deviceId, bytes32 pubkeyHash, uint8 deviceClass) external;

    function commitBatch(
        bytes32 sessionId,
        uint64 sequence,
        bytes32 merkleRoot,
        uint32 sampleCount,
        uint16 maxRiskScore,
        uint16 combinedFlags,
        bytes32 alertsRoot,
        uint256 firstClientTimestamp,
        uint256 lastClientTimestamp
    ) external;

    function raiseIncident(bytes32 sessionId, bytes32 deviceId, bytes32 evidenceHash, uint16 riskScore, uint16 flags, uint64 batchSequence) external;

    function batchRoot(bytes32 sessionId, uint64 sequence) external view returns (bytes32);
}

contract SentinelEvidenceLedger is ISentinelEvidenceLedger {
    struct Session {
        address authority;
        uint64 createdAt;
        bool active;
    }

    mapping(bytes32 => Session) public sessions;
    mapping(bytes32 => mapping(uint64 => bytes32)) public batchRoots;
    mapping(bytes32 => mapping(bytes32 => bool)) public registeredDevices;

    modifier onlySessionAuthority(bytes32 sessionId) {
        require(sessions[sessionId].authority == msg.sender, "NOT_AUTHORITY");
        _;
    }

    function createSession(bytes32 sessionId, string calldata label) external {
        require(sessions[sessionId].authority == address(0), "SESSION_EXISTS");
        sessions[sessionId] = Session({authority: msg.sender, createdAt: uint64(block.timestamp), active: true});
        emit SessionCreated(sessionId, msg.sender, label, block.timestamp);
    }

    function setSessionActive(bytes32 sessionId, bool active) external onlySessionAuthority(sessionId) {
        sessions[sessionId].active = active;
    }

    function registerDevice(bytes32 sessionId, bytes32 deviceId, bytes32 pubkeyHash, uint8 deviceClass) external onlySessionAuthority(sessionId) {
        require(sessions[sessionId].active, "SESSION_INACTIVE");
        require(!registeredDevices[sessionId][deviceId], "DEVICE_EXISTS");
        registeredDevices[sessionId][deviceId] = true;
        emit DeviceRegistered(sessionId, deviceId, pubkeyHash, deviceClass, block.timestamp);
    }

    function commitBatch(
        bytes32 sessionId,
        uint64 sequence,
        bytes32 merkleRoot,
        uint32 sampleCount,
        uint16 maxRiskScore,
        uint16 combinedFlags,
        bytes32 alertsRoot,
        uint256 firstClientTimestamp,
        uint256 lastClientTimestamp
    ) external onlySessionAuthority(sessionId) {
        require(sessions[sessionId].active, "SESSION_INACTIVE");
        require(merkleRoot != bytes32(0), "EMPTY_ROOT");
        require(batchRoots[sessionId][sequence] == bytes32(0), "BATCH_EXISTS");
        batchRoots[sessionId][sequence] = merkleRoot;

        emit BatchCommitted(
            sessionId,
            sequence,
            merkleRoot,
            sampleCount,
            maxRiskScore,
            combinedFlags,
            alertsRoot,
            firstClientTimestamp,
            lastClientTimestamp,
            block.timestamp
        );
    }

    function raiseIncident(
        bytes32 sessionId,
        bytes32 deviceId,
        bytes32 evidenceHash,
        uint16 riskScore,
        uint16 flags,
        uint64 batchSequence
    ) external onlySessionAuthority(sessionId) {
        require(sessions[sessionId].active, "SESSION_INACTIVE");
        emit IncidentRaised(sessionId, deviceId, evidenceHash, riskScore, flags, batchSequence, block.timestamp);
    }

    function batchRoot(bytes32 sessionId, uint64 sequence) external view returns (bytes32) {
        return batchRoots[sessionId][sequence];
    }
}
