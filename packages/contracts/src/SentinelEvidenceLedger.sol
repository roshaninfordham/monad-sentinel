// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract SentinelEvidenceLedger {
    struct Shipment {
        address authority;
        bytes32 routePolicyCommitment;
        bytes32 destinationCommitment;
        uint64 createdAt;
        bool active;
        bool delivered;
    }

    mapping(bytes32 => Shipment) public shipments;
    mapping(bytes32 => mapping(uint64 => bytes32)) public batchRoots;
    mapping(bytes32 => mapping(bytes32 => bool)) public registeredDevices;

    event ShipmentCreated(
        bytes32 indexed shipmentCommitment,
        address indexed authority,
        bytes32 routePolicyCommitment,
        bytes32 destinationCommitment,
        uint256 timestamp
    );

    event SessionCreated(bytes32 indexed sessionId, address indexed authority, string label, uint256 timestamp);

    event DeviceRegistered(
        bytes32 indexed shipmentCommitment,
        bytes32 indexed devicePseudonym,
        bytes32 pubkeyHash,
        uint8 deviceClass,
        uint256 timestamp
    );

    event BatchCommitted(
        bytes32 indexed shipmentCommitment,
        uint64 indexed sequence,
        bytes32 indexed merkleRoot,
        uint32 sampleCount,
        uint16 maxRiskScore,
        uint16 combinedFlags,
        bytes32 dataAvailabilityHash,
        uint256 timeBucket,
        uint256 chainTimestamp
    );

    event IncidentCommitted(
        bytes32 indexed shipmentCommitment,
        bytes32 indexed evidenceHash,
        uint16 riskScore,
        uint16 flags,
        uint64 batchSequence,
        uint256 chainTimestamp
    );

    event IncidentRaised(
        bytes32 indexed shipmentCommitment,
        bytes32 indexed devicePseudonym,
        bytes32 indexed evidenceHash,
        uint16 riskScore,
        uint16 flags,
        uint64 batchSequence,
        uint256 chainTimestamp
    );

    event DeliveryConfirmed(
        bytes32 indexed shipmentCommitment,
        bytes32 indexed deliveryEvidenceHash,
        bytes32 receiverCommitment,
        uint64 batchSequence,
        uint256 chainTimestamp
    );

    modifier onlyAuthority(bytes32 shipmentCommitment) {
        require(shipments[shipmentCommitment].authority == msg.sender, "NOT_AUTHORITY");
        _;
    }

    function createShipment(
        bytes32 shipmentCommitment,
        bytes32 routePolicyCommitment,
        bytes32 destinationCommitment
    ) public {
        require(shipments[shipmentCommitment].authority == address(0), "EXISTS");

        shipments[shipmentCommitment] = Shipment({
            authority: msg.sender,
            routePolicyCommitment: routePolicyCommitment,
            destinationCommitment: destinationCommitment,
            createdAt: uint64(block.timestamp),
            active: true,
            delivered: false
        });

        emit ShipmentCreated(
            shipmentCommitment,
            msg.sender,
            routePolicyCommitment,
            destinationCommitment,
            block.timestamp
        );
    }

    function createSession(bytes32 sessionId, string calldata label) external {
        createShipment(sessionId, bytes32(0), bytes32(0));
        emit SessionCreated(sessionId, msg.sender, label, block.timestamp);
    }

    function setShipmentActive(bytes32 shipmentCommitment, bool active)
        external
        onlyAuthority(shipmentCommitment)
    {
        shipments[shipmentCommitment].active = active;
    }

    function setSessionActive(bytes32 sessionId, bool active)
        external
        onlyAuthority(sessionId)
    {
        shipments[sessionId].active = active;
    }

    function registerDevice(
        bytes32 shipmentCommitment,
        bytes32 devicePseudonym,
        bytes32 pubkeyHash,
        uint8 deviceClass
    ) external onlyAuthority(shipmentCommitment) {
        require(shipments[shipmentCommitment].active, "INACTIVE");
        require(!registeredDevices[shipmentCommitment][devicePseudonym], "DEVICE_EXISTS");
        registeredDevices[shipmentCommitment][devicePseudonym] = true;
        emit DeviceRegistered(shipmentCommitment, devicePseudonym, pubkeyHash, deviceClass, block.timestamp);
    }

    function commitBatch(
        bytes32 shipmentCommitment,
        uint64 sequence,
        bytes32 merkleRoot,
        uint32 sampleCount,
        uint16 maxRiskScore,
        uint16 combinedFlags,
        bytes32 dataAvailabilityHash,
        uint256 timeBucket
    ) public onlyAuthority(shipmentCommitment) {
        require(shipments[shipmentCommitment].active, "INACTIVE");
        require(batchRoots[shipmentCommitment][sequence] == bytes32(0), "BATCH_EXISTS");
        require(merkleRoot != bytes32(0), "EMPTY_ROOT");

        batchRoots[shipmentCommitment][sequence] = merkleRoot;

        emit BatchCommitted(
            shipmentCommitment,
            sequence,
            merkleRoot,
            sampleCount,
            maxRiskScore,
            combinedFlags,
            dataAvailabilityHash,
            timeBucket,
            block.timestamp
        );
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
        uint256
    ) external {
        commitBatch(
            sessionId,
            sequence,
            merkleRoot,
            sampleCount,
            maxRiskScore,
            combinedFlags,
            alertsRoot,
            firstClientTimestamp
        );
    }

    function commitIncident(
        bytes32 shipmentCommitment,
        bytes32 evidenceHash,
        uint16 riskScore,
        uint16 flags,
        uint64 batchSequence
    ) public onlyAuthority(shipmentCommitment) {
        require(shipments[shipmentCommitment].active, "INACTIVE");
        emit IncidentCommitted(
            shipmentCommitment,
            evidenceHash,
            riskScore,
            flags,
            batchSequence,
            block.timestamp
        );
    }

    function raiseIncident(
        bytes32 shipmentCommitment,
        bytes32 devicePseudonym,
        bytes32 evidenceHash,
        uint16 riskScore,
        uint16 flags,
        uint64 batchSequence
    ) external onlyAuthority(shipmentCommitment) {
        require(shipments[shipmentCommitment].active, "INACTIVE");
        emit IncidentRaised(
            shipmentCommitment,
            devicePseudonym,
            evidenceHash,
            riskScore,
            flags,
            batchSequence,
            block.timestamp
        );
        emit IncidentCommitted(shipmentCommitment, evidenceHash, riskScore, flags, batchSequence, block.timestamp);
    }

    function confirmDelivery(
        bytes32 shipmentCommitment,
        bytes32 deliveryEvidenceHash,
        bytes32 receiverCommitment,
        uint64 batchSequence
    ) external onlyAuthority(shipmentCommitment) {
        require(shipments[shipmentCommitment].active, "INACTIVE");
        shipments[shipmentCommitment].delivered = true;
        emit DeliveryConfirmed(
            shipmentCommitment,
            deliveryEvidenceHash,
            receiverCommitment,
            batchSequence,
            block.timestamp
        );
    }

    function batchRoot(bytes32 shipmentCommitment, uint64 sequence)
        external
        view
        returns (bytes32)
    {
        return batchRoots[shipmentCommitment][sequence];
    }
}
