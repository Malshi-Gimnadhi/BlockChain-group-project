import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

describe("AcademicTranscript", function () {
  async function deployContractFixture() {
    const [admin, institution1, institution2, student1, student2, verifier] = 
      await ethers.getSigners();

    const AcademicTranscript = await ethers.getContractFactory("AcademicTranscript");
    const contract = await AcademicTranscript.deploy();
    await contract.waitForDeployment();

    return { contract, admin, institution1, institution2, student1, student2, verifier };
  }

  describe("Deployment", function () {
    it("Should set the right admin", async function () {
      const { contract, admin } = await loadFixture(deployContractFixture);
      const ADMIN_ROLE = await contract. ADMIN_ROLE();
      expect(await contract.hasRole(ADMIN_ROLE, admin.address)).to.be.true;
    });
  });

  describe("Institution Management", function () {
    it("Should register a new institution", async function () {
      const { contract, admin, institution1 } = await loadFixture(deployContractFixture);
      
      await expect(
        contract.registerInstitution(
          "Harvard University",
          "REG-001",
          institution1.address
        )
      ).to.emit(contract, "InstitutionRegistered");

      const institutionData = await contract.getInstitution(1);
      expect(institutionData.name).to.equal("Harvard University");
      expect(institutionData.isActive).to.be.true;
    });

    it("Should not allow duplicate institution addresses", async function () {
      const { contract, admin, institution1 } = await loadFixture(deployContractFixture);
      
      await contract.registerInstitution(
        "Harvard University",
        "REG-001",
        institution1.address
      );

      await expect(
        contract.registerInstitution(
          "MIT",
          "REG-002",
          institution1.address
        )
      ).to.be.revertedWith("Institution already registered");
    });

    it("Should deactivate institution", async function () {
      const { contract, admin, institution1 } = await loadFixture(deployContractFixture);
      
      await contract.registerInstitution(
        "Harvard University",
        "REG-001",
        institution1.address
      );

      await contract.deactivateInstitution(1);
      const institutionData = await contract.getInstitution(1);
      expect(institutionData.isActive).to.be.false;
    });
  });

  describe("Transcript Management", function () {
    it("Should issue a transcript", async function () {
      const { contract, admin, institution1, student1 } = 
        await loadFixture(deployContractFixture);
      
      await contract.registerInstitution(
        "Harvard University",
        "REG-001",
        institution1.address
      );

      const courses = [
        {
          courseCode: "CS101",
          courseName: "Introduction to Computer Science",
          credits: 3,
          grade: "A",
          year: 2024,
          semester: 1
        },
        {
          courseCode:  "MATH201",
          courseName: "Calculus II",
          credits: 4,
          grade: "A-",
          year: 2024,
          semester: 1
        }
      ];

      await expect(
        contract.connect(institution1).issueTranscript(
          student1.address,
          "STU-001",
          "John Doe",
          "Computer Science",
          courses,
          "QmXYZ123..."
        )
      ).to.emit(contract, "TranscriptIssued");

      const transcript = await contract.getTranscript(1);
      expect(transcript.studentName).to.equal("John Doe");
      expect(transcript. program).to.equal("Computer Science");
    });

    it("Should retrieve transcript courses", async function () {
      const { contract, admin, institution1, student1 } = 
        await loadFixture(deployContractFixture);
      
      await contract.registerInstitution(
        "Harvard University",
        "REG-001",
        institution1.address
      );

      const courses = [
        {
          courseCode: "CS101",
          courseName: "Introduction to Computer Science",
          credits: 3,
          grade: "A",
          year: 2024,
          semester: 1
        }
      ];

      await contract. connect(institution1).issueTranscript(
        student1.address,
        "STU-001",
        "John Doe",
        "Computer Science",
        courses,
        "QmXYZ123..."
      );

      const retrievedCourses = await contract. getTranscriptCourses(1);
      expect(retrievedCourses. length).to.equal(1);
      expect(retrievedCourses[0].courseCode).to.equal("CS101");
    });

    it("Should revoke a transcript", async function () {
      const { contract, admin, institution1, student1 } = 
        await loadFixture(deployContractFixture);
      
      await contract.registerInstitution(
        "Harvard University",
        "REG-001",
        institution1.address
      );

      const courses = [{
        courseCode: "CS101",
        courseName: "Introduction to Computer Science",
        credits:  3,
        grade: "A",
        year: 2024,
        semester: 1
      }];

      await contract.connect(institution1).issueTranscript(
        student1.address,
        "STU-001",
        "John Doe",
        "Computer Science",
        courses,
        "QmXYZ123..."
      );

      await expect(
        contract.connect(institution1).revokeTranscript(1, "Invalid data")
      ).to.emit(contract, "TranscriptRevoked");

      const transcript = await contract.getTranscript(1);
      expect(transcript.isRevoked).to.be.true;
    });

    it("Should verify a valid transcript", async function () {
      const { contract, admin, institution1, student1, verifier } = 
        await loadFixture(deployContractFixture);
      
      await contract.registerInstitution(
        "Harvard University",
        "REG-001",
        institution1.address
      );

      const courses = [{
        courseCode:  "CS101",
        courseName: "Introduction to Computer Science",
        credits: 3,
        grade: "A",
        year: 2024,
        semester: 1
      }];

      await contract.connect(institution1).issueTranscript(
        student1.address,
        "STU-001",
        "John Doe",
        "Computer Science",
        courses,
        "QmXYZ123..."
      );

      await expect(
        contract.connect(verifier).verifyTranscript(1)
      ).to.emit(contract, "TranscriptVerified");
    });
  });
});