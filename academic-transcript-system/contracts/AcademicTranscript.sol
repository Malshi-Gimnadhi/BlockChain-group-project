// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;  // ← Changed from ^0.8.19 to ^0.8.20

import "@openzeppelin/contracts/access/AccessControl.sol";

contract AcademicTranscript is AccessControl {
    
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant INSTITUTION_ROLE = keccak256("INSTITUTION_ROLE");
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");
    
    uint256 private _transcriptIdCounter;
    uint256 private _institutionIdCounter;
    
    struct Institution {
        uint256 id;
        string name;
        string registrationNumber;
        address institutionAddress;
        bool isActive;
        uint256 registeredAt;
    }
    
    struct Course {
        string courseCode;
        string courseName;
        uint8 credits;
        string grade;
        uint16 year;
        uint8 semester;
    }
    
    struct Transcript {
        uint256 id;
        uint256 institutionId;
        address studentAddress;
        string studentId;
        string studentName;
        string program;
        Course[] courses;
        uint256 issuedAt;
        bool isRevoked;
        string ipfsHash;
    }
    
    // Mappings
    mapping(uint256 => Institution) public institutions;
    mapping(address => uint256) public institutionAddressToId;
    mapping(uint256 => Transcript) public transcripts;
    mapping(address => uint256[]) public studentTranscripts;
    mapping(string => bool) public usedStudentIds;
    
    // Events
    event InstitutionRegistered(uint256 indexed institutionId, string name, address institutionAddress);
    event InstitutionDeactivated(uint256 indexed institutionId);
    event TranscriptIssued(uint256 indexed transcriptId, uint256 indexed institutionId, address indexed studentAddress, string studentId);
    event TranscriptRevoked(uint256 indexed transcriptId, string reason);
    event TranscriptVerified(uint256 indexed transcriptId, address indexed verifier);
    
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }
    
    // Institution Management
    function registerInstitution(
        string memory _name,
        string memory _registrationNumber,
        address _institutionAddress
    ) public onlyRole(ADMIN_ROLE) returns (uint256) {
        require(_institutionAddress != address(0), "Invalid address");
        require(institutionAddressToId[_institutionAddress] == 0, "Institution already registered");
        
        _institutionIdCounter++;
        uint256 newInstitutionId = _institutionIdCounter;
        
        institutions[newInstitutionId] = Institution({
            id: newInstitutionId,
            name: _name,
            registrationNumber: _registrationNumber,
            institutionAddress:  _institutionAddress,
            isActive: true,
            registeredAt: block.timestamp
        });
        
        institutionAddressToId[_institutionAddress] = newInstitutionId;
        _grantRole(INSTITUTION_ROLE, _institutionAddress);
        
        emit InstitutionRegistered(newInstitutionId, _name, _institutionAddress);
        return newInstitutionId;
    }
    
    function deactivateInstitution(uint256 _institutionId) public onlyRole(ADMIN_ROLE) {
        require(institutions[_institutionId].isActive, "Institution not active");
        institutions[_institutionId]. isActive = false;
        emit InstitutionDeactivated(_institutionId);
    }
    
    // Transcript Management
    function issueTranscript(
        address _studentAddress,
        string memory _studentId,
        string memory _studentName,
        string memory _program,
        Course[] memory _courses,
        string memory _ipfsHash
    ) public onlyRole(INSTITUTION_ROLE) returns (uint256) {
        uint256 institutionId = institutionAddressToId[msg.sender];
        require(institutionId != 0, "Institution not registered");
        require(institutions[institutionId].isActive, "Institution not active");
        require(_studentAddress != address(0), "Invalid student address");
        require(_courses.length > 0, "At least one course required");
        
        string memory uniqueStudentKey = string(abi.encodePacked(
            institutionId,
            "-",
            _studentId
        ));
        require(!usedStudentIds[uniqueStudentKey], "Transcript already exists for this student");
        
        _transcriptIdCounter++;
        uint256 newTranscriptId = _transcriptIdCounter;
        
        Transcript storage newTranscript = transcripts[newTranscriptId];
        newTranscript.id = newTranscriptId;
        newTranscript.institutionId = institutionId;
        newTranscript.studentAddress = _studentAddress;
        newTranscript.studentId = _studentId;
        newTranscript.studentName = _studentName;
        newTranscript.program = _program;
        newTranscript.issuedAt = block.timestamp;
        newTranscript.isRevoked = false;
        newTranscript.ipfsHash = _ipfsHash;
        
        for (uint i = 0; i < _courses.length; i++) {
            newTranscript.courses.push(_courses[i]);
        }
        
        studentTranscripts[_studentAddress]. push(newTranscriptId);
        usedStudentIds[uniqueStudentKey] = true;
        
        emit TranscriptIssued(newTranscriptId, institutionId, _studentAddress, _studentId);
        return newTranscriptId;
    }
    
    function revokeTranscript(uint256 _transcriptId, string memory _reason) 
        public 
        onlyRole(INSTITUTION_ROLE) 
    {
        Transcript storage transcript = transcripts[_transcriptId];
        require(transcript.id != 0, "Transcript does not exist");
        require(transcript.institutionId == institutionAddressToId[msg.sender], "Not authorized");
        require(!transcript.isRevoked, "Already revoked");
        
        transcript.isRevoked = true;
        emit TranscriptRevoked(_transcriptId, _reason);
    }
    
    // View Functions
    function getTranscript(uint256 _transcriptId) 
        public 
        view 
        returns (
            uint256 id,
            uint256 institutionId,
            address studentAddress,
            string memory studentId,
            string memory studentName,
            string memory program,
            uint256 issuedAt,
            bool isRevoked,
            string memory ipfsHash
        ) 
    {
        Transcript storage transcript = transcripts[_transcriptId];
        require(transcript. id != 0, "Transcript does not exist");
        
        return (
            transcript.id,
            transcript.institutionId,
            transcript.studentAddress,
            transcript.studentId,
            transcript.studentName,
            transcript.program,
            transcript. issuedAt,
            transcript.isRevoked,
            transcript.ipfsHash
        );
    }
    
    function getTranscriptCourses(uint256 _transcriptId) 
        public 
        view 
        returns (Course[] memory) 
    {
        require(transcripts[_transcriptId]. id != 0, "Transcript does not exist");
        return transcripts[_transcriptId].courses;
    }
    
    function getStudentTranscripts(address _studentAddress) 
        public 
        view 
        returns (uint256[] memory) 
    {
        return studentTranscripts[_studentAddress];
    }
    
    function verifyTranscript(uint256 _transcriptId) 
        public 
        returns (bool) 
    {
        Transcript storage transcript = transcripts[_transcriptId];
        require(transcript.id != 0, "Transcript does not exist");
        require(! transcript.isRevoked, "Transcript has been revoked");
        require(institutions[transcript.institutionId].isActive, "Issuing institution is not active");
        
        emit TranscriptVerified(_transcriptId, msg.sender);
        return true;
    }
    
    function getInstitution(uint256 _institutionId) 
        public 
        view 
        returns (Institution memory) 
    {
        require(institutions[_institutionId].id != 0, "Institution does not exist");
        return institutions[_institutionId];
    }
    
    function getTotalTranscripts() public view returns (uint256) {
        return _transcriptIdCounter;
    }
    
    function getTotalInstitutions() public view returns (uint256) {
        return _institutionIdCounter;
    }
}